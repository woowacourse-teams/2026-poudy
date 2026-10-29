-- 표시명과 정책은 서버 코드가 소유한다. DB에는 코드와 제품 연결만 남긴다.
DROP VIEW product_search_metadata_term;
DROP VIEW product_mark;
DROP VIEW mark;

INSERT INTO badge(code, name)
SELECT code, code FROM unnest(ARRAY['MINERAL','ORGANIC','HYBRID','EASY_WASH','WATERPROOF','DAISO']) code
ON CONFLICT (code) DO NOTHING;
INSERT INTO product_badge(product_id, badge_code, created_at, updated_at)
SELECT product_id, value_code, created_at, updated_at FROM product_attribute_value
ON CONFLICT (product_id, badge_code) DO NOTHING;

DROP FUNCTION require_attribute_write_isolation() CASCADE;
DROP FUNCTION validate_product_attribute_scope() CASCADE;
DROP FUNCTION reject_attribute_truncate() CASCADE;
DROP FUNCTION touch_attribute_updated_at() CASCADE;
DROP FUNCTION touch_attribute_products() CASCADE;
DROP TABLE product_attribute_value;
DROP TABLE category_attribute;
DROP TABLE attribute_value;
DROP TABLE attribute;

ALTER TABLE badge RENAME TO mark;
ALTER TABLE product_badge RENAME TO product_mark;
ALTER TABLE product_mark RENAME COLUMN badge_code TO mark_code;
DROP TRIGGER seo_stamp ON mark;
DROP TRIGGER seo_related ON mark;
ALTER TABLE mark DROP COLUMN name, DROP COLUMN created_at, DROP COLUMN updated_at;
ALTER TABLE mark RENAME CONSTRAINT pk_badge TO pk_mark;
ALTER TABLE product_mark RENAME CONSTRAINT pk_product_badge TO pk_product_mark;
ALTER TABLE product_mark RENAME CONSTRAINT fk_product_badge_product TO fk_product_mark_product;
ALTER TABLE product_mark RENAME CONSTRAINT fk_product_badge_badge TO fk_product_mark_mark;
ALTER INDEX ix_product_badge_badge_product RENAME TO ix_product_mark_mark_product;

DROP FUNCTION search_products_v2(text,bigint,integer,integer);
DROP FUNCTION search_products_page_v2(text,bigint,integer,integer);
DROP FUNCTION search_products_core_v2(text);
DROP FUNCTION search_product_hits(text,boolean);
DROP FUNCTION search_product_metadata_hits(text);
DROP FUNCTION search_correct_product_query_v2(text);

CREATE FUNCTION product_search_metadata_terms(p_marks jsonb)
    RETURNS TABLE (field text, mark_code text, text text, norm text, read text, chosung text)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT 'MARK', m.code, m.name, search_norm(m.name), search_reading_name(m.name),
           search_chosung(search_reading_name(m.name))
    FROM jsonb_to_recordset(p_marks) m(code text, name text)
$$;

CREATE FUNCTION search_product_metadata_hits(p_query text, p_marks jsonb DEFAULT '[]'::jsonb)
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
            SELECT original.field, original.mark_code, original.text, original.chosung,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.norm) THEN search_product_key(original.norm) ELSE original.norm END AS norm,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.read) THEN search_product_key(original.read) ELSE original.read END AS read
            FROM product_search_metadata_terms(p_marks) original
        ) m
        WHERE q.norm <> '' AND (
            m.norm LIKE '%' || q.norm || '%' OR m.norm LIKE '%' || q.read || '%'
            OR m.read LIKE '%' || q.norm || '%' OR m.read LIKE '%' || q.read || '%'
            OR (q.is_chosung AND m.chosung SIMILAR TO '%' || search_chosung_query(q.norm) || '%'))
    )
    SELECT p.product_id, m.field, m.text, CASE WHEN m.has_spelling THEN search_product_match_piece(m.text, m.query) ELSE m.query END, m.ord, m.tier, m.mark_code::text
    FROM matched m JOIN product_mark p ON p.mark_code = m.mark_code
    WHERE m.field = 'MARK'
