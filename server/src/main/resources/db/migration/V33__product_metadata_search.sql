-- 기존 검색 함수는 구버전 서버의 matchField 계약을 위해 유지한다.
-- 정의는 먼저 매칭하고, 실제 제품 연결은 조회 시점에 확인한다.
CREATE VIEW product_search_metadata_term AS
SELECT 'ATTRIBUTE_VALUE'::text AS field, av.attribute_id, av.value_code,
       NULL::varchar AS mark_code, av.name AS text,
       search_norm(av.name) AS norm, search_reading_name(av.name) AS read,
       search_chosung(search_reading_name(av.name)) AS chosung
FROM attribute_value av
UNION ALL
SELECT 'MARK', NULL::bigint, NULL::varchar, m.code, m.name,
       search_norm(m.name), search_reading_name(m.name),
       search_chosung(search_reading_name(m.name))
FROM mark m;

CREATE FUNCTION search_product_metadata_hits(p_query text)
    RETURNS TABLE (product_id bigint, field text, text text, query text, ord int, tier int, term_key text)
    LANGUAGE sql STABLE
AS $$
    WITH queries AS MATERIALIZED (
        SELECT 0 AS ord, search_norm(p_query) AS norm,
               search_read_query(search_norm(p_query)) AS read,
               search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung
        UNION ALL
        SELECT t.ord, t.norm, t.read, t.is_chosung FROM search_query_tokens(p_query) t
    ), matched AS MATERIALIZED (
        SELECT m.*, q.ord, q.norm AS query,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) THEN 0
                        WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) || '%' THEN 1 ELSE 2 END
               ELSE
                   CASE WHEN m.norm IN (q.norm, q.read) OR m.read IN (q.norm, q.read) THEN 0
                        WHEN m.norm LIKE q.norm || '%' OR m.norm LIKE q.read || '%'
                          OR m.read LIKE q.norm || '%' OR m.read LIKE q.read || '%' THEN 1 ELSE 2 END
               END AS tier
        FROM product_search_metadata_term m CROSS JOIN queries q
        WHERE q.norm <> '' AND (
            m.norm LIKE '%' || q.norm || '%' OR m.norm LIKE '%' || q.read || '%'
            OR m.read LIKE '%' || q.norm || '%' OR m.read LIKE '%' || q.read || '%'
            OR (q.is_chosung AND m.chosung SIMILAR TO '%' || search_chosung_query(q.norm) || '%'))
    )
    SELECT p.product_id, m.field, m.text, m.query, m.ord, m.tier,
           m.attribute_id::text || ':' || m.value_code
    FROM matched m JOIN product_attribute_value p
      ON p.attribute_id = m.attribute_id AND p.value_code = m.value_code
    WHERE m.field = 'ATTRIBUTE_VALUE'
    UNION ALL
    SELECT p.product_id, m.field, m.text, m.query, m.ord, m.tier, m.mark_code::text
    FROM matched m JOIN product_mark p ON p.mark_code = m.mark_code
    WHERE m.field = 'MARK'
$$;

CREATE FUNCTION search_products_core_v2(p_query text)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$
    WITH names AS MATERIALIZED (
        SELECT * FROM search_products_core(p_query)
    ), metadata AS MATERIALIZED (
        SELECT * FROM search_product_metadata_hits(p_query)
    ), metadata_summary AS (
        SELECT product_id, min(tier) FILTER (WHERE ord = 0) AS whole_tier,
               array_agg(DISTINCT ord) FILTER (WHERE ord > 0) AS matched_ords
        FROM metadata GROUP BY product_id
    ), metadata_display AS (
        SELECT DISTINCT ON (product_id) product_id, field, text, query FROM metadata
        ORDER BY product_id, CASE field WHEN 'ATTRIBUTE_VALUE' THEN 0 ELSE 1 END,
                 length(query) DESC, ord, term_key COLLATE "C"
    ), tokens AS MATERIALIZED (
        SELECT * FROM search_query_tokens(p_query)
    ), candidates AS (
        SELECT product_id FROM names UNION SELECT product_id FROM metadata
    ), scored AS MATERIALIZED (
        SELECT d.*, n.tier AS name_tier, n.token_ratio AS name_ratio,
               n.recent_views, n.match_field, n.match_text, n.match_query,
               (SELECT count(*) FROM tokens) AS token_count,
               (SELECT count(*) FROM tokens t
                WHERE d.product_norm LIKE '%' || t.norm || '%' OR d.product_read LIKE '%' || t.read || '%'
                   OR d.brand_norm LIKE '%' || t.norm || '%' OR d.brand_read LIKE '%' || t.read || '%'
                   OR d.brand_english_norm LIKE '%' || t.norm || '%'
                   OR (t.is_chosung AND (d.product_chosung SIMILAR TO t.chosung_contains
                                        OR d.brand_chosung SIMILAR TO t.chosung_contains))
                   OR t.ord = ANY (ms.matched_ords)) AS matched,
               ms.whole_tier AS metadata_tier
        FROM candidates c JOIN product_search_document d ON d.product_id = c.product_id
        LEFT JOIN names n ON n.product_id = d.product_id
        LEFT JOIN metadata_summary ms ON ms.product_id = d.product_id
    )
    SELECT s.product_id,
           least(coalesce(s.name_tier, 9), coalesce(s.metadata_tier, 9),
                 CASE WHEN s.matched = s.token_count THEN 2 ELSE 3 END)::smallint,
           CASE WHEN s.name_tier <= 2 THEN s.name_ratio
                WHEN s.metadata_tier IS NOT NULL THEN 1 ELSE s.matched::real / s.token_count END::real,
           coalesce(s.recent_views, (SELECT coalesce(sum(v.view_count), 0) FROM product_daily_view v
                     WHERE v.product_id = s.product_id
                       AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                       AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date))::bigint,
           length(s.product_norm),
           coalesce(s.match_field, m.field), coalesce(s.match_text, m.text), coalesce(s.match_query, m.query)
    FROM scored s
    LEFT JOIN metadata_display m ON m.product_id = s.product_id
    WHERE s.token_count > 0
