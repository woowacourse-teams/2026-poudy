-- #797: 입력 해석·조건 충족·순위를 분리하고 이름/속성/마크의 중복 토큰 판정을 제거한다.
-- 기존 공개 함수와 페이지 계약, 검색 문서 및 인덱스는 바꾸지 않는다.

-- ord=0은 전체 입력, ord>0은 중복을 제거한 필수 토큰이다.
CREATE OR REPLACE FUNCTION search_product_queries(p_query text)
    RETURNS TABLE (ord int, norm text, read text, is_chosung boolean, has_spelling boolean, chosung_contains text)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT 0, search_product_key(search_norm(p_query)),
           search_read_query(search_product_key(search_norm(p_query))),
           search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$',
           search_product_has_spelling(search_norm(p_query)),
           '%' || search_chosung_query(search_norm(p_query)) || '%'
    UNION ALL
    SELECT t.ord, t.norm, t.read, t.is_chosung, t.has_spelling, t.chosung_contains FROM search_product_query_tokens(p_query) t
$$;

CREATE OR REPLACE FUNCTION search_product_metadata_hits(p_query text)
    RETURNS TABLE (product_id bigint, field text, text text, query text, ord int, tier int, term_key text)
    LANGUAGE sql STABLE
AS $$
    WITH queries AS MATERIALIZED (
        SELECT * FROM search_product_queries(p_query)
    ), matched AS MATERIALIZED (
        SELECT m.*, q.ord, q.norm AS query, q.has_spelling,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) THEN 0
                        WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) || '%' THEN 1 ELSE 2 END
               ELSE
                   CASE WHEN m.norm IN (q.norm, q.read) OR m.read IN (q.norm, q.read) THEN 0
                        WHEN m.norm LIKE q.norm || '%' OR m.norm LIKE q.read || '%'
                          OR m.read LIKE q.norm || '%' OR m.read LIKE q.read || '%' THEN 1 ELSE 2 END
               END AS tier
        FROM queries q CROSS JOIN LATERAL (
            SELECT original.field, original.attribute_id, original.value_code, original.mark_code, original.text, original.chosung,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.norm) THEN search_product_key(original.norm) ELSE original.norm END AS norm,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.read) THEN search_product_key(original.read) ELSE original.read END AS read
            FROM product_search_metadata_term original
        ) m
        WHERE q.norm <> '' AND (
            m.norm LIKE '%' || q.norm || '%' OR m.norm LIKE '%' || q.read || '%'
            OR m.read LIKE '%' || q.norm || '%' OR m.read LIKE '%' || q.read || '%'
            OR (q.is_chosung AND m.chosung SIMILAR TO '%' || search_chosung_query(q.norm) || '%'))
    )
    SELECT p.product_id, m.field, m.text, CASE WHEN m.has_spelling THEN search_product_match_piece(m.text, m.query) ELSE m.query END, m.ord, m.tier,
           m.attribute_id::text || ':' || m.value_code
    FROM matched m JOIN product_attribute_value p
      ON p.attribute_id = m.attribute_id AND p.value_code = m.value_code
    WHERE m.field = 'ATTRIBUTE_VALUE'
    UNION ALL
    SELECT p.product_id, m.field, m.text, CASE WHEN m.has_spelling THEN search_product_match_piece(m.text, m.query) ELSE m.query END, m.ord, m.tier, m.mark_code::text
    FROM matched m JOIN product_mark p ON p.mark_code = m.mark_code
    WHERE m.field = 'MARK'
$$;

