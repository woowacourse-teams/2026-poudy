-- #975: 분석 → 후보 → 일치 근거 → 정책 → 표시. 기존 MV·인덱스와 공개 반환 계약은 유지한다.
-- ord=0은 전체 입력, ord>0은 중복을 제거한 필수 토큰이다. raw는 원문 강조에 사용한다.
CREATE TYPE product_search_part AS (
    ord int, raw text, norm text, read text, is_chosung boolean, has_spelling boolean, chosung_contains text
);
CREATE TYPE product_search_field_match AS (
    product_id bigint, ord int, field text, text text, query text, match_query text,
    tier int, term_key text, literal_match boolean
);
CREATE TYPE product_search_combination AS (
    product_id bigint, brand_part text, product_part text, tier int, ratio real
);
CREATE TYPE product_search_evidence AS (
    product_id bigint, product_name text, brand_name text, brand_english_name text, name_length int,
    parts product_search_part[], fields product_search_field_match[], combination product_search_combination,
    product_covers_query boolean
);
CREATE TYPE product_search_ranked_match AS (
    hit product_search_hit, evidence product_search_evidence
);

-- 분석 함수의 캐시된 계획에 규칙 배열이 인라인 상수로 남지 않게 한다.
-- 규칙 함수 교체 후 기존 연결에서도 새 표기를 인식해야 한다.
CREATE OR REPLACE FUNCTION search_product_has_spelling(p_normalized text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
AS $$
BEGIN
    RETURN coalesce(p_normalized ~ ANY(search_product_spelling_rules()), false);
END
$$;

-- 저장용 분석은 기존 MV가 소유한다. 검색어는 원문과 전체/토큰별 비교 표현을 함께 준비한다.
CREATE FUNCTION search_product_analyze(p_query text) RETURNS product_search_part[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT array_agg(ROW(ord, raw, norm, read, is_chosung, has_spelling, chosung_contains)::product_search_part ORDER BY ord)
    FROM (
        SELECT 0 AS ord, p_query AS raw, search_product_key(search_norm(p_query)) AS norm,
               search_read_query(search_product_key(search_norm(p_query))) AS read,
               search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung,
               search_product_has_spelling(search_norm(p_query)) AS has_spelling,
               '%' || search_chosung_query(search_norm(p_query)) || '%' AS chosung_contains
        UNION ALL
        SELECT ord, raw, norm, read, is_chosung, has_spelling, chosung_contains FROM search_product_query_tokens(p_query)
    ) parts
$$;

CREATE OR REPLACE FUNCTION search_product_queries(p_query text)
    RETURNS TABLE (ord int, norm text, read text, is_chosung boolean, has_spelling boolean, chosung_contains text)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT ord, norm, read, is_chosung, has_spelling, chosung_contains FROM unnest(search_product_analyze(p_query))
$$;

-- 정의를 먼저 찾고 실제 제품 연결을 읽는다. 메타데이터 변경에 별도 REFRESH가 필요하지 않다.
CREATE FUNCTION search_product_metadata_matches(p_parts product_search_part[])
    RETURNS SETOF product_search_field_match
    LANGUAGE sql STABLE
AS $$
    WITH matched AS MATERIALIZED (
        SELECT m.*, q.ord, q.norm AS query, q.has_spelling,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) THEN 0
                        WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) || '%' THEN 1 ELSE 2 END
               ELSE
                   CASE WHEN m.norm IN (q.norm, q.read) OR m.read IN (q.norm, q.read) THEN 0
                        WHEN m.norm LIKE q.norm || '%' OR m.norm LIKE q.read || '%'
                          OR m.read LIKE q.norm || '%' OR m.read LIKE q.read || '%' THEN 1 ELSE 2 END
               END AS tier
        FROM unnest(p_parts) q CROSS JOIN LATERAL (
            SELECT original.field, original.attribute_id, original.value_code, original.mark_code, original.text, original.chosung,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.norm) THEN search_product_key(original.norm) ELSE original.norm END AS norm,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.read) THEN search_product_key(original.read) ELSE original.read END AS read
            FROM product_search_metadata_term original
        ) m
        WHERE q.norm <> '' AND (
            m.norm LIKE '%' || q.norm || '%' OR m.norm LIKE '%' || q.read || '%'
            OR m.read LIKE '%' || q.norm || '%' OR m.read LIKE '%' || q.read || '%'
            OR (q.is_chosung AND m.chosung SIMILAR TO q.chosung_contains))
    ), linked AS (
        SELECT p.product_id, m.*, m.attribute_id::text || ':' || m.value_code AS term_key
        FROM matched m JOIN product_attribute_value p ON p.attribute_id = m.attribute_id AND p.value_code = m.value_code
        WHERE m.field = 'ATTRIBUTE_VALUE'
        UNION ALL
        SELECT p.product_id, m.*, m.mark_code::text FROM matched m JOIN product_mark p ON p.mark_code = m.mark_code
        WHERE m.field = 'MARK'
    )
    SELECT product_id, ord, field, text, query,
           CASE WHEN has_spelling THEN search_product_match_piece(text, query) ELSE query END,
           tier, term_key, true FROM linked