$$;

-- 새 표시명과 연결은 실시간으로 읽는다. 성분 교정과 기존 어휘 뷰는 변경하지 않는다.
SELECT similarity('warmup', 'warmup');

CREATE FUNCTION search_correct_product_query_v2(p_query text) RETURNS text
    LANGUAGE sql STABLE
    SET pg_trgm.similarity_threshold = 0.5
AS $$
    WITH live_terms AS MATERIALIZED (
        SELECT m.* FROM product_search_metadata_term m
        WHERE (m.field = 'ATTRIBUTE_VALUE' AND EXISTS (
            SELECT 1 FROM product_attribute_value p
            WHERE p.attribute_id = m.attribute_id AND p.value_code = m.value_code))
           OR (m.field = 'MARK' AND EXISTS (SELECT 1 FROM product_mark p WHERE p.mark_code = m.mark_code))
    ), vocabulary AS MATERIALIZED (
        SELECT v.norm, v.term, v.jamo, v.frequency FROM search_vocabulary v WHERE v.domain = 'PRODUCT'
        UNION ALL
        SELECT t.norm, t.raw, t.jamo, count(*) FROM live_terms m
        CROSS JOIN LATERAL search_query_tokens(m.text) t
        WHERE length(t.norm) >= 2 GROUP BY t.norm, t.raw, t.jamo
    ), tokens AS (
        SELECT t.*,
               t.is_chosung OR length(t.norm) < 3
               OR EXISTS (SELECT 1 FROM product_search_document d
                   WHERE d.product_norm LIKE '%' || t.norm || '%' OR d.product_read LIKE '%' || t.read || '%'
                      OR d.brand_norm LIKE '%' || t.norm || '%' OR d.brand_read LIKE '%' || t.read || '%'
                      OR d.brand_english_norm LIKE '%' || t.norm || '%')
               -- 연결이 없어도 알려진 표시명을 다른 값으로 교정하지 않는다.
               -- 교정 후보와 실제 검색 결과는 계속 연결된 정의만 사용한다.
               OR EXISTS (SELECT 1 FROM product_search_metadata_term m
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

CREATE FUNCTION search_products_page_v2(p_query text, p_offset bigint, p_limit int, p_max_tier int)
    RETURNS TABLE (total bigint, has_full_match boolean, items jsonb)
    LANGUAGE sql STABLE
AS $$
    WITH h AS MATERIALIZED (
        SELECT * FROM search_products_core_v2(p_query)
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

CREATE FUNCTION search_products_v2(p_query text, p_offset bigint DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3)
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

    SELECT * INTO v_page FROM search_products_page_v2(p_query, p_offset, p_limit, p_max_tier);
    IF NOT v_page.has_full_match THEN
        v_corrected := search_correct_product_query_v2(p_query);
        IF search_norm(v_corrected) <> search_norm(p_query) THEN
            SELECT * INTO v_corrected_page FROM search_products_page_v2(v_corrected, p_offset, p_limit, p_max_tier);
            IF v_corrected_page.total > 0 THEN
                RETURN QUERY SELECT v_corrected_page.total, v_corrected, v_corrected_page.items;
                RETURN;
            END IF;
        END IF;
    END IF;
    RETURN QUERY SELECT v_page.total, NULL::text, v_page.items;
END
$$;
