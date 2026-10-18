-- ===================== 상품 검색: 한글 조합·분리 입력 (#795) =====================

-- 상품 검색은 붙여 쓴 한글과 자모를 나눠 쓴 한글을 같은 입력으로 본다(크림 = 크리ㅁ = ㅋㅡㄹㅣㅁ, 과 = 고ㅏ, 닭 = 달ㄱ).
-- 입력은 두벌식 자판이 조합하는 방식대로 묶고, 이름과 검색어를 역할을 구분한 기본 자모열로 바꿔 비교한다.
-- 성분 검색, 공유 텍스트 매칭(search_product_names), 오타 교정용 search_jamo 와 인기 검색어 표현은 바꾸지 않는다.
-- 이전 서버가 부르는 search_products(값 1~4개)의 반환 열·JSON 모양과 product_search_hit, product_search_document 의 기존 열은 유지한다.
-- 검색 뷰 갱신 순서(product_search_document → ingredient_search_term → search_vocabulary)는 그대로다.

-- 상품 검색 전용 정규화. search_norm 과 같은 글자만 남기되, 남은 한글을 두벌식 자판처럼 조합하고 자모열로 푼다.
-- 조합: 앞 음절에 모음·받침으로 붙을 수 있으면 붙이고, 받침 뒤에 모음이 오면 마지막 받침을 다음 음절의 초성으로 옮긴다.
--       ㅗ+ㅏ 같은 복합모음과 ㄹ+ㄱ 같은 겹받침도 만든다. 모음 없이 남은 자모(ㅋ림의 ㅋ)는 호환 자모 그대로 둔다.
-- 자모열: 음절마다 초성(U+1100~), 중성(U+1161~), 종성(U+11A8~)을 조합형 자모로 쓰고 끝에 음절 끝 표시(U+3164)를 붙인다.
--         복합모음(ㅘ → ㅗㅏ)과 겹받침(ㄺ → ㄹㄱ)은 기본 자모 둘로 나눈다. 쌍자음과 ㅐ·ㅔ·ㅒ·ㅖ 는 나누지 않는다.
--         초성과 받침이 다른 글자이고 음절마다 끝 표시가 있으므로, 자모열의 부분 문자열 일치는 음절 경계를 넘지 않는다(닭 ≠ 달고, 크리 ≠ 크림, 고 ≠ 과).
-- p_read 가 true 면 한글 음절이 있는 이름의 네 글자 이하 영문 구간을 낱자 읽기로 펼친다(search_reading_name 과 같은 규칙).
-- 결과: norm 은 조합한 정규 문자열, jamo 는 자모열, pos 는 jamo 의 글자마다 원문의 UTF-16 시작 위치다.
-- REFRESH MATERIALIZED VIEW 는 search_path 를 pg_catalog, pg_temp 로 고정하고 실행하므로, 검색 문서가 부르는 이 함수의 본문은
-- 사용자 정의 타입·함수를 이름으로 찾지 않는다. 결과도 복합 타입 대신 OUT 인자로 돌려준다.
-- 정의를 바꾸면 검색 문서 뷰를 REFRESH 한다.
CREATE FUNCTION product_search_analyze(p_text text, p_read boolean, OUT norm text, OUT jamo text, OUT pos int[])
    LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
AS $$
DECLARE
    c_initials   CONSTANT text  := 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
    c_finals     CONSTANT text  := 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
    -- 복합모음: 앞 기본 모음 * 100 + 뒤 기본 모음 → 중성 인덱스
    c_vowel_pair CONSTANT int[] := '{800,801,820,1304,1305,1320,1820}';
    c_vowel_of   CONSTANT int[] := '{9,10,11,14,15,16,19}';
    -- 겹받침: 앞 받침 * 100 + 뒤 받침 → 종성 인덱스
    c_final_pair CONSTANT int[] := '{119,422,427,801,816,817,819,825,826,827,1719}';
    c_final_of   CONSTANT int[] := '{3,5,6,9,10,11,12,13,14,15,18}';
    -- 받침이 다음 음절로 옮겨갈 때의 종성 인덱스 → 초성 인덱스
    c_move_final CONSTANT int[] := '{1,2,4,7,8,16,17,19,20,21,22,23,24,25,26,27}';
    c_move_into  CONSTANT int[] := '{0,1,2,3,5,6,7,9,10,11,12,14,15,16,17,18}';
    c_readings   CONSTANT text[] := ARRAY['에이','비','씨','디','이','에프','지','에이치','아이','제이','케이','엘','엠',
                                          '엔','오','피','큐','알','에스','티','유','브이','더블유','엑스','와이','제트'];
    c_end        CONSTANT text  := U&'\3164';
    v_source  text;
    v_code    int;
    v_char    text;
    v_offset  int := 0;
    v_chars   text[] := '{}';
    v_offsets int[] := '{}';
    v_hangul  boolean := false;
    v_read_chars   text[];
    v_read_offsets int[];
    v_run     int;
    v_n       int;
    v_i       int;
    v_k       int;
    -- 조합 중인 음절. 초성 인덱스와 중성·종성의 기본 자모 인덱스, 각 자모가 온 원문 위치.
    v_l   int;
    v_lp  int;
    v_v   int[] := '{}';
    v_vp  int[] := '{}';
    v_t   int[] := '{}';
    v_tp  int[] := '{}';
    v_parts    int[];
    v_absorbed boolean;
    v_next_l   int;
    v_next_lp  int;
    v_moved    int;
    v_medial   int;
    v_final    int;
    v_text  text := '';
    v_jamo  text := '';
    v_pos   int[] := '{}';
BEGIN
    -- 1. search_norm 과 같은 글자만 남기고 원문 UTF-16 위치를 함께 둔다. 조합형 자모는 호환 자모로 바꿔 아래에서 다시 조합한다.
    FOREACH v_source IN ARRAY coalesce(string_to_array(p_text, NULL), '{}') LOOP
        v_code := ascii(v_source);
        v_char := CASE
            WHEN v_code BETWEEN 65 AND 90 THEN chr(v_code + 32)
            WHEN v_code BETWEEN 65313 AND 65338 THEN chr(v_code - 65216)
            WHEN v_code BETWEEN 65345 AND 65370 THEN chr(v_code - 65248)
            WHEN v_code BETWEEN 65296 AND 65305 THEN chr(v_code - 65248)
            WHEN v_code BETWEEN 4352 AND 4370 THEN substr(c_initials, v_code - 4351, 1)
            WHEN v_code BETWEEN 4449 AND 4469 THEN chr(v_code + 8174)
            WHEN v_code BETWEEN 4520 AND 4546 THEN substr(c_finals, v_code - 4519, 1)
            ELSE v_source END;
        IF ascii(v_char) BETWEEN 48 AND 57 OR ascii(v_char) BETWEEN 97 AND 122
           OR ascii(v_char) BETWEEN 44032 AND 55203 OR ascii(v_char) BETWEEN 12593 AND 12643 THEN
            v_chars := v_chars || v_char;
            v_offsets := v_offsets || v_offset;
            v_hangul := v_hangul OR ascii(v_char) BETWEEN 44032 AND 55203;
        END IF;
        v_offset := v_offset + CASE WHEN v_code > 65535 THEN 2 ELSE 1 END;
    END LOOP;
    v_n := cardinality(v_chars);

    -- 2. 읽기 형태는 네 글자 이하 영문 구간을 낱자 읽기로 펼친다. 펼친 글자는 그 영문 글자의 위치를 가리킨다.
    IF p_read AND v_hangul THEN
        v_read_chars := '{}';
        v_read_offsets := '{}';
        v_i := 1;
        WHILE v_i <= v_n LOOP
            IF ascii(v_chars[v_i]) BETWEEN 97 AND 122 THEN
                v_run := 0;
                WHILE v_i + v_run <= v_n AND ascii(v_chars[v_i + v_run]) BETWEEN 97 AND 122 LOOP
                    v_run := v_run + 1;
                END LOOP;
                FOR v_k IN v_i .. v_i + v_run - 1 LOOP
                    IF v_run <= 4 THEN
                        FOREACH v_char IN ARRAY string_to_array(c_readings[ascii(v_chars[v_k]) - 96], NULL) LOOP
                            v_read_chars := v_read_chars || v_char;
                            v_read_offsets := v_read_offsets || v_offsets[v_k];
                        END LOOP;
                    ELSE
                        v_read_chars := v_read_chars || v_chars[v_k];
                        v_read_offsets := v_read_offsets || v_offsets[v_k];
                    END IF;
                END LOOP;
                v_i := v_i + v_run;
            ELSE
                v_read_chars := v_read_chars || v_chars[v_i];
                v_read_offsets := v_read_offsets || v_offsets[v_i];
                v_i := v_i + 1;
            END IF;
        END LOOP;
        v_chars := v_read_chars;
        v_offsets := v_read_offsets;
        v_n := cardinality(v_chars);
    END IF;

    -- 3. 두벌식 자판처럼 조합한다. 마지막 바퀴(v_i = v_n + 1)는 남은 음절을 내보내기만 한다.
    FOR v_i IN 1 .. v_n + 1 LOOP
        v_char := CASE WHEN v_i <= v_n THEN v_chars[v_i] END;
        v_code := CASE WHEN v_i <= v_n THEN ascii(v_char) ELSE -1 END;
        v_absorbed := false;
        v_next_l := NULL;

        IF v_code BETWEEN 12623 AND 12643 THEN
            -- 모음
            v_medial := v_code - 12623;
            v_k := array_position(c_vowel_of, v_medial);
            v_parts := CASE WHEN v_k IS NULL THEN ARRAY[v_medial]
                            ELSE ARRAY[c_vowel_pair[v_k] / 100, c_vowel_pair[v_k] % 100] END;
            IF v_l IS NOT NULL AND cardinality(v_v) = 0 THEN
                v_v := v_parts;
                v_vp := array_fill(v_offsets[v_i], ARRAY[cardinality(v_parts)]);
                v_absorbed := true;
            ELSIF v_l IS NOT NULL AND cardinality(v_t) = 0 AND cardinality(v_v) = 1 AND cardinality(v_parts) = 1
                  AND array_position(c_vowel_pair, v_v[1] * 100 + v_parts[1]) IS NOT NULL THEN
                v_v := v_v || v_parts[1];
                v_vp := v_vp || v_offsets[v_i];
                v_absorbed := true;
            ELSIF cardinality(v_t) > 0 THEN
                -- 마지막 받침을 다음 음절의 초성으로 옮긴다(닭 + ㅣ → 달기).
                v_moved := v_t[cardinality(v_t)];
                v_next_lp := v_tp[cardinality(v_tp)];
                v_next_l := c_move_into[array_position(c_move_final, v_moved)];
                v_t := v_t[1 : cardinality(v_t) - 1];
                v_tp := v_tp[1 : cardinality(v_tp) - 1];
            END IF;
        ELSIF v_code BETWEEN 12593 AND 12622 AND v_l IS NOT NULL AND cardinality(v_v) > 0 AND strpos(c_finals, v_char) > 0 THEN
            -- 받침이 될 수 있는 자음
            v_final := strpos(c_finals, v_char);
            v_k := array_position(c_final_of, v_final);
            v_parts := CASE WHEN v_k IS NULL THEN ARRAY[v_final]
                            ELSE ARRAY[c_final_pair[v_k] / 100, c_final_pair[v_k] % 100] END;
            IF cardinality(v_t) = 0 THEN
                v_t := v_parts;
                v_tp := array_fill(v_offsets[v_i], ARRAY[cardinality(v_parts)]);
                v_absorbed := true;
            ELSIF cardinality(v_t) = 1 AND cardinality(v_parts) = 1
                  AND array_position(c_final_pair, v_t[1] * 100 + v_parts[1]) IS NOT NULL THEN
                v_t := v_t || v_parts[1];
                v_tp := v_tp || v_offsets[v_i];
                v_absorbed := true;
            END IF;
        END IF;

        IF NOT v_absorbed THEN
            -- 조합 중인 음절을 내보낸다.
            IF v_l IS NOT NULL THEN
                IF cardinality(v_v) > 0 THEN
                    v_medial := CASE WHEN cardinality(v_v) = 1 THEN v_v[1]
                                     ELSE c_vowel_of[array_position(c_vowel_pair, v_v[1] * 100 + v_v[2])] END;
                    v_final := CASE cardinality(v_t) WHEN 0 THEN 0 WHEN 1 THEN v_t[1]
                                    ELSE c_final_of[array_position(c_final_pair, v_t[1] * 100 + v_t[2])] END;
                    v_text := v_text || chr(44032 + (v_l * 21 + v_medial) * 28 + v_final);
                    v_jamo := v_jamo || chr(4352 + v_l);
                    FOREACH v_k IN ARRAY v_v LOOP
                        v_jamo := v_jamo || chr(4449 + v_k);
                    END LOOP;
                    FOREACH v_k IN ARRAY v_t LOOP
                        v_jamo := v_jamo || chr(4519 + v_k);
                    END LOOP;
                    v_jamo := v_jamo || c_end;
                    -- 음절 끝 표시는 이 음절의 마지막 자모가 온 글자를 가리킨다.
                    v_pos := v_pos || v_lp || v_vp || v_tp || greatest(v_lp, v_vp[cardinality(v_vp)], v_tp[cardinality(v_tp)]);
                ELSE
                    v_text := v_text || substr(c_initials, v_l + 1, 1);
                    v_jamo := v_jamo || substr(c_initials, v_l + 1, 1);
                    v_pos := v_pos || v_lp;
                END IF;
                v_l := NULL;
                v_v := '{}';
                v_vp := '{}';
                v_t := '{}';
                v_tp := '{}';
            END IF;

            -- 이 글자로 새 음절을 시작하거나 그대로 내보낸다.
            IF v_next_l IS NOT NULL THEN
                v_l := v_next_l;
                v_lp := v_next_lp;
                v_v := v_parts;
                v_vp := array_fill(v_offsets[v_i], ARRAY[cardinality(v_parts)]);
            ELSIF v_code BETWEEN 44032 AND 55203 THEN
                v_l := (v_code - 44032) / 588;
                v_lp := v_offsets[v_i];
                v_medial := (v_code - 44032) % 588 / 28;
                v_k := array_position(c_vowel_of, v_medial);
                v_v := CASE WHEN v_k IS NULL THEN ARRAY[v_medial]
                            ELSE ARRAY[c_vowel_pair[v_k] / 100, c_vowel_pair[v_k] % 100] END;
                v_vp := array_fill(v_lp, ARRAY[cardinality(v_v)]);
                v_final := (v_code - 44032) % 28;
                v_k := array_position(c_final_of, v_final);
                v_t := CASE WHEN v_final = 0 THEN '{}'::int[] WHEN v_k IS NULL THEN ARRAY[v_final]
                            ELSE ARRAY[c_final_pair[v_k] / 100, c_final_pair[v_k] % 100] END;
                v_tp := array_fill(v_lp, ARRAY[cardinality(v_t)]);
            ELSIF v_code BETWEEN 12593 AND 12622 AND strpos(c_initials, v_char) > 0 THEN
                v_l := strpos(c_initials, v_char) - 1;
                v_lp := v_offsets[v_i];
            ELSIF v_code >= 0 THEN
                v_text := v_text || v_char;
                v_jamo := v_jamo || v_char;
                v_pos := v_pos || v_offsets[v_i];
            END IF;
        END IF;
    END LOOP;

    norm := v_text;
    jamo := v_jamo;
    pos := v_pos;
END
$$;

-- 검색어를 조합한 정규 문자열(ㅋㅡㄹㅣㅁ → 크림). 공백과 기호는 search_norm 처럼 지운다.
CREATE FUNCTION product_search_compose(t text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    RETURN (product_search_analyze(t, false)).norm;

-- 검색어의 자모열(크림 → 초성 ㅋ, 중성 ㅡ, 끝 표시, 초성 ㄹ, 중성 ㅣ, 종성 ㅁ, 끝 표시).
CREATE FUNCTION product_search_jamo(t text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    RETURN (product_search_analyze(t, false)).jamo;

-- 자모열에서 처음 맞은 needle 의 원문 구간 [시작, 끝) 을 UTF-16 위치로 돌려준다. 맞지 않으면 NULL.
-- 남는 글자는 모두 BMP 문자이므로 끝 위치는 마지막 자모가 온 글자의 다음 칸이다.
CREATE FUNCTION product_search_range(p_jamo text, p_pos int[], p_needle text) RETURNS int[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN CASE WHEN p_needle <> '' AND strpos(p_jamo, p_needle) > 0
                THEN ARRAY[p_pos[strpos(p_jamo, p_needle)], p_pos[strpos(p_jamo, p_needle) + length(p_needle) - 1] + 1] END;

-- 검색 문서를 자모 열과 함께 다시 만든다. 기존 열은 순서와 정의를 그대로 둔다(search_product_names, search_correct_query 가 쓴다).
-- 이름 필드마다 자모열(*_jamo)과 원문 위치(*_jamo_pos)를 두고, 읽기 형태는 *_read_jamo 로 둔다.
-- *_read_jamo 는 낱자 읽기로 펼칠 영문이 없어 원형과 같으면 NULL 이다(같은 비교를 두 번 하지 않는다).
-- doc_jamo·doc_read_jamo 는 후보 수집용이다. doc_read_jamo 는 원형과 같아도 채운다.
-- 필드 사이에 '|' 를 넣어 서로 다른 이름의 경계에서만 맞는 후보가 생기지 않게 한다.
DROP MATERIALIZED VIEW product_search_document;

CREATE MATERIALIZED VIEW product_search_document AS
SELECT p.id                                AS product_id,
       p.brand_id                          AS brand_id,
       p.product_name                      AS product_name,
       b.korean_name                       AS brand_korean_name,
       b.english_name                      AS brand_english_name,
       search_norm(p.product_name)         AS product_norm,
       search_reading_name(p.product_name) AS product_read,
       search_chosung(search_reading_name(p.product_name)) AS product_chosung,
       search_norm(b.korean_name)          AS brand_norm,
       search_reading_name(b.korean_name)  AS brand_read,
       search_chosung(search_reading_name(b.korean_name))  AS brand_chosung,
       search_norm(b.english_name)         AS brand_english_norm,
       search_norm(b.korean_name || coalesce(b.english_name, '') || p.product_name) AS doc_norm,
       search_reading_name(b.korean_name) || coalesce(search_reading_name(b.english_name), '')
           || search_reading_name(p.product_name) AS doc_read,
       search_chosung(search_reading_name(b.korean_name) || search_reading_name(p.product_name)) AS doc_chosung,
       pn.jamo AS product_jamo,
       pn.pos  AS product_jamo_pos,
       nullif(pr.jamo, pn.jamo) AS product_read_jamo,
       CASE WHEN pr.jamo <> pn.jamo THEN pr.pos END AS product_read_jamo_pos,
       b.brand_jamo,
       b.brand_jamo_pos,
       nullif(b.brand_read, b.brand_jamo) AS brand_read_jamo,
       CASE WHEN b.brand_read <> b.brand_jamo THEN b.brand_read_pos END AS brand_read_jamo_pos,
       b.brand_english_jamo,
       b.brand_english_jamo_pos,
       b.brand_jamo || '|' || coalesce(b.brand_english_jamo, '') || '|' || pn.jamo AS doc_jamo,
       b.brand_read || '|' || coalesce(b.brand_english_jamo, '') || '|' || pr.jamo AS doc_read_jamo
FROM product p
JOIN (
    SELECT b.id, b.korean_name, b.english_name,
           bn.jamo AS brand_jamo, bn.pos AS brand_jamo_pos,
           br.jamo AS brand_read, br.pos AS brand_read_pos,
           be.jamo AS brand_english_jamo, be.pos AS brand_english_jamo_pos
    FROM brand b
    CROSS JOIN LATERAL product_search_analyze(b.korean_name, false) bn
    CROSS JOIN LATERAL product_search_analyze(b.korean_name, true) br
    LEFT JOIN LATERAL product_search_analyze(b.english_name, false) be ON true
) b ON b.id = p.brand_id
CROSS JOIN LATERAL product_search_analyze(p.product_name, false) pn
CROSS JOIN LATERAL product_search_analyze(p.product_name, true) pr;

CREATE INDEX ix_product_search_document_norm ON product_search_document USING gin (doc_norm gin_trgm_ops);
CREATE INDEX ix_product_search_document_read ON product_search_document USING gin (doc_read gin_trgm_ops);
CREATE INDEX ix_product_search_document_chosung ON product_search_document USING gin (doc_chosung gin_trgm_ops);
CREATE INDEX ix_product_search_document_jamo ON product_search_document USING gin (doc_jamo gin_trgm_ops);
CREATE INDEX ix_product_search_document_read_jamo ON product_search_document USING gin (doc_read_jamo gin_trgm_ops);
CREATE UNIQUE INDEX ux_product_search_document_product ON product_search_document (product_id);
CREATE INDEX ix_product_search_document_brand ON product_search_document (brand_id);

-- 상품 검색어 토큰. search_query_tokens 와 같은 순서·중복 규칙이며 조합한 정규 문자열로 중복을 판단한다.
CREATE FUNCTION product_search_query_tokens(p_query text)
    RETURNS TABLE (ord int, raw text, norm text, read text, jamo text, read_jamo text, is_chosung boolean, chosung_contains text)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT u.ord::int, u.tok, u.n, search_read_query(u.n), u.j,
           CASE WHEN u.n ~ '[a-z]' THEN product_search_jamo(search_read_query(u.n)) ELSE u.j END,
           u.n ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$',
           '%' || search_chosung_query(u.n) || '%'
    FROM (
        SELECT DISTINCT ON (t.n) t.ord, t.tok, t.n, product_search_jamo(t.n) AS j
        FROM (
            SELECT t.ord, t.tok, product_search_compose(t.tok) AS n
            FROM regexp_split_to_table(p_query, U&'[[:space:]\0085\00a0\1680\2000-\200a\2028\2029\202f\205f\3000]+') WITH ORDINALITY AS t(tok, ord)
        ) t
        WHERE t.n <> ''
        ORDER BY t.n, t.ord
    ) u
    ORDER BY u.ord
$$;

-- 토큰마다 조합한 검색어를 공백으로 이은 문자열. 오타 교정(search_correct_query)에 넘긴다.
CREATE FUNCTION product_search_query_text(p_query text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN (SELECT string_agg(t.norm, ' ' ORDER BY t.ord) FROM product_search_query_tokens(p_query) t);

-- 상품 검색 결과 한 행과 찾은 이유. 기존 product_search_hit 은 이전 함수의 반환 타입으로 그대로 둔다.
-- match_reason: 0 직접 일치(붙여 쓰기·자모 분리 포함). 뒤 작업이 1 표기 변형·브랜드 별칭, 2 미완성 해석, 3 카테고리를 더한다.
-- match_start·match_end: 실제로 맞은 이름(match_text)의 UTF-16 구간. 초성으로 맞은 행은 NULL 이고 페이지에서 search_match_range 로 계산한다.
CREATE TYPE product_search_match AS (
    product_id   bigint,
    tier         smallint,
    token_ratio  real,
    recent_views bigint,
    name_length  int,
    match_reason smallint,
    match_field  text,
    match_text   text,
    match_query  text,
    match_start  int,
    match_end    int
);

-- 상품 검색 본체. tier 0 완전 일치, 1 앞부분 일치, 2 포함 또는 모든 토큰 포함, 3 일부 토큰 포함.
-- V2 의 search_products_core 와 같은 규칙을 자모열에서 판정한다. 후보는 합친 자모열로 모으고 등급·토큰·위치는 이름 필드 안에서만 계산한다.
CREATE FUNCTION product_search_matches(p_query text)
    RETURNS SETOF product_search_match
    LANGUAGE sql STABLE
AS $$
    WITH tokens AS (
        SELECT t.*, nullif(t.read_jamo, t.jamo) AS read_x FROM product_search_query_tokens(p_query) t
    ),
    -- nj·rj 는 질의 전체의 원형·읽기 자모열이다. rx 는 읽기가 원형과 다를 때만 값이 있다.
    q AS (
        SELECT c.n, c.nj, c.rj, nullif(c.rj, c.nj) AS rx,
               c.n ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung,
               search_chosung_query(c.n) AS chosung_exact,
               search_chosung_query(c.n) || '%' AS chosung_prefix,
               '%' || search_chosung_query(c.n) || '%' AS chosung_contains,
               (SELECT count(*) FROM tokens) AS token_count
        FROM (
            SELECT n.n, n.nj, CASE WHEN n.n ~ '[a-z]' THEN product_search_jamo(search_read_query(n.n)) ELSE n.nj END AS rj
            FROM (SELECT c.n, product_search_jamo(c.n) AS nj FROM (SELECT product_search_compose(p_query) AS n) c) n
        ) c
    ),
    -- 공백 없이 붙여 쓴 브랜드+제품(또는 제품+브랜드) 질의. 조합한 질의를 음절 사이 한 곳에서 나눠 한 조각은 브랜드명(한글·읽기·영문,
    -- 초성 질의는 초성)과 완전 일치 또는 두 글자 이상 접두 일치하고, 나머지 조각은 제품명에 포함돼야 한다.
    -- 조합한 질의는 다시 조합해도 그대로이므로, 조각의 자모열은 글자마다 한 번 푼 자모열을 이어 붙여 만든다.
    letters AS MATERIALIZED (
        SELECT u.i::int AS i, product_search_jamo(u.c) AS j
        FROM q, unnest(string_to_array(q.n, NULL)) WITH ORDINALITY AS u(c, i)
        WHERE q.token_count = 1
    ),
    split AS MATERIALIZED (
        SELECT s.head, s.tail, s.head_jamo, s.tail_jamo,
               CASE WHEN s.head ~ '[a-z]' THEN product_search_jamo(search_read_query(s.head)) ELSE s.head_jamo END AS head_read_jamo,
               CASE WHEN s.tail ~ '[a-z]' THEN product_search_jamo(search_read_query(s.tail)) ELSE s.tail_jamo END AS tail_read_jamo
        FROM (
            SELECT left(q.n, g.i) AS head, substr(q.n, g.i + 1) AS tail,
                   (SELECT string_agg(l.j, '' ORDER BY l.i) FROM letters l WHERE l.i <= g.i) AS head_jamo,
                   (SELECT string_agg(l.j, '' ORDER BY l.i) FROM letters l WHERE l.i > g.i) AS tail_jamo
            FROM q, generate_series(1, length(q.n) - 1) AS g(i)
            WHERE q.token_count = 1
        ) s
    ),
    -- 상품이 있는 브랜드마다 검색 문서 한 행에서 브랜드 열을 읽는다.
    brands AS (
        SELECT b.id AS brand_id, d.brand_jamo, d.brand_read_jamo, d.brand_english_jamo, d.brand_chosung
        FROM brand b
        CROSS JOIN LATERAL (
            SELECT d.brand_jamo, d.brand_read_jamo, d.brand_english_jamo, d.brand_chosung
            FROM product_search_document d WHERE d.brand_id = b.id LIMIT 1
        ) d
    ),
    brand_split AS (
        SELECT b.brand_id, sp.tail AS product_part, sp.tail_jamo AS part_jamo, sp.tail_read_jamo AS part_read_jamo
        FROM brands b, split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.head
                         OR (length(sp.head) >= 2 AND b.brand_chosung LIKE sp.head || '%')
                     ELSE sp.head_jamo IN (b.brand_jamo, b.brand_read_jamo, b.brand_english_jamo)
                         OR (length(sp.head) >= 2 AND (b.brand_jamo LIKE sp.head_jamo || '%'
                             OR b.brand_read_jamo LIKE sp.head_jamo || '%' OR b.brand_english_jamo LIKE sp.head_jamo || '%')) END
        UNION
        SELECT b.brand_id, sp.head, sp.head_jamo, sp.head_read_jamo
        FROM brands b, split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.tail
                         OR (length(sp.tail) >= 2 AND b.brand_chosung LIKE sp.tail || '%')
                     ELSE sp.tail_jamo IN (b.brand_jamo, b.brand_read_jamo, b.brand_english_jamo)
                         OR (length(sp.tail) >= 2 AND (b.brand_jamo LIKE sp.tail_jamo || '%'
                             OR b.brand_read_jamo LIKE sp.tail_jamo || '%' OR b.brand_english_jamo LIKE sp.tail_jamo || '%')) END
    ),
    combined AS (
        SELECT DISTINCT ON (d.product_id) d.product_id, bs.product_part, bs.part_jamo, bs.part_read_jamo
        FROM brand_split bs
        JOIN product_search_document d ON d.brand_id = bs.brand_id
        CROSS JOIN q
        WHERE CASE WHEN q.is_chosung THEN d.product_chosung LIKE '%' || bs.product_part || '%'
                   ELSE d.product_jamo LIKE '%' || bs.part_jamo || '%' OR d.product_read_jamo LIKE '%' || bs.part_jamo || '%'
                        OR coalesce(d.product_read_jamo, d.product_jamo) LIKE '%' || bs.part_read_jamo || '%' END
        ORDER BY d.product_id, length(bs.product_part) DESC, bs.product_part COLLATE "C"
    ),
    candidate AS (
        SELECT d.product_id FROM product_search_document d, q
        WHERE q.n <> '' AND NOT q.is_chosung AND (d.doc_jamo LIKE '%' || q.nj || '%' OR d.doc_read_jamo LIKE '%' || q.rj || '%')
        UNION
        SELECT c.product_id FROM combined c
        UNION
        SELECT c.product_id FROM tokens t CROSS JOIN LATERAL (
            SELECT d.product_id FROM product_search_document d WHERE NOT t.is_chosung AND d.doc_jamo LIKE '%' || t.jamo || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE NOT t.is_chosung AND d.doc_read_jamo LIKE '%' || t.read_jamo || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE t.is_chosung AND d.doc_chosung SIMILAR TO t.chosung_contains
        ) c
    ),
    -- 후보마다 등급·토큰 판정을 한 번만 계산한다. 이름 필드의 읽기 자모열(*_read_jamo)이 NULL 이면 원형과 같다는 뜻이므로
    -- 원형 자모열과 질의의 읽기 형태(rx·read_x)를 비교해 V2 의 원형·읽기 4가지 비교와 같은 결과를 낸다.
    -- 초성 토큰은 이름 자모열과 비교하지 않는다. 초성 열은 음절을 초성으로 바꾸고 호환 자모는 그대로 두므로,
    -- 이름에 그 초성 문자열이 그대로 있으면 초성 열에도 있다. 영문 브랜드명은 초성 열이 없어 V2 처럼 그대로 비교한다.
    scored AS MATERIALIZED (
        SELECT d.product_id, length(d.product_norm) AS name_length, q.token_count,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN d.product_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN d.product_chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN d.product_chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN d.product_jamo IN (q.nj, q.rx) OR d.product_read_jamo IN (q.nj, q.rj) THEN 0
                        WHEN d.product_jamo LIKE q.nj || '%' OR d.product_jamo LIKE q.rx || '%'
                             OR d.product_read_jamo LIKE q.nj || '%' OR d.product_read_jamo LIKE q.rj || '%' THEN 1
                        WHEN d.product_jamo LIKE '%' || q.nj || '%' OR d.product_jamo LIKE '%' || q.rx || '%'
                             OR d.product_read_jamo LIKE '%' || q.nj || '%' OR d.product_read_jamo LIKE '%' || q.rj || '%' THEN 2
                        ELSE 9 END
               END AS product_tier,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN d.brand_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN d.brand_chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN d.brand_chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN d.brand_jamo IN (q.nj, q.rx) OR d.brand_read_jamo IN (q.nj, q.rj) THEN 0
                        WHEN d.brand_jamo LIKE q.nj || '%' OR d.brand_jamo LIKE q.rx || '%'
                             OR d.brand_read_jamo LIKE q.nj || '%' OR d.brand_read_jamo LIKE q.rj || '%' THEN 1
                        WHEN d.brand_jamo LIKE '%' || q.nj || '%' OR d.brand_jamo LIKE '%' || q.rx || '%'
                             OR d.brand_read_jamo LIKE '%' || q.nj || '%' OR d.brand_read_jamo LIKE '%' || q.rj || '%' THEN 2
                        ELSE 9 END
               END AS brand_tier,
               CASE WHEN d.brand_english_jamo IN (q.nj, q.rx) THEN 0
                    WHEN d.brand_english_jamo LIKE q.nj || '%' OR d.brand_english_jamo LIKE q.rx || '%' THEN 1
                    WHEN d.brand_english_jamo LIKE '%' || q.nj || '%' OR d.brand_english_jamo LIKE '%' || q.rx || '%' THEN 2
                    ELSE 9 END AS english_tier,
               (SELECT count(*) FROM tokens t
                WHERE CASE WHEN t.is_chosung THEN d.product_chosung SIMILAR TO t.chosung_contains
                                                  OR d.brand_chosung SIMILAR TO t.chosung_contains
                                                  OR d.brand_english_jamo LIKE '%' || t.jamo || '%'
                           ELSE d.product_jamo LIKE '%' || t.jamo || '%' OR d.product_jamo LIKE '%' || t.read_x || '%'
                                OR d.product_read_jamo LIKE '%' || t.read_jamo || '%'
                                OR d.brand_jamo LIKE '%' || t.jamo || '%' OR d.brand_jamo LIKE '%' || t.read_x || '%'
                                OR d.brand_read_jamo LIKE '%' || t.read_jamo || '%'
                                OR d.brand_english_jamo LIKE '%' || t.jamo || '%' END) AS matched,
               cb.product_id IS NOT NULL AS combined,
               cb.product_part AS combined_part,
               cb.part_jamo AS combined_jamo,
               cb.part_read_jamo AS combined_read_jamo,
               (SELECT t.ord FROM tokens t
                WHERE CASE WHEN t.is_chosung THEN d.product_chosung SIMILAR TO t.chosung_contains
                           ELSE d.product_jamo LIKE '%' || t.jamo || '%' OR d.product_jamo LIKE '%' || t.read_x || '%'
                                OR d.product_read_jamo LIKE '%' || t.read_jamo || '%' END
                ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS product_token,
               (SELECT t.ord FROM tokens t
                WHERE CASE WHEN t.is_chosung THEN d.brand_chosung SIMILAR TO t.chosung_contains
                           ELSE d.brand_jamo LIKE '%' || t.jamo || '%' OR d.brand_jamo LIKE '%' || t.read_x || '%'
                                OR d.brand_read_jamo LIKE '%' || t.read_jamo || '%' END
                ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS brand_token,
               (SELECT t.ord FROM tokens t
                WHERE d.brand_english_jamo LIKE '%' || t.jamo || '%'
                ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS english_token
        FROM candidate c
        JOIN product_search_document d ON d.product_id = c.product_id
        LEFT JOIN combined cb ON cb.product_id = d.product_id
        CROSS JOIN q
    ),
    -- 강조할 이름 필드(lane)와 맞은 조각(piece). 질의 전체가 맞으면 질의 전체, 아니면 브랜드+제품 조합의 제품 조각, 아니면 가장 긴 토큰이다.
    chosen AS (
        SELECT s.*, x.whole_tier,
               CASE WHEN x.whole_tier < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN 'PRODUCT_NAME'
                             WHEN s.brand_tier <= s.english_tier THEN 'BRAND_NAME'
                             ELSE 'BRAND_ENGLISH_NAME' END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN 'PRODUCT_NAME'
                    WHEN s.brand_token IS NOT NULL THEN 'BRAND_NAME'
                    ELSE 'BRAND_ENGLISH_NAME' END AS lane,
               CASE WHEN x.whole_tier < 9 THEN 'WHOLE' WHEN s.combined THEN 'COMBINED' ELSE 'TOKEN' END AS piece
        FROM scored s
        CROSS JOIN LATERAL (SELECT least(s.product_tier, s.brand_tier, s.english_tier) AS whole_tier) x
        WHERE s.matched > 0 OR s.combined OR x.whole_tier < 9
    ),
    pieced AS (
        SELECT c.*,
               CASE c.piece WHEN 'WHOLE' THEN q.n WHEN 'COMBINED' THEN c.combined_part ELSE tk.norm END AS match_query,
               CASE c.piece WHEN 'TOKEN' THEN tk.is_chosung ELSE q.is_chosung END AS by_chosung,
               CASE c.piece WHEN 'WHOLE' THEN q.nj WHEN 'COMBINED' THEN c.combined_jamo ELSE tk.jamo END AS needle,
               CASE c.piece WHEN 'WHOLE' THEN q.rj WHEN 'COMBINED' THEN c.combined_read_jamo ELSE tk.read_jamo END AS read_needle
        FROM chosen c
        CROSS JOIN q
        LEFT JOIN tokens tk ON c.piece = 'TOKEN'
            AND tk.ord = CASE c.lane WHEN 'PRODUCT_NAME' THEN c.product_token WHEN 'BRAND_NAME' THEN c.brand_token ELSE c.english_token END
    )
    SELECT p.product_id,
           least(p.whole_tier,
                 CASE WHEN p.combined THEN 2 ELSE 9 END,
                 CASE WHEN p.matched = p.token_count THEN 2 WHEN p.matched > 0 THEN 3 ELSE 9 END)::smallint,
           CASE WHEN p.combined THEN 1 ELSE p.matched::real / p.token_count END::real,
           coalesce((SELECT sum(v.view_count) FROM product_daily_view v
                     WHERE v.product_id = p.product_id
                       AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                       AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date), 0)::bigint,
           p.name_length,
           0::smallint,
           CASE p.lane WHEN 'PRODUCT_NAME' THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END,
           CASE p.lane WHEN 'PRODUCT_NAME' THEN d.product_name WHEN 'BRAND_NAME' THEN d.brand_korean_name ELSE d.brand_english_name END,
           p.match_query,
           r.span[1],
           r.span[2]
    FROM pieced p
    JOIN product_search_document d ON d.product_id = p.product_id
    -- 원형 조각을 원형·읽기 자모열 순으로, 다음에 읽기 조각을 같은 순으로 찾는다(search_match_range 와 같은 순서).
    CROSS JOIN LATERAL (
        SELECT CASE WHEN p.by_chosung THEN NULL
                    WHEN p.lane = 'PRODUCT_NAME' THEN coalesce(
                        product_search_range(d.product_jamo, d.product_jamo_pos, p.needle),
                        product_search_range(d.product_read_jamo, d.product_read_jamo_pos, p.needle),
                        product_search_range(d.product_jamo, d.product_jamo_pos, p.read_needle),
                        product_search_range(d.product_read_jamo, d.product_read_jamo_pos, p.read_needle))
                    WHEN p.lane = 'BRAND_NAME' THEN coalesce(
                        product_search_range(d.brand_jamo, d.brand_jamo_pos, p.needle),
                        product_search_range(d.brand_read_jamo, d.brand_read_jamo_pos, p.needle),
                        product_search_range(d.brand_jamo, d.brand_jamo_pos, p.read_needle),
                        product_search_range(d.brand_read_jamo, d.brand_read_jamo_pos, p.read_needle))
                    ELSE coalesce(
                        product_search_range(d.brand_english_jamo, d.brand_english_jamo_pos, p.needle),
                        product_search_range(d.brand_english_jamo, d.brand_english_jamo_pos, p.read_needle)) END AS span
    ) r
$$;

-- 이전 서버와 테스트가 부르는 검색 본체. 반환 타입 product_search_hit 은 그대로 두고 product_search_matches 를 따른다.
CREATE OR REPLACE FUNCTION search_products_core(p_query text)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$
    SELECT m.product_id, m.tier, m.token_ratio, m.recent_views, m.name_length, m.match_field, m.match_text, m.match_query
    FROM product_search_matches(p_query) m
$$;

-- 제품 검색 한 페이지. 기본 순서는 전체 일치(tier 2 이하) → 찾은 이유 → tier → token_ratio → 최근 조회수 → 이름 길이 → ID 다.
-- 일치 구간은 찾은 이유에 남긴 위치를 쓰고, 위치가 없는 초성 일치만 search_match_range 로 계산한다.
CREATE OR REPLACE FUNCTION search_products_page(p_query text, p_offset bigint, p_limit int, p_max_tier int)
    RETURNS TABLE (total bigint, has_full_match boolean, items jsonb)
    LANGUAGE sql STABLE
AS $$
    WITH h AS MATERIALIZED (
        SELECT * FROM product_search_matches(p_query)
    ),
    page AS (
        SELECT h.*
        FROM h
        WHERE h.tier <= p_max_tier
        ORDER BY h.tier > 2, h.match_reason, h.tier, h.token_ratio DESC, h.recent_views DESC, h.name_length, h.product_id
        OFFSET p_offset LIMIT p_limit
    )
    SELECT (SELECT count(*) FROM h WHERE h.tier <= p_max_tier),
           coalesce((SELECT bool_or(h.tier <= 2) FROM h), false),
           coalesce((
               SELECT jsonb_agg(jsonb_build_object(
                          'productId', r.product_id, 'rank', r.rank, 'tier', r.tier, 'tokenRatio', r.token_ratio,
                          'recentViews', r.recent_views, 'matchField', r.match_field, 'matchText', r.match_text,
                          'matchRange', CASE WHEN p_limit IS NOT NULL THEN to_jsonb(
                              CASE WHEN r.match_start IS NOT NULL THEN ARRAY[r.match_start, r.match_end]
                                   ELSE search_match_range(r.match_text, r.match_query) END) END)
                      ORDER BY r.rank)
               FROM (SELECT page.*, p_offset + row_number() OVER (
                                 ORDER BY page.tier > 2, page.match_reason, page.tier, page.token_ratio DESC, page.recent_views DESC,
                                          page.name_length, page.product_id) AS rank
                     FROM page) r
           ), '[]'::jsonb)
$$;

-- 제품 검색. 반환 열과 인자 기본값은 V2 와 같다. 오타 교정에는 토큰마다 조합한 검색어를 넘겨, 자모를 나눠 쓴 토큰을 오타로 보지 않게 한다.
CREATE OR REPLACE FUNCTION search_products(p_query text, p_offset bigint DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3)
    RETURNS TABLE (total bigint, corrected_query text, items jsonb)
    LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_query text;
    v_page record;
    v_corrected_page record;
    v_corrected text;
BEGIN
    IF p_offset IS NULL OR p_offset < 0 OR p_limit < 1 OR p_max_tier IS NULL OR p_max_tier NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION '페이지 조건이 올바르지 않다 (offset %, limit %, max_tier %).', p_offset, p_limit, p_max_tier;
    END IF;

    SELECT * INTO v_page FROM search_products_page(p_query, p_offset, p_limit, p_max_tier);

    IF NOT v_page.has_full_match THEN
        v_query := product_search_query_text(p_query);
        v_corrected := search_correct_query(v_query, 'PRODUCT');
        IF search_norm(v_corrected) <> search_norm(v_query) THEN
            SELECT * INTO v_corrected_page FROM search_products_page(v_corrected, p_offset, p_limit, p_max_tier);
            IF v_corrected_page.total > 0 THEN
                RETURN QUERY SELECT v_corrected_page.total, v_corrected, v_corrected_page.items;
                RETURN;
            END IF;
        END IF;
    END IF;

    RETURN QUERY SELECT v_page.total, NULL::text, v_page.items;
END
$$;