$$;

CREATE OR REPLACE FUNCTION search_product_metadata_hits(p_query text)
    RETURNS TABLE (product_id bigint, field text, text text, query text, ord int, tier int, term_key text)
    LANGUAGE sql STABLE
AS $$
    SELECT product_id, field, text, match_query, ord, tier, term_key
    FROM search_product_metadata_matches(search_product_analyze(p_query))
$$;

-- 붙여 쓴 브랜드·제품명의 가장 좋은 분할을 한 번 선택한다. 순위와 강조가 같은 조각을 사용한다.
CREATE FUNCTION search_product_combination_matches(p_parts product_search_part[])
    RETURNS SETOF product_search_combination
    LANGUAGE sql STABLE
AS $$
    WITH q AS (
        SELECT norm AS n, has_spelling, is_chosung, cardinality(p_parts) - 1 AS token_count FROM unnest(p_parts) WHERE ord = 0
    ),
    documents AS NOT MATERIALIZED (
        SELECT d.product_id, d.brand_id,
               d.product_chosung, d.brand_chosung,
               CASE WHEN q.has_spelling THEN coalesce(d.product_key, d.product_norm) ELSE d.product_norm END AS product_norm,
               CASE WHEN q.has_spelling THEN coalesce(d.product_read_key, d.product_read) ELSE d.product_read END AS product_read,
               CASE WHEN q.has_spelling THEN coalesce(d.brand_key, d.brand_norm) ELSE d.brand_norm END AS brand_norm,
               CASE WHEN q.has_spelling THEN coalesce(d.brand_read_key, d.brand_read) ELSE d.brand_read END AS brand_read,
               CASE WHEN q.has_spelling THEN coalesce(d.brand_english_key, d.brand_english_norm) ELSE d.brand_english_norm END AS brand_english_norm
        FROM product_search_document d CROSS JOIN q
    ),
    -- 공백 없이 붙여 쓴 브랜드+제품(또는 제품+브랜드) 질의. 질의를 한 곳에서 나눠 한 조각은 브랜드명(한글·읽기·영문, 초성 질의는 초성)과
    -- 완전 일치 또는 두 글자 이상 접두 일치하고, 나머지 조각은 제품명에 포함돼야 한다.
    -- 브랜드명과 제품명을 이어 붙인 경계에서만 맞는 문자열(닥터지 블랙 → 지블)은 인정하지 않는다.
    split AS (
        SELECT left(q.n, g.i) AS head, substr(q.n, g.i + 1) AS tail
        FROM q, generate_series(1, length(q.n) - 1) AS g(i)
        WHERE q.token_count = 1
    ),
    brands AS MATERIALIZED (
        SELECT DISTINCT brand_id, brand_norm, brand_read, brand_english_norm, brand_chosung FROM documents
    ),
    brand_split AS MATERIALIZED (
        SELECT b.brand_id, sp.tail AS product_part, search_read_query(sp.tail) AS product_read_part, true AS brand_first, sp.head AS brand_part,
               CASE WHEN q.is_chosung THEN b.brand_chosung = sp.head
                    ELSE sp.head IN (b.brand_norm, b.brand_read, b.brand_english_norm) END AS brand_exact
        FROM brands b,
             split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.head
                         OR (length(sp.head) >= 2 AND b.brand_chosung LIKE sp.head || '%')
                     ELSE sp.head IN (b.brand_norm, b.brand_read, b.brand_english_norm)
                         OR (length(sp.head) >= 2 AND (b.brand_norm LIKE sp.head || '%'
                             OR b.brand_read LIKE sp.head || '%' OR b.brand_english_norm LIKE sp.head || '%')) END
        UNION
        SELECT b.brand_id, sp.head, search_read_query(sp.head), false, sp.tail,
               CASE WHEN q.is_chosung THEN b.brand_chosung = sp.tail
                    ELSE sp.tail IN (b.brand_norm, b.brand_read, b.brand_english_norm) END
        FROM brands b,
             split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.tail
                         OR (length(sp.tail) >= 2 AND b.brand_chosung LIKE sp.tail || '%')
                     ELSE sp.tail IN (b.brand_norm, b.brand_read, b.brand_english_norm)
                         OR (length(sp.tail) >= 2 AND (b.brand_norm LIKE sp.tail || '%'
                             OR b.brand_read LIKE sp.tail || '%' OR b.brand_english_norm LIKE sp.tail || '%')) END
    ),
    -- 한 제품에 여러 분할이 맞으면 일치의 질이 가장 좋은 분할을 쓴다.
    combined AS (
        SELECT DISTINCT ON (d.product_id) d.product_id, bs.brand_part, bs.product_part,
               CASE WHEN bs.brand_first AND bs.brand_exact AND m.product_exact THEN 0
                    WHEN bs.brand_first AND bs.brand_exact AND m.product_prefix THEN 1 ELSE 2 END AS combined_tier,
               ((bs.brand_first::int + bs.brand_exact::int + m.product_prefix::int + 1) / 4.0)::real AS combined_ratio
        FROM brand_split bs
        JOIN documents d ON d.brand_id = bs.brand_id
        CROSS JOIN q
        CROSS JOIN LATERAL (
            SELECT CASE WHEN q.is_chosung THEN d.product_chosung = bs.product_part
                        ELSE bs.product_part IN (d.product_norm, d.product_read) OR d.product_read = bs.product_read_part END AS product_exact,
                   CASE WHEN q.is_chosung THEN d.product_chosung LIKE bs.product_part || '%'
                        ELSE d.product_norm LIKE bs.product_part || '%' OR d.product_read LIKE bs.product_part || '%'
                             OR d.product_read LIKE bs.product_read_part || '%' END AS product_prefix
        ) m
        WHERE CASE WHEN q.is_chosung THEN d.product_chosung LIKE '%' || bs.product_part || '%'
                   ELSE d.product_norm LIKE '%' || bs.product_part || '%' OR d.product_read LIKE '%' || bs.product_part || '%'
                        OR d.product_read LIKE '%' || bs.product_read_part || '%' END
        ORDER BY d.product_id, combined_tier, combined_ratio DESC, length(bs.product_part) DESC, bs.product_part COLLATE "C"
    )
    SELECT product_id, brand_part, product_part, combined_tier, combined_ratio FROM combined