$$;


CREATE FUNCTION search_product_hits(p_query text, p_include_metadata boolean, p_marks jsonb DEFAULT '[]'::jsonb)
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
        SELECT * FROM search_product_metadata_hits(p_query, p_marks) WHERE p_include_metadata
    ), metadata_summary AS (
        SELECT product_id, min(tier) FILTER (WHERE ord = 0) AS whole_tier,
               array_agg(DISTINCT ord) FILTER (WHERE ord > 0) AS matched_ords
        FROM metadata GROUP BY product_id
    ), metadata_display AS (
        SELECT DISTINCT ON (product_id) product_id, field, text, query FROM metadata
        ORDER BY product_id, length(query) DESC, ord, term_key COLLATE "C"
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
        SELECT b.brand_id, sp.tail AS product_part, search_read_query(sp.tail) AS product_read_part, true AS brand_first,
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
        SELECT b.brand_id, sp.head, search_read_query(sp.head), false,
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
        SELECT DISTINCT ON (d.product_id) d.product_id, bs.product_part,
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
               cb.combined_tier,
               cb.combined_ratio,
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
                        coalesce(combined_tier, 9), CASE WHEN matched = token_count THEN 2 ELSE 9 END)
                        ELSE 3 END,
                   coalesce(metadata_tier, 9), CASE WHEN all_matched = token_count THEN 2 ELSE 3 END)
                    ELSE 3 END::smallint AS tier,
               CASE WHEN name_eligible THEN CASE WHEN combined THEN greatest(combined_ratio, matched::real / token_count)
                                                 ELSE matched::real / token_count END
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

CREATE OR REPLACE FUNCTION search_products_core(p_query text)
    RETURNS SETOF product_search_hit LANGUAGE sql STABLE
AS $$ SELECT * FROM search_product_hits(p_query, false, '[]'::jsonb) $$;