CREATE OR REPLACE FUNCTION search_product_hits(p_query text, p_include_metadata boolean)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$
    WITH queries AS MATERIALIZED (
        SELECT * FROM search_product_queries(p_query)
    ), tokens AS MATERIALIZED (
        SELECT * FROM queries WHERE ord > 0
    ), q AS MATERIALIZED (
        SELECT norm AS n, read AS r, has_spelling, is_chosung,
               search_chosung_query(norm) AS chosung_exact,
               search_chosung_query(norm) || '%' AS chosung_prefix,
               chosung_contains,
               (SELECT count(*) FROM tokens) AS token_count
        FROM queries WHERE ord = 0
    ), metadata AS MATERIALIZED (
        SELECT * FROM search_product_metadata_hits(p_query) WHERE p_include_metadata
    ), metadata_summary AS (
        SELECT product_id, min(tier) FILTER (WHERE ord = 0) AS whole_tier,
               array_agg(DISTINCT ord) FILTER (WHERE ord > 0) AS matched_ords
        FROM metadata GROUP BY product_id
    ), metadata_display AS (
        SELECT DISTINCT ON (product_id) product_id, field, text, query FROM metadata
        ORDER BY product_id, CASE field WHEN 'ATTRIBUTE_VALUE' THEN 0 ELSE 1 END,
                 length(query) DESC, ord, term_key COLLATE "C"
    ),
    -- 완성 표현을 검색할 때만 표준값을 사용한다. 부분 토큰은 원래 열로 비교한다.
    documents AS NOT MATERIALIZED (
        SELECT d.product_id, d.brand_id, d.product_name, d.brand_korean_name, d.brand_english_name,
               d.product_chosung, d.brand_chosung,
               CASE WHEN q.has_spelling THEN coalesce(d.product_key, d.product_norm) ELSE d.product_norm END AS product_norm,
               CASE WHEN q.has_spelling THEN coalesce(d.product_read_key, d.product_read) ELSE d.product_read END AS product_read,
               CASE WHEN q.has_spelling THEN coalesce(d.brand_key, d.brand_norm) ELSE d.brand_norm END AS brand_norm,
               CASE WHEN q.has_spelling THEN coalesce(d.brand_read_key, d.brand_read) ELSE d.brand_read END AS brand_read,
               CASE WHEN q.has_spelling THEN coalesce(d.brand_english_key, d.brand_english_norm) ELSE d.brand_english_norm END AS brand_english_norm,
               d.product_norm AS raw_product_norm, d.product_read AS raw_product_read,
               d.brand_norm AS raw_brand_norm, d.brand_read AS raw_brand_read, d.brand_english_norm AS raw_brand_english_norm
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
        SELECT b.brand_id, sp.tail AS product_part, search_read_query(sp.tail) AS product_read_part
        FROM brands b,
             split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.head
                         OR (length(sp.head) >= 2 AND b.brand_chosung LIKE sp.head || '%')
                     ELSE sp.head IN (b.brand_norm, b.brand_read, b.brand_english_norm)
                         OR (length(sp.head) >= 2 AND (b.brand_norm LIKE sp.head || '%'
                             OR b.brand_read LIKE sp.head || '%' OR b.brand_english_norm LIKE sp.head || '%')) END
        UNION
        SELECT b.brand_id, sp.head, search_read_query(sp.head)
        FROM brands b,
             split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.tail
                         OR (length(sp.tail) >= 2 AND b.brand_chosung LIKE sp.tail || '%')
                     ELSE sp.tail IN (b.brand_norm, b.brand_read, b.brand_english_norm)
                         OR (length(sp.tail) >= 2 AND (b.brand_norm LIKE sp.tail || '%'
                             OR b.brand_read LIKE sp.tail || '%' OR b.brand_english_norm LIKE sp.tail || '%')) END
    ),
    combined AS (
        SELECT DISTINCT ON (d.product_id) d.product_id, bs.product_part
        FROM brand_split bs
        JOIN documents d ON d.brand_id = bs.brand_id
        CROSS JOIN q
        WHERE CASE WHEN q.is_chosung THEN d.product_chosung LIKE '%' || bs.product_part || '%'
                   ELSE d.product_norm LIKE '%' || bs.product_part || '%' OR d.product_read LIKE '%' || bs.product_part || '%'
                        OR d.product_read LIKE '%' || bs.product_read_part || '%' END
        ORDER BY d.product_id, length(bs.product_part) DESC, bs.product_part COLLATE "C"
    ),
    candidate AS (
        SELECT d.product_id FROM product_search_document d, q
        WHERE q.n <> '' AND NOT q.has_spelling
          AND (d.doc_norm LIKE '%' || q.n || '%' OR d.doc_read LIKE '%' || q.r || '%')
        UNION
        SELECT d.product_id FROM product_search_document d, q
        WHERE q.n <> '' AND q.has_spelling
          AND (coalesce(d.doc_key, d.doc_norm) LIKE '%' || q.n || '%' OR coalesce(d.doc_read_key, d.doc_read) LIKE '%' || q.r || '%')
        UNION
        SELECT product_id FROM metadata
        UNION
        SELECT c.product_id FROM combined c
        UNION
        SELECT c.product_id FROM tokens t CROSS JOIN LATERAL (
            SELECT d.product_id FROM product_search_document d WHERE NOT t.has_spelling AND d.doc_norm LIKE '%' || t.norm || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE NOT t.has_spelling AND d.doc_read LIKE '%' || t.read || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE t.has_spelling AND coalesce(d.doc_key, d.doc_norm) LIKE '%' || t.norm || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE t.has_spelling AND coalesce(d.doc_read_key, d.doc_read) LIKE '%' || t.read || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE t.is_chosung AND d.doc_chosung SIMILAR TO t.chosung_contains
        ) c
    ),
    -- 비교값 선택은 이 준비 단계가 소유한다. 아래 판정은 원문/표준형을 다시 선택하지 않는다.
    token_values AS (
        SELECT d.product_id, t.*,
               CASE WHEN t.has_spelling THEN d.product_norm ELSE d.raw_product_norm END AS product_norm,
               CASE WHEN t.has_spelling THEN d.product_read ELSE d.raw_product_read END AS product_read,
               CASE WHEN t.has_spelling THEN d.brand_norm ELSE d.raw_brand_norm END AS brand_norm,
               CASE WHEN t.has_spelling THEN d.brand_read ELSE d.raw_brand_read END AS brand_read,
               CASE WHEN t.has_spelling THEN d.brand_english_norm ELSE d.raw_brand_english_norm END AS brand_english_norm,
               d.product_chosung, d.brand_chosung,
               coalesce(t.ord = ANY (ms.matched_ords), false) AS metadata_match
        FROM candidate c JOIN documents d ON d.product_id = c.product_id CROSS JOIN tokens t
        LEFT JOIN metadata_summary ms ON ms.product_id = d.product_id
    ), token_matches AS MATERIALIZED (
        SELECT product_id, norm, ord, metadata_match,
               (product_norm LIKE '%' || norm || '%' OR product_read LIKE '%' || read || '%'
                    OR (is_chosung AND product_chosung SIMILAR TO chosung_contains)) AS product_match,
               (brand_norm LIKE '%' || norm || '%' OR brand_read LIKE '%' || read || '%'
                    OR (is_chosung AND brand_chosung SIMILAR TO chosung_contains)) AS brand_match,
               (brand_english_norm LIKE '%' || norm || '%') AS english_match
        FROM token_values v
    ),
    token_summary AS (
        SELECT product_id,
               count(*) FILTER (WHERE product_match OR brand_match OR english_match) AS matched,
               count(*) FILTER (WHERE product_match OR brand_match OR english_match OR metadata_match) AS all_matched,
               (array_agg(norm ORDER BY length(norm) DESC, ord) FILTER (WHERE product_match))[1] AS product_token,
               (array_agg(norm ORDER BY length(norm) DESC, ord) FILTER (WHERE brand_match))[1] AS brand_token,
               (array_agg(norm ORDER BY length(norm) DESC, ord) FILTER (WHERE english_match))[1] AS english_token
        FROM token_matches GROUP BY product_id
    ),
    name_matches AS (
        SELECT d.*, q.token_count,
               CASE WHEN q.is_chosung THEN d.product_chosung SIMILAR TO q.chosung_contains
                    ELSE d.product_norm LIKE '%' || q.n || '%' OR d.product_norm LIKE '%' || q.r || '%'
                      OR d.product_read LIKE '%' || q.n || '%' OR d.product_read LIKE '%' || q.r || '%' END AS product_whole,
               CASE WHEN q.is_chosung THEN d.brand_chosung SIMILAR TO q.chosung_contains
                    ELSE d.brand_norm LIKE '%' || q.n || '%' OR d.brand_norm LIKE '%' || q.r || '%'
                      OR d.brand_read LIKE '%' || q.n || '%' OR d.brand_read LIKE '%' || q.r || '%' END AS brand_whole,
               coalesce(d.brand_english_norm LIKE '%' || q.n || '%' OR d.brand_english_norm LIKE '%' || q.r || '%', false) AS english_whole,
               coalesce(ts.matched, 0) AS matched,
               coalesce(ts.all_matched, 0) AS all_matched,
               cb.product_id IS NOT NULL AS combined,
               cb.product_part AS combined_part,
               q.n AS whole_query,
               ts.product_token,
               ts.brand_token,
               ts.english_token
        FROM candidate c
        JOIN documents d ON d.product_id = c.product_id
        LEFT JOIN combined cb ON cb.product_id = d.product_id
        LEFT JOIN token_summary ts ON ts.product_id = d.product_id
        CROSS JOIN q
    ),
    -- 결과 포함 여부를 먼저 판정한다. 기존 DB 호출의 부분 일치(tier=3)도 보존한다.
    eligibility AS (
        SELECT s.*, ms.whole_tier AS metadata_tier, ms.product_id IS NOT NULL AS metadata_hit,
               (s.matched > 0 OR s.combined OR (s.product_whole OR s.brand_whole OR s.english_whole)) AS name_hit,
               ((s.combined OR s.matched = s.token_count
                    OR s.product_whole OR s.brand_whole OR s.english_whole)
                AND (NOT q.has_spelling OR s.combined OR s.matched = s.token_count)) AS name_eligible
        FROM name_matches s CROSS JOIN q
        LEFT JOIN metadata_summary ms ON ms.product_id = s.product_id
    ), accepted AS (
        SELECT e.*,
               (name_eligible OR metadata_tier IS NOT NULL OR all_matched = token_count) AS eligible
        FROM eligibility e
        WHERE token_count > 0 AND (name_hit OR metadata_hit)
    ), rank_values AS (
        SELECT a.*,
               CASE WHEN a.product_whole IS NOT TRUE THEN 9 WHEN q.is_chosung THEN
                   CASE WHEN a.product_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN a.product_chosung SIMILAR TO q.chosung_prefix THEN 1
                        ELSE 2 END
               ELSE
                   CASE WHEN a.product_norm IN (q.n, q.r) OR a.product_read IN (q.n, q.r) THEN 0
                        WHEN a.product_norm LIKE q.n || '%' OR a.product_norm LIKE q.r || '%' OR a.product_read LIKE q.n || '%' OR a.product_read LIKE q.r || '%' THEN 1
                        ELSE 2 END
               END AS product_tier,
               CASE WHEN a.brand_whole IS NOT TRUE THEN 9 WHEN q.is_chosung THEN
                   CASE WHEN a.brand_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN a.brand_chosung SIMILAR TO q.chosung_prefix THEN 1
                        ELSE 2 END
               ELSE
                   CASE WHEN a.brand_norm IN (q.n, q.r) OR a.brand_read IN (q.n, q.r) THEN 0
                        WHEN a.brand_norm LIKE q.n || '%' OR a.brand_norm LIKE q.r || '%' OR a.brand_read LIKE q.n || '%' OR a.brand_read LIKE q.r || '%' THEN 1
                        ELSE 2 END
               END AS brand_tier,
               CASE WHEN a.english_whole IS NOT TRUE THEN 9 WHEN a.brand_english_norm IN (q.n, q.r) THEN 0
                    WHEN a.brand_english_norm LIKE q.n || '%' OR a.brand_english_norm LIKE q.r || '%' THEN 1
                    ELSE 2 END AS english_tier
        FROM accepted a CROSS JOIN q
    ), ranked AS (
        SELECT a.*,
               CASE WHEN eligible THEN least(
                   CASE WHEN name_eligible THEN least(product_tier, brand_tier, english_tier,
                        CASE WHEN combined THEN 2 ELSE 9 END, CASE WHEN matched = token_count THEN 2 ELSE 9 END)
                        ELSE 3 END,
                   coalesce(metadata_tier, 9), CASE WHEN all_matched = token_count THEN 2 ELSE 3 END)
                    ELSE 3 END::smallint AS tier,
               CASE WHEN name_eligible THEN CASE WHEN combined THEN 1 ELSE matched::real / token_count END
                    WHEN metadata_tier IS NOT NULL THEN 1 ELSE all_matched::real / token_count END::real AS token_ratio
        FROM rank_values a
    ), display AS (
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
        FROM ranked s LEFT JOIN metadata_display m ON m.product_id = s.product_id
    )
    SELECT h.product_id, h.tier, h.token_ratio,
           coalesce((SELECT sum(v.view_count) FROM product_daily_view v
                     WHERE v.product_id = h.product_id
                       AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                       AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date), 0)::bigint,
           length(h.raw_product_norm), h.match_field, h.match_text,
           CASE WHEN h.name_hit AND q.has_spelling THEN search_product_match_piece(h.match_text, h.match_query)
                ELSE h.match_query END
    FROM display h CROSS JOIN q
$$;

-- 구버전은 이름만, 현재 버전은 실제 연결된 속성/마크까지 같은 본체에서 판정한다.
CREATE OR REPLACE FUNCTION search_products_core(p_query text)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$ SELECT * FROM search_product_hits(p_query, false) $$;

CREATE OR REPLACE FUNCTION search_products_core_v2(p_query text)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$ SELECT * FROM search_product_hits(p_query, true) $$;