$$;

-- 인덱스 열을 변환 함수로 감싸지 않는다. 이 단계의 합친 문서는 후보 수집에만 사용한다.
-- 여러 경로에서 나온 같은 ID는 match_evidence가 메타데이터·결합 후보와 합칠 때 한 번 제거한다.
CREATE FUNCTION search_product_candidate_ids(p_parts product_search_part[])
    RETURNS TABLE (product_id bigint)
    LANGUAGE sql STABLE
AS $$
    WITH q AS (SELECT norm AS n, read AS r, has_spelling FROM unnest(p_parts) WHERE ord = 0),
         tokens AS (SELECT * FROM unnest(p_parts) WHERE ord > 0),
    candidate AS (
        SELECT d.product_id FROM product_search_document d, q
        WHERE q.n <> '' AND NOT q.has_spelling
          AND (d.doc_norm LIKE '%' || q.n || '%' OR d.doc_read LIKE '%' || q.r || '%')
        UNION ALL
        SELECT d.product_id FROM product_search_document d, q
        WHERE q.n <> '' AND q.has_spelling
          AND (coalesce(d.doc_key, d.doc_norm) LIKE '%' || q.n || '%' OR coalesce(d.doc_read_key, d.doc_read) LIKE '%' || q.r || '%')
        UNION ALL
        SELECT c.product_id FROM tokens t CROSS JOIN LATERAL (
            SELECT d.product_id FROM product_search_document d WHERE NOT t.has_spelling AND d.doc_norm LIKE '%' || t.norm || '%'
            UNION ALL
            SELECT d.product_id FROM product_search_document d WHERE NOT t.has_spelling AND d.doc_read LIKE '%' || t.read || '%'
            UNION ALL
            SELECT d.product_id FROM product_search_document d WHERE t.has_spelling AND coalesce(d.doc_key, d.doc_norm) LIKE '%' || t.norm || '%'
            UNION ALL
            SELECT d.product_id FROM product_search_document d WHERE t.has_spelling AND coalesce(d.doc_read_key, d.doc_read) LIKE '%' || t.read || '%'
            UNION ALL
            SELECT d.product_id FROM product_search_document d WHERE t.is_chosung AND d.doc_chosung SIMILAR TO t.chosung_contains
        ) c
    )
    SELECT product_id FROM candidate