CREATE FUNCTION search_products_core_v2(p_query text, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_hit LANGUAGE sql STABLE
AS $$ SELECT * FROM search_product_hits(p_query, true, p_marks) $$;

SELECT similarity('warmup', 'warmup');

CREATE FUNCTION search_correct_product_query_v2(p_query text, p_marks jsonb DEFAULT '[]'::jsonb) RETURNS text
    LANGUAGE sql STABLE
    SET pg_trgm.similarity_threshold = 0.5
AS $$
    WITH live_terms AS MATERIALIZED (
        SELECT m.* FROM product_search_metadata_terms(p_marks) m
        WHERE EXISTS (SELECT 1 FROM product_mark p WHERE p.mark_code = m.mark_code)
    ), vocabulary AS MATERIALIZED (
        SELECT v.norm, v.term, v.jamo, v.frequency FROM search_vocabulary v WHERE v.domain = 'PRODUCT'
        UNION ALL
        SELECT t.norm, t.raw, t.jamo, count(*) FROM live_terms m
        CROSS JOIN LATERAL search_query_tokens(m.text) t
        WHERE length(t.norm) >= 2 GROUP BY t.norm, t.raw, t.jamo
    ), tokens AS (
        SELECT t.*,
               t.is_chosung OR length(t.norm) < 3 OR search_product_has_spelling(t.norm)
               OR EXISTS (SELECT 1 FROM product_search_document d
                   WHERE d.product_norm LIKE '%' || t.norm || '%' OR d.product_read LIKE '%' || t.read || '%'
                      OR d.brand_norm LIKE '%' || t.norm || '%' OR d.brand_read LIKE '%' || t.read || '%'
                      OR d.brand_english_norm LIKE '%' || t.norm || '%')
               -- 연결이 없어도 알려진 표시명을 다른 값으로 교정하지 않는다.
               -- 교정 후보와 실제 검색 결과는 계속 연결된 정의만 사용한다.
               OR EXISTS (SELECT 1 FROM product_search_metadata_terms(p_marks) m
                   WHERE m.norm LIKE '%' || t.norm || '%' OR m.read LIKE '%' || t.read || '%') AS keep
        FROM search_query_tokens(p_query) t
    )
    SELECT string_agg(coalesce(c.term, t.raw), ' ' ORDER BY t.ord)
    FROM tokens t LEFT JOIN LATERAL (
        SELECT v.term FROM vocabulary v WHERE NOT t.keep AND v.jamo % t.jamo
        ORDER BY similarity(v.jamo, t.jamo) DESC, v.frequency DESC, v.norm COLLATE "C", v.term COLLATE "C"
        LIMIT 1
    ) c ON true
$$;

CREATE FUNCTION search_products_page_v2(p_query text, p_offset bigint, p_limit int, p_max_tier int, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, has_full_match boolean, items jsonb)
    LANGUAGE sql STABLE
AS $$
    WITH h AS MATERIALIZED (
        SELECT * FROM search_products_core_v2(p_query, p_marks)
    ), page AS (
        SELECT h.* FROM h WHERE h.tier <= p_max_tier
        ORDER BY h.tier, h.token_ratio DESC, h.recent_views DESC, h.name_length, h.product_id
        OFFSET p_offset LIMIT p_limit
    )
    SELECT (SELECT count(*) FROM h WHERE h.tier <= p_max_tier),
           coalesce((SELECT bool_or(h.tier <= 2) FROM h), false),
           coalesce((
               SELECT jsonb_agg(jsonb_build_object(
                          'productId', r.product_id, 'rank', r.rank, 'tier', r.tier, 'tokenRatio', r.token_ratio,
                          'recentViews', r.recent_views, 'matchField', r.match_field, 'matchText', r.match_text,
                          'matchRange', CASE WHEN p_limit IS NOT NULL THEN to_jsonb(search_match_range(r.match_text, r.match_query)) END)
                      ORDER BY r.rank)
               FROM (SELECT page.*, p_offset + row_number() OVER (
                                 ORDER BY page.tier, page.token_ratio DESC, page.recent_views DESC, page.name_length, page.product_id) AS rank
                     FROM page) r
           ), '[]'::jsonb)
$$;

CREATE FUNCTION search_products_v2(p_query text, p_offset bigint DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, corrected_query text, items jsonb)
    LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_page record;
    v_corrected_page record;
    v_corrected text;
BEGIN
    IF p_offset IS NULL OR p_offset < 0 OR p_limit < 1 OR p_max_tier IS NULL OR p_max_tier NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION '페이지 조건이 올바르지 않다 (offset %, limit %, max_tier %).', p_offset, p_limit, p_max_tier;
    END IF;

    SELECT * INTO v_page FROM search_products_page_v2(p_query, p_offset, p_limit, p_max_tier, p_marks);
    IF NOT v_page.has_full_match THEN
        v_corrected := search_correct_product_query_v2(p_query, p_marks);
        IF search_norm(v_corrected) <> search_norm(p_query) THEN
            SELECT * INTO v_corrected_page FROM search_products_page_v2(v_corrected, p_offset, p_limit, p_max_tier, p_marks);
            IF v_corrected_page.total > 0 THEN
                RETURN QUERY SELECT v_corrected_page.total, v_corrected, v_corrected_page.items;
                RETURN;
            END IF;
        END IF;
    END IF;
    RETURN QUERY SELECT v_page.total, NULL::text, v_page.items;
END
$$;

-- 제품 마크 변경도 연결된 콘텐츠 수정 시각에 전파한다.
CREATE OR REPLACE FUNCTION seo_touch_related_content() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_row jsonb := to_jsonb(OLD);
    new_row jsonb := to_jsonb(NEW);
    ids bigint[];
    codes text[];
BEGIN
    IF TG_OP = 'UPDATE' AND (old_row - 'updated_at' - 'created_at' - 'is_sensitive_skin')
        IS NOT DISTINCT FROM (new_row - 'updated_at' - 'created_at' - 'is_sensitive_skin') THEN RETURN NULL; END IF;

    IF TG_TABLE_NAME IN ('product_variant', 'product_component',
        'product_mark') THEN
        ids := ARRAY[(old_row->>'product_id')::bigint, (new_row->>'product_id')::bigint];
        PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE id = ANY(ids)));
        IF TG_TABLE_NAME = 'product_component' THEN
            PERFORM seo_touch_ingredients(ARRAY(SELECT ingredient_id FROM product_ingredient
                WHERE component_id IN ((old_row->>'id')::bigint, (new_row->>'id')::bigint)));
        END IF;
    ELSIF TG_TABLE_NAME IN ('product_ingredient', 'product_similarity') THEN
        ids := ARRAY[(old_row->>'component_id')::bigint, (new_row->>'component_id')::bigint];
        PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE id IN (SELECT product_id FROM product_component WHERE id = ANY(ids))));
        IF TG_TABLE_NAME = 'product_ingredient' THEN
            PERFORM seo_touch_ingredients(ARRAY[(old_row->>'ingredient_id')::bigint, (new_row->>'ingredient_id')::bigint]);
        END IF;
    ELSIF TG_TABLE_NAME IN ('ingredient_alias', 'ingredient_source', 'ingredient_tag', 'ingredient_group_ingredient') THEN
        PERFORM seo_touch_ingredients(ARRAY[(old_row->>'ingredient_id')::bigint, (new_row->>'ingredient_id')::bigint]);
    ELSIF TG_TABLE_NAME = 'ingredient' THEN
        PERFORM seo_touch_ingredients(ARRAY[(new_row->>'id')::bigint]);
    ELSIF TG_TABLE_NAME = 'tag' THEN
        codes := ARRAY[old_row->>'code', new_row->>'code'];
        PERFORM seo_touch_ingredients(ARRAY(SELECT ingredient_id FROM ingredient_tag WHERE tag_code = ANY(codes)));
    ELSIF TG_TABLE_NAME = 'ingredient_group' THEN
        codes := ARRAY[old_row->>'code', new_row->>'code'];
        PERFORM seo_touch_ingredients(ARRAY(SELECT ingredient_id FROM ingredient_group_ingredient WHERE group_code = ANY(codes)));
    ELSIF TG_TABLE_NAME IN ('brand', 'category', 'manufacturer') THEN
        ids := ARRAY[(old_row->>'id')::bigint, (new_row->>'id')::bigint];
        IF TG_TABLE_NAME = 'brand' THEN
            PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE brand_id = ANY(ids)));
        ELSIF TG_TABLE_NAME = 'manufacturer' THEN
            PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE manufacturer_id = ANY(ids)));
        ELSE
            PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE category_id IN (SELECT id FROM category WHERE id = ANY(ids) OR parent_id = ANY(ids))));
        END IF;
    ELSIF TG_TABLE_NAME = 'product' THEN
        PERFORM seo_touch_products(ARRAY[(new_row->>'id')::bigint]);
        -- 다른 브랜드·카테고리로 옮긴 제품은 이전 목록에서도 사라진 시각을 남긴다.
        IF TG_OP = 'INSERT' OR old_row->>'brand_id' IS DISTINCT FROM new_row->>'brand_id'
            OR old_row->>'category_id' IS DISTINCT FROM new_row->>'category_id' THEN
            UPDATE brand SET updated_at = greatest(updated_at, statement_timestamp() AT TIME ZONE 'Asia/Seoul')
            WHERE id IN ((old_row->>'brand_id')::bigint, (new_row->>'brand_id')::bigint);
            UPDATE category SET updated_at = greatest(updated_at, statement_timestamp() AT TIME ZONE 'Asia/Seoul')
            WHERE id IN (SELECT id FROM category WHERE id IN ((old_row->>'category_id')::bigint, (new_row->>'category_id')::bigint)
                OR id IN (SELECT parent_id FROM category WHERE id IN ((old_row->>'category_id')::bigint, (new_row->>'category_id')::bigint)));
        END IF;
    END IF;
    RETURN NULL;
END $$;