$$;

-- 필드 경계를 보존한다. 전체 입력은 읽기 교차 비교, 필수 토큰은 기존 같은 표현끼리 비교한다.
-- literal_match는 초성 확장을 제외한 판정이며 연관검색어 접두어의 기존 규칙에 사용한다.
CREATE FUNCTION search_product_name_matches(p_parts product_search_part[], p_ids bigint[])
    RETURNS SETOF product_search_field_match
    LANGUAGE sql STABLE
AS $$
    WITH document_fields AS MATERIALIZED (
        SELECT d.product_id, f.* FROM product_search_document d CROSS JOIN LATERAL (VALUES
            ('PRODUCT_NAME', d.product_name::text, d.product_norm, d.product_read, d.product_chosung, d.product_key, d.product_read_key),
            ('BRAND_NAME', d.brand_korean_name::text, d.brand_norm, d.brand_read, d.brand_chosung, d.brand_key, d.brand_read_key),
            ('BRAND_ENGLISH_NAME', d.brand_english_name::text, d.brand_english_norm, NULL::text, NULL::text, d.brand_english_key, NULL::text)
        ) f(field, text, norm, read, chosung, key, read_key) WHERE d.product_id = ANY(p_ids)
    ), compared AS (
        SELECT d.product_id, t.*, d.field, d.text, f.norm AS field_norm, f.read AS field_read, d.chosung,
               coalesce(f.norm LIKE '%' || t.norm || '%' OR f.read LIKE '%' || t.read || '%', false) AS literal_match
        FROM document_fields d CROSS JOIN unnest(p_parts) t CROSS JOIN LATERAL (
            SELECT CASE WHEN t.has_spelling THEN coalesce(d.key, d.norm) ELSE d.norm END AS norm,
                   CASE WHEN t.has_spelling THEN coalesce(d.read_key, d.read) ELSE d.read END AS read
        ) f WHERE t.norm <> ''
    ), matched AS (
        SELECT * FROM compared WHERE
            CASE WHEN ord = 0 THEN
                CASE WHEN is_chosung AND field <> 'BRAND_ENGLISH_NAME' THEN chosung SIMILAR TO chosung_contains
                     ELSE field_norm LIKE '%' || norm || '%' OR field_norm LIKE '%' || read || '%'
                       OR field_read LIKE '%' || norm || '%' OR field_read LIKE '%' || read || '%' END
            ELSE literal_match OR (is_chosung AND chosung SIMILAR TO chosung_contains) END
    )
    SELECT product_id, ord, field, text, norm, norm,
           CASE WHEN ord > 0 THEN NULL -- 필수 토큰에는 충족 여부만 필요하고, 이름 등급은 전체 입력으로 정한다.
           WHEN is_chosung AND field <> 'BRAND_ENGLISH_NAME' THEN
               CASE WHEN chosung SIMILAR TO search_chosung_query(norm) THEN 0
                    WHEN chosung SIMILAR TO search_chosung_query(norm) || '%' THEN 1 ELSE 2 END
           ELSE CASE WHEN field_norm IN (norm, read) OR field_read IN (norm, read) THEN 0
                     WHEN field_norm LIKE norm || '%' OR field_norm LIKE read || '%'
                       OR field_read LIKE norm || '%' OR field_read LIKE read || '%' THEN 1 ELSE 2 END END,
           NULL::text, literal_match FROM matched
$$;

-- 요청의 분석 결과와 일치 근거를 함께 전달한다. 표시 단계는 제품을 다시 검색하지 않는다.
CREATE FUNCTION search_product_match_evidence(p_parts product_search_part[], p_include_metadata boolean)
    RETURNS SETOF product_search_evidence
    LANGUAGE sql STABLE
AS $$
    WITH metadata AS MATERIALIZED (
        SELECT * FROM search_product_metadata_matches(p_parts) WHERE p_include_metadata
    ), combined AS MATERIALIZED (
        SELECT * FROM search_product_combination_matches(p_parts)
    ), candidates AS MATERIALIZED (
        SELECT product_id FROM search_product_candidate_ids(p_parts)
        UNION SELECT product_id FROM metadata
        UNION SELECT product_id FROM combined
    ), candidate_ids AS MATERIALIZED (
        SELECT array_agg(product_id) AS ids FROM candidates
    ), fields AS MATERIALIZED (
        SELECT m.* FROM candidate_ids c CROSS JOIN LATERAL search_product_name_matches(p_parts, c.ids) m
        UNION ALL SELECT * FROM metadata
    ), collected AS (
        SELECT product_id, array_agg(f::product_search_field_match ORDER BY ord, field, term_key COLLATE "C") AS fields
        FROM fields f GROUP BY product_id
    )
    SELECT d.product_id, d.product_name, d.brand_korean_name, d.brand_english_name, length(d.product_norm), p_parts,
           coalesce(f.fields, ARRAY[]::product_search_field_match[]), c::product_search_combination,
           greatest(strpos(CASE WHEN q.has_spelling THEN coalesce(d.product_key, d.product_norm) ELSE d.product_norm END, q.norm),
                    strpos(CASE WHEN q.has_spelling THEN coalesce(d.product_read_key, d.product_read) ELSE d.product_read END, q.norm),
                    strpos(d.product_chosung, q.norm)) > 0
    FROM candidates ids JOIN product_search_document d ON d.product_id = ids.product_id
    LEFT JOIN collected f ON f.product_id = d.product_id
    LEFT JOIN combined c ON c.product_id = d.product_id
    CROSS JOIN unnest(p_parts) q WHERE q.ord = 0
$$;

-- 포함·순위 정책은 문자열을 다시 비교하지 않고 일치 근거만 읽는다. tier=3의 내부 계약도 유지한다.
CREATE FUNCTION search_product_ranked_matches(p_parts product_search_part[], p_include_metadata boolean)
    RETURNS SETOF product_search_ranked_match
    LANGUAGE sql STABLE
AS $$
    WITH facts AS (
        SELECT e, e.product_id, e.product_name, e.brand_name AS brand_korean_name, e.brand_english_name,
               cardinality(p_parts) - 1 AS token_count, q.norm AS whole_query, q.has_spelling,
               (e.combination).product_id IS NOT NULL AS combined,
               (e.combination).product_part AS combined_part, (e.combination).tier AS combined_tier,
               (e.combination).ratio AS combined_ratio, m.*
        FROM search_product_match_evidence(p_parts, p_include_metadata) e
        CROSS JOIN unnest(p_parts) q
        CROSS JOIN LATERAL (
            SELECT count(DISTINCT ord) FILTER (WHERE ord > 0 AND field IN ('PRODUCT_NAME','BRAND_NAME','BRAND_ENGLISH_NAME')) AS matched,
                   count(DISTINCT ord) FILTER (WHERE ord > 0) AS all_matched,
                   coalesce(min(tier) FILTER (WHERE ord = 0 AND field = 'PRODUCT_NAME'), 9) AS product_tier,
                   coalesce(min(tier) FILTER (WHERE ord = 0 AND field = 'BRAND_NAME'), 9) AS brand_tier,
                   coalesce(min(tier) FILTER (WHERE ord = 0 AND field = 'BRAND_ENGLISH_NAME'), 9) AS english_tier,
                   min(tier) FILTER (WHERE ord = 0 AND field IN ('ATTRIBUTE_VALUE','MARK')) AS metadata_tier,
                   count(*) FILTER (WHERE field IN ('ATTRIBUTE_VALUE','MARK')) > 0 AS metadata_hit,
                   (array_agg(query ORDER BY length(query) DESC, ord) FILTER (WHERE ord > 0 AND field = 'PRODUCT_NAME'))[1] AS product_token,
                   (array_agg(query ORDER BY length(query) DESC, ord) FILTER (WHERE ord > 0 AND field = 'BRAND_NAME'))[1] AS brand_token,
                   (array_agg(query ORDER BY length(query) DESC, ord) FILTER (WHERE ord > 0 AND field = 'BRAND_ENGLISH_NAME'))[1] AS english_token
            FROM unnest(e.fields)
        ) m WHERE q.ord = 0
    ), eligibility AS (
        SELECT f.*,
               (matched > 0 OR combined OR least(product_tier, brand_tier, english_tier) < 9) AS name_hit,
               ((combined OR matched = token_count OR least(product_tier, brand_tier, english_tier) < 9)
                AND (NOT has_spelling OR combined OR matched = token_count)) AS name_eligible
        FROM facts f
    ), accepted AS (
        SELECT e.*, (name_eligible OR metadata_tier IS NOT NULL OR all_matched = token_count) AS eligible
        FROM eligibility e WHERE token_count > 0 AND (name_hit OR metadata_hit)
    ), ranked AS (
        SELECT a.*,
               CASE WHEN eligible THEN least(
                   CASE WHEN name_eligible THEN least(product_tier, brand_tier, english_tier,
                        coalesce(combined_tier, 9), CASE WHEN matched = token_count THEN 2 ELSE 9 END) ELSE 3 END,
                   coalesce(metadata_tier, 9), CASE WHEN all_matched = token_count THEN 2 ELSE 3 END)
                    ELSE 3 END::smallint AS tier,
               CASE WHEN name_eligible THEN CASE WHEN combined THEN greatest(combined_ratio, matched::real / token_count)
                                                 ELSE matched::real / token_count END
                    WHEN metadata_tier IS NOT NULL THEN 1 ELSE all_matched::real / token_count END::real AS token_ratio
        FROM accepted a
    ),
    display AS (
        SELECT s.*,
               CASE WHEN NOT s.name_hit THEN m.field
                    WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN 'PRODUCT_NAME'
                    ELSE 'BRAND_NAME' END AS match_field,
               CASE WHEN NOT s.name_hit THEN m.text
                    WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN s.product_name
                             WHEN s.brand_tier <= s.english_tier THEN s.brand_korean_name
                             ELSE s.brand_english_name END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN s.product_name
                    WHEN s.brand_token IS NOT NULL THEN s.brand_korean_name
                    ELSE s.brand_english_name END AS match_text,
               CASE WHEN NOT s.name_hit THEN m.query
                    WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN s.whole_query
                    WHEN s.combined THEN s.combined_part
                    WHEN s.product_token IS NOT NULL THEN s.product_token
                    WHEN s.brand_token IS NOT NULL THEN s.brand_token
                    ELSE s.english_token END AS match_query
        FROM ranked s LEFT JOIN LATERAL (
            SELECT field, text, match_query AS query FROM unnest((s.e).fields)
            WHERE NOT s.name_hit AND field IN ('ATTRIBUTE_VALUE','MARK')
            ORDER BY CASE field WHEN 'ATTRIBUTE_VALUE' THEN 0 ELSE 1 END, length(match_query) DESC, ord, term_key COLLATE "C"
            LIMIT 1
        ) m ON true
    )
    SELECT ROW(h.product_id, h.tier, h.token_ratio,
           coalesce((SELECT sum(v.view_count) FROM product_daily_view v
                     WHERE v.product_id = h.product_id
                       AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                       AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date), 0)::bigint,
           (h.e).name_length, h.match_field, h.match_text,
           CASE WHEN h.name_hit AND h.has_spelling THEN search_product_match_piece(h.match_text, h.match_query)
                ELSE h.match_query END)::product_search_hit, h.e
    FROM display h
$$;

CREATE OR REPLACE FUNCTION search_product_hits(p_query text, p_include_metadata boolean)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$
    WITH analysis AS MATERIALIZED (SELECT search_product_analyze(p_query) AS parts)
    SELECT (r.hit).* FROM analysis a CROSS JOIN LATERAL search_product_ranked_matches(a.parts, p_include_metadata) r
$$;

-- 전체 개수·교정 여부는 모든 후보에서 구하고, 다음 단계에는 요청한 페이지의 근거만 넘긴다.
CREATE FUNCTION search_product_evidence_page(p_query text, p_offset bigint, p_limit int, p_max_tier int)
    RETURNS TABLE (total bigint, has_full_match boolean, matches product_search_ranked_match[])
    LANGUAGE sql STABLE
AS $$
    WITH analysis AS MATERIALIZED (SELECT search_product_analyze(p_query) AS parts), hits AS MATERIALIZED (
        SELECT r.* FROM analysis a CROSS JOIN LATERAL search_product_ranked_matches(a.parts, true) r
    ), page AS (
        SELECT * FROM hits WHERE (hit).tier <= p_max_tier
        ORDER BY (hit).tier, (hit).token_ratio DESC, (hit).recent_views DESC, (hit).name_length, (hit).product_id
        OFFSET p_offset LIMIT p_limit
    )
    SELECT (SELECT count(*) FROM hits WHERE (hit).tier <= p_max_tier),
           EXISTS (SELECT 1 FROM hits WHERE (hit).tier <= 2),
           coalesce((SELECT array_agg(p::product_search_ranked_match ORDER BY (hit).tier, (hit).token_ratio DESC,
                                     (hit).recent_views DESC, (hit).name_length, (hit).product_id) FROM page p),
                    ARRAY[]::product_search_ranked_match[])
$$;

-- 교정 시점은 명시적 필터/페이지와 무관한 전체 검색의 성공 여부다. 재검색도 같은 경로를 사용한다.
CREATE FUNCTION search_product_resolve(p_query text, p_offset bigint, p_limit int, p_max_tier int)
    RETURNS TABLE (total bigint, corrected_query text, matches product_search_ranked_match[])
    LANGUAGE plpgsql STABLE
AS $$
DECLARE
    original record;
    corrected record;
    correction text;
BEGIN
    IF p_offset IS NULL OR p_offset < 0 OR p_limit < 1 OR p_max_tier IS NULL OR p_max_tier NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION '페이지 조건이 올바르지 않다 (offset %, limit %, max_tier %).', p_offset, p_limit, p_max_tier;
    END IF;
    SELECT * INTO original FROM search_product_evidence_page(p_query, p_offset, p_limit, p_max_tier);
    IF NOT original.has_full_match THEN
        correction := search_correct_product_query_v2(p_query);
        IF search_norm(correction) <> search_norm(p_query) THEN
            SELECT * INTO corrected FROM search_product_evidence_page(correction, p_offset, p_limit, p_max_tier);
            IF corrected.total > 0 THEN
                RETURN QUERY SELECT corrected.total, correction, corrected.matches;
                RETURN;
            END IF;
        END IF;
    END IF;
    RETURN QUERY SELECT original.total, NULL::text, original.matches;
END
$$;

-- 기존 JSON 반환 계약에 내부 근거를 노출하지 않는다. 연관검색어는 resolve의 근거를 직접 사용한다.
CREATE OR REPLACE FUNCTION search_products_v2(p_query text, p_offset bigint DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3)
    RETURNS TABLE (total bigint, corrected_query text, items jsonb)
    LANGUAGE sql STABLE
AS $$
    WITH resolved AS MATERIALIZED (SELECT * FROM search_product_resolve(p_query, p_offset, p_limit, p_max_tier))
    SELECT total, corrected_query, coalesce((
        SELECT jsonb_agg(jsonb_build_object(
            'productId', (r.hit).product_id, 'rank', p_offset + r.position, 'tier', (r.hit).tier, 'tokenRatio', (r.hit).token_ratio,
            'recentViews', (r.hit).recent_views, 'matchField', (r.hit).match_field, 'matchText', (r.hit).match_text,
            'matchRange', CASE WHEN p_limit IS NOT NULL THEN to_jsonb(search_match_range((r.hit).match_text, (r.hit).match_query)) END
        ) ORDER BY r.position) FROM unnest(resolved.matches) WITH ORDINALITY r(hit, evidence, position)
    ), '[]'::jsonb) FROM resolved
$$;

-- 접두어 정책은 기존 literal/초성 구분을 유지한다. #930의 읽기 전체 일치 정책 변경은 포함하지 않는다.
CREATE FUNCTION search_product_related_prefix(p_evidence product_search_evidence) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH fields AS MATERIALIZED (SELECT * FROM unnest(p_evidence.fields) WHERE ord > 0),
    metadata AS (
        SELECT DISTINCT ON (m.text) m.text, m.ord FROM fields m
        WHERE m.field IN ('ATTRIBUTE_VALUE','MARK') AND NOT EXISTS (
            SELECT 1 FROM fields p WHERE p.ord = m.ord AND p.field = 'PRODUCT_NAME' AND p.literal_match)
        ORDER BY m.text, m.ord
    )
    SELECT CASE WHEN p_evidence.product_covers_query
        AND (SELECT count(DISTINCT ord) FROM fields WHERE field = 'PRODUCT_NAME') = cardinality(p_evidence.parts) - 1 THEN NULL
    ELSE coalesce(nullif(concat_ws(' ',
        CASE WHEN EXISTS (SELECT 1 FROM fields b WHERE b.field = 'BRAND_NAME' AND b.literal_match AND NOT EXISTS (
            SELECT 1 FROM fields p WHERE p.ord = b.ord AND p.field = 'PRODUCT_NAME' AND p.literal_match)) THEN p_evidence.brand_name END,
        (SELECT string_agg(text, ' ' ORDER BY ord, text) FROM metadata)
    ), ''), p_evidence.brand_name) END
$$;

-- 표시 문자열의 원문 범위만 계산한다. 브랜드 분할과 필드 일치는 근거를 재사용한다.
CREATE FUNCTION search_product_related_ranges(p_evidence product_search_evidence, p_keyword text, p_prefix text)
    RETURNS int[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH parts AS MATERIALIZED (SELECT * FROM unnest(p_evidence.parts)),
    whole AS (
        SELECT search_match_range(p_keyword, CASE WHEN has_spelling THEN search_product_match_piece(p_keyword, norm) ELSE norm END) AS range
        FROM parts WHERE ord = 0 AND (NOT has_spelling OR NOT EXISTS (SELECT 1 FROM parts WHERE ord > 0 AND NOT has_spelling))
    ), tokens AS (
        SELECT search_match_range(p_keyword, CASE WHEN has_spelling THEN search_product_match_piece(p_keyword, norm) ELSE raw END) AS range
        FROM parts WHERE ord > 0 ORDER BY norm, ord
    ), combined AS (
        SELECT search_match_range(p_prefix, CASE WHEN q.has_spelling THEN search_product_match_piece(p_prefix, (p_evidence.combination).brand_part)
                                                ELSE (p_evidence.combination).brand_part END) AS brand_range,
               search_match_range(p_evidence.product_name, CASE WHEN q.has_spelling THEN search_product_match_piece(p_evidence.product_name, (p_evidence.combination).product_part)
                                                               ELSE (p_evidence.combination).product_part END) AS name_range,
               search_utf16_index(p_keyword, length(p_prefix) + 1) AS gap
        FROM parts q WHERE q.ord = 0 AND p_prefix IS NOT NULL AND (p_evidence.combination).product_id IS NOT NULL
    )
    SELECT coalesce(
        (SELECT array[range] FROM whole WHERE range IS NOT NULL),
        (SELECT array_agg(range) FROM tokens WHERE range IS NOT NULL),
        (SELECT array[brand_range, array[name_range[1] + gap, name_range[2] + gap]] FROM combined WHERE brand_range IS NOT NULL AND name_range IS NOT NULL),
        array[array[0, search_utf16_index(p_keyword, length(p_prefix))]])
$$;

CREATE FUNCTION search_product_related_keywords(p_query text, p_limit int, p_max_length int)
    RETURNS TABLE (keyword text, match_ranges int[])
    LANGUAGE sql STABLE
AS $$
    WITH resolved AS MATERIALIZED (SELECT * FROM search_product_resolve(p_query, 0, p_limit, 2)),
    page AS (
        SELECT r.evidence, r.position FROM resolved, unnest(resolved.matches) WITH ORDINALITY r(hit, evidence, position)
    ), prefixed AS MATERIALIZED (
        SELECT evidence, position, search_product_related_prefix(evidence) AS prefix FROM page
    ), text AS (
        SELECT *, concat_ws(' ', prefix, (evidence).product_name) AS keyword FROM prefixed
    )
    SELECT keyword, search_product_related_ranges(evidence, keyword, prefix) FROM text
    WHERE search_utf16_index(keyword, length(keyword)) <= p_max_length ORDER BY position
$$;
