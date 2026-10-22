-- #797: 상품 검색용 표준형. 기존 정규화·원문·공유 매칭·성분 검색은 유지한다.

-- 상품 검색 전용 완성 표기 [대체 표기, 표준형]. search_norm() 결과를 등록한다.
-- 규칙 변경 후 product_search_document를 REFRESH해 표준값과 인덱스를 함께 갱신한다.
CREATE FUNCTION search_product_spelling_rules() RETURNS text[][]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN ARRAY[['썬크림', '선크림']];

CREATE FUNCTION search_product_key(p_normalized text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE COST 1
    SET search_path FROM CURRENT
AS $$
DECLARE
    rule text[];
    result text := p_normalized;
BEGIN
    FOREACH rule SLICE 1 IN ARRAY search_product_spelling_rules()
    LOOP
        result := replace(result, rule[1], rule[2]);
    END LOOP;
    RETURN result;
END
$$;

-- 등록 값은 정규화된 글자뿐이다. 이 정규식은 완성 표현의 존재 확인에만 쓴다.
-- 실제 상품 판정은 저장된 표준값에 기존 = / LIKE를 적용한다.
CREATE FUNCTION search_product_has_spelling(p_normalized text) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN coalesce(p_normalized ~ ANY(search_product_spelling_rules()), false);

CREATE FUNCTION search_product_query_tokens(p_query text)
    RETURNS TABLE (ord int, raw text, norm text, read text, jamo text, is_chosung boolean,
                   chosung_contains text, has_spelling boolean)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH recognized AS MATERIALIZED (
        SELECT t.*, search_product_has_spelling(t.norm) AS has_spelling FROM search_query_tokens(p_query) t
    ), standardized AS MATERIALIZED (
        SELECT t.ord, t.raw, CASE WHEN t.has_spelling THEN search_product_key(t.norm) ELSE t.norm END AS norm,
               t.read, t.jamo, t.is_chosung, t.chosung_contains, t.has_spelling FROM recognized t
    )
    SELECT DISTINCT ON (t.norm) t.ord, t.raw, t.norm,
           CASE WHEN t.has_spelling THEN search_read_query(t.norm) ELSE t.read END,
           t.jamo, t.is_chosung, t.chosung_contains, t.has_spelling
    FROM standardized t ORDER BY t.norm, t.ord
$$;

-- 표준형으로 찾은 조각을 실제 원문의 조각으로 되돌린다. 기존 page의 UTF-16 범위 계산은 재사용한다.
CREATE FUNCTION search_product_match_piece(p_text text, p_piece text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
AS $$
DECLARE
    form text;
    needle text := search_product_key(search_norm(p_piece));
    standardized text;
    position int;
    start_offset int;
    end_offset int;
    same_length boolean := true;
    rule text[];
BEGIN
    FOREACH rule SLICE 1 IN ARRAY search_product_spelling_rules()
    LOOP
        same_length := same_length AND length(rule[1]) = length(rule[2]);
    END LOOP;
    FOREACH form IN ARRAY ARRAY[search_norm(p_text), search_reading_name(p_text)]
    LOOP
        IF strpos(form, needle) > 0 THEN RETURN p_piece; END IF;
        standardized := search_product_key(form);
        position := strpos(standardized, needle);
        IF position = 0 THEN CONTINUE; END IF;
        IF same_length THEN RETURN substr(form, position, length(needle)); END IF;
        -- 길이가 다른 완성 표기를 추가해도 원문 위치는 표준형의 문자 수로 추측하지 않는다.
        WITH prefixes AS MATERIALIZED (
            SELECT i, search_product_key(left(form, i)) AS value
            FROM generate_series(0, length(form)) g(i)
        ), boundaries AS (
            SELECT i, length(value) AS size FROM prefixes
            WHERE value = left(standardized, length(value))
        )
        SELECT max(i) FILTER (WHERE size <= position - 1),
               max(i) FILTER (WHERE size = (SELECT min(size) FROM boundaries
                                           WHERE size >= position - 1 + length(needle)))
        INTO start_offset, end_offset FROM boundaries;
        IF start_offset IS NOT NULL AND end_offset > start_offset THEN
            RETURN substr(form, start_offset + 1, end_offset - start_offset);
        END IF;
    END LOOP;
    RETURN p_piece;
END
$$;


-- MV는 열 추가를 지원하지 않아 재생성한다. 기존 열·소유자·접근 권한을 보존하고 CASCADE는 사용하지 않는다.
DO $migration$
DECLARE
    owner_id oid;
    owner_name text;
    permissions aclitem[];
    permission record;
BEGIN
    SELECT relowner, pg_get_userbyid(relowner), relacl INTO owner_id, owner_name, permissions
    FROM pg_class WHERE oid = 'product_search_document'::regclass;
    DROP MATERIALIZED VIEW product_search_document;
CREATE MATERIALIZED VIEW product_search_document AS
SELECT d.*,
       nullif(search_product_key(d.product_norm), d.product_norm) AS product_key,
       nullif(search_product_key(d.product_read), d.product_read) AS product_read_key,
       nullif(search_product_key(d.brand_norm), d.brand_norm) AS brand_key,
       nullif(search_product_key(d.brand_read), d.brand_read) AS brand_read_key,
       nullif(search_product_key(d.brand_english_norm), d.brand_english_norm) AS brand_english_key,
       nullif(search_product_key(d.doc_norm), d.doc_norm) AS doc_key,
       nullif(search_product_key(d.doc_read), d.doc_read) AS doc_read_key
FROM (
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
       search_chosung(search_reading_name(b.korean_name) || search_reading_name(p.product_name)) AS doc_chosung
FROM product p
JOIN brand b ON b.id = p.brand_id
) d;
    EXECUTE format('ALTER MATERIALIZED VIEW product_search_document OWNER TO %I', owner_name);
    FOR permission IN SELECT * FROM aclexplode(permissions) WHERE grantee <> owner_id
    LOOP
        EXECUTE format('GRANT %s ON TABLE product_search_document TO %s%s', permission.privilege_type,
            CASE WHEN permission.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(permission.grantee)) END,
            CASE WHEN permission.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
    END LOOP;
END
$migration$;

CREATE INDEX ix_product_search_document_norm ON product_search_document USING gin (doc_norm gin_trgm_ops);
CREATE INDEX ix_product_search_document_read ON product_search_document USING gin (doc_read gin_trgm_ops);
CREATE INDEX ix_product_search_document_chosung ON product_search_document USING gin (doc_chosung gin_trgm_ops);
CREATE INDEX ix_product_search_document_key ON product_search_document USING gin (coalesce(doc_key, doc_norm) gin_trgm_ops);
CREATE INDEX ix_product_search_document_read_key ON product_search_document USING gin (coalesce(doc_read_key, doc_read) gin_trgm_ops);


CREATE OR REPLACE FUNCTION search_products_core(p_query text)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$
    WITH tokens AS MATERIALIZED (
        SELECT * FROM search_product_query_tokens(p_query)
    ), q AS MATERIALIZED (
        SELECT search_product_key(search_norm(p_query)) AS n,
               search_read_query(search_product_key(search_norm(p_query))) AS r,
               search_product_has_spelling(search_norm(p_query)) AS has_spelling,
               search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung,
               search_chosung_query(search_norm(p_query)) AS chosung_exact,
               search_chosung_query(search_norm(p_query)) || '%' AS chosung_prefix,
               '%' || search_chosung_query(search_norm(p_query)) || '%' AS chosung_contains,
               (SELECT count(*) FROM tokens) AS token_count
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
    token_matches AS MATERIALIZED (
        SELECT d.product_id, t.norm, t.ord,
               ((CASE WHEN t.has_spelling THEN d.product_norm ELSE d.raw_product_norm END) LIKE '%' || t.norm || '%'
                    OR (CASE WHEN t.has_spelling THEN d.product_read ELSE d.raw_product_read END) LIKE '%' || t.read || '%'
                    OR (t.is_chosung AND d.product_chosung SIMILAR TO t.chosung_contains)) AS product_match,
               ((CASE WHEN t.has_spelling THEN d.brand_norm ELSE d.raw_brand_norm END) LIKE '%' || t.norm || '%'
                    OR (CASE WHEN t.has_spelling THEN d.brand_read ELSE d.raw_brand_read END) LIKE '%' || t.read || '%'
                    OR (t.is_chosung AND d.brand_chosung SIMILAR TO t.chosung_contains)) AS brand_match,
               ((CASE WHEN t.has_spelling THEN d.brand_english_norm ELSE d.raw_brand_english_norm END) LIKE '%' || t.norm || '%') AS english_match
        FROM candidate c JOIN documents d ON d.product_id = c.product_id CROSS JOIN tokens t
    ),
    token_summary AS (
        SELECT product_id,
               count(*) FILTER (WHERE product_match OR brand_match OR english_match) AS matched,
               (array_agg(norm ORDER BY length(norm) DESC, ord) FILTER (WHERE product_match))[1] AS product_token,
               (array_agg(norm ORDER BY length(norm) DESC, ord) FILTER (WHERE brand_match))[1] AS brand_token,
               (array_agg(norm ORDER BY length(norm) DESC, ord) FILTER (WHERE english_match))[1] AS english_token
        FROM token_matches GROUP BY product_id
    ),
    scored AS (
        SELECT d.*, q.token_count,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN d.product_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN d.product_chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN d.product_chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN d.product_norm IN (q.n, q.r) OR d.product_read IN (q.n, q.r) THEN 0
                        WHEN d.product_norm LIKE q.n || '%' OR d.product_norm LIKE q.r || '%' OR d.product_read LIKE q.n || '%' OR d.product_read LIKE q.r || '%' THEN 1
                        WHEN d.product_norm LIKE '%' || q.n || '%' OR d.product_norm LIKE '%' || q.r || '%' OR d.product_read LIKE '%' || q.n || '%' OR d.product_read LIKE '%' || q.r || '%' THEN 2
                        ELSE 9 END
               END AS product_tier,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN d.brand_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN d.brand_chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN d.brand_chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN d.brand_norm IN (q.n, q.r) OR d.brand_read IN (q.n, q.r) THEN 0
                        WHEN d.brand_norm LIKE q.n || '%' OR d.brand_norm LIKE q.r || '%' OR d.brand_read LIKE q.n || '%' OR d.brand_read LIKE q.r || '%' THEN 1
                        WHEN d.brand_norm LIKE '%' || q.n || '%' OR d.brand_norm LIKE '%' || q.r || '%' OR d.brand_read LIKE '%' || q.n || '%' OR d.brand_read LIKE '%' || q.r || '%' THEN 2
                        ELSE 9 END
               END AS brand_tier,
               CASE WHEN d.brand_english_norm IN (q.n, q.r) THEN 0
                    WHEN d.brand_english_norm LIKE q.n || '%' OR d.brand_english_norm LIKE q.r || '%' THEN 1
                    WHEN d.brand_english_norm LIKE '%' || q.n || '%' OR d.brand_english_norm LIKE '%' || q.r || '%' THEN 2
                    ELSE 9 END AS english_tier,
               coalesce(ts.matched, 0) AS matched,
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
    hit(product_id, tier, token_ratio, recent_views, name_length, match_field, match_text, match_query) AS (
        SELECT s.product_id,
               CASE WHEN q.has_spelling AND NOT s.combined AND s.matched < s.token_count THEN 3
                    ELSE least(s.product_tier, s.brand_tier, s.english_tier,
                     CASE WHEN s.combined THEN 2 ELSE 9 END,
                     CASE WHEN s.matched = s.token_count THEN 2 WHEN s.matched > 0 THEN 3 ELSE 9 END) END::smallint,
               CASE WHEN s.combined THEN 1 ELSE s.matched::real / s.token_count END::real,
               coalesce((SELECT sum(v.view_count) FROM product_daily_view v
                         WHERE v.product_id = s.product_id
                           AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                           AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date), 0)::bigint,
               length(s.raw_product_norm),
               CASE WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN 'PRODUCT_NAME'
                    ELSE 'BRAND_NAME' END,
               CASE WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN s.product_name
                             WHEN s.brand_tier <= s.english_tier THEN s.brand_korean_name
                             ELSE s.brand_english_name END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN s.product_name
                    WHEN s.brand_token IS NOT NULL THEN s.brand_korean_name
                    ELSE s.brand_english_name END,
               CASE WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN s.whole_query
                    WHEN s.combined THEN s.combined_part
                    WHEN s.product_token IS NOT NULL THEN s.product_token
                    WHEN s.brand_token IS NOT NULL THEN s.brand_token
                    ELSE s.english_token END
        FROM scored s CROSS JOIN q
        WHERE s.matched > 0 OR s.combined OR least(s.product_tier, s.brand_tier, s.english_tier) < 9
    )
    SELECT h.product_id, h.tier, h.token_ratio, h.recent_views, h.name_length, h.match_field, h.match_text,
           CASE WHEN q.has_spelling THEN search_product_match_piece(h.match_text, h.match_query) ELSE h.match_query END
    FROM hit h CROSS JOIN q
$$;

CREATE OR REPLACE FUNCTION search_product_metadata_hits(p_query text)
    RETURNS TABLE (product_id bigint, field text, text text, query text, ord int, tier int, term_key text)
    LANGUAGE sql STABLE
AS $$
    WITH queries AS MATERIALIZED (
        SELECT 0 AS ord, search_product_key(search_norm(p_query)) AS norm,
               search_read_query(search_product_key(search_norm(p_query))) AS read,
               search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung,
               search_product_has_spelling(search_norm(p_query)) AS has_spelling
        UNION ALL
        SELECT t.ord, t.norm, t.read, t.is_chosung, t.has_spelling FROM search_product_query_tokens(p_query) t
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

CREATE OR REPLACE FUNCTION search_products_core_v2(p_query text)
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
        SELECT * FROM search_product_query_tokens(p_query)
    ), candidates AS (
        SELECT product_id FROM names UNION SELECT product_id FROM metadata
    ), scored AS MATERIALIZED (
        SELECT d.*, n.tier AS name_tier, n.token_ratio AS name_ratio,
               n.recent_views, n.match_field, n.match_text, n.match_query,
               (SELECT count(*) FROM tokens) AS token_count,
               CASE WHEN n.tier <= 2 THEN (SELECT count(*) FROM tokens)
                    ELSE (SELECT count(*) FROM tokens t
                WHERE (CASE WHEN t.has_spelling THEN coalesce(d.product_key, d.product_norm) ELSE d.product_norm END) LIKE '%' || t.norm || '%' OR (CASE WHEN t.has_spelling THEN coalesce(d.product_read_key, d.product_read) ELSE d.product_read END) LIKE '%' || t.read || '%'
                   OR (CASE WHEN t.has_spelling THEN coalesce(d.brand_key, d.brand_norm) ELSE d.brand_norm END) LIKE '%' || t.norm || '%' OR (CASE WHEN t.has_spelling THEN coalesce(d.brand_read_key, d.brand_read) ELSE d.brand_read END) LIKE '%' || t.read || '%'
                   OR (CASE WHEN t.has_spelling THEN coalesce(d.brand_english_key, d.brand_english_norm) ELSE d.brand_english_norm END) LIKE '%' || t.norm || '%'
                   OR (t.is_chosung AND (d.product_chosung SIMILAR TO t.chosung_contains
                                        OR d.brand_chosung SIMILAR TO t.chosung_contains))
                   OR t.ord = ANY (ms.matched_ords)) END AS matched,
               ms.whole_tier AS metadata_tier
        FROM candidates c JOIN product_search_document d ON d.product_id = c.product_id
        LEFT JOIN names n ON n.product_id = d.product_id
        LEFT JOIN metadata_summary ms ON ms.product_id = d.product_id
    )
    -- 메타데이터 후보가 없으면 이미 계산한 이름 hit를 다시 채점하지 않는다.
    SELECT n.* FROM names n WHERE NOT EXISTS (SELECT 1 FROM metadata)
    UNION ALL
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
    WHERE s.token_count > 0 AND EXISTS (SELECT 1 FROM metadata)
$$;

CREATE OR REPLACE FUNCTION search_correct_query(p_query text, p_domain text) RETURNS text
    LANGUAGE sql STABLE
    SET pg_trgm.similarity_threshold = 0.5
AS $$
    WITH t AS MATERIALIZED (
        SELECT tok.*,
               tok.is_chosung
               OR length(tok.norm) < 3
               OR (p_domain = 'PRODUCT' AND search_product_has_spelling(tok.norm))
               OR (p_domain = 'PRODUCT' AND EXISTS (
                      SELECT 1 FROM product_search_document d
                      WHERE d.product_norm LIKE '%' || tok.norm || '%' OR d.product_read LIKE '%' || tok.read || '%'
                         OR d.brand_norm LIKE '%' || tok.norm || '%' OR d.brand_read LIKE '%' || tok.read || '%'
                         OR d.brand_english_norm LIKE '%' || tok.norm || '%'))
               OR (p_domain = 'INGREDIENT' AND (
                      EXISTS (SELECT 1 FROM ingredient_search_term e WHERE e.norm LIKE '%' || tok.norm || '%')
                      OR EXISTS (SELECT 1 FROM ingredient_search_term e WHERE e.read LIKE '%' || tok.read || '%')
                      OR EXISTS (SELECT 1 FROM ingredient_search_term e WHERE e.read IS NULL AND e.norm LIKE '%' || tok.read || '%'))) AS keep
        FROM search_query_tokens(p_query) tok
    )
    SELECT string_agg(coalesce(c.term, t.raw), ' ' ORDER BY t.ord)
    FROM t
    LEFT JOIN LATERAL (
        SELECT v.term
        FROM search_vocabulary v
        WHERE NOT t.keep AND v.domain = p_domain AND v.jamo % t.jamo
        ORDER BY similarity(v.jamo, t.jamo) DESC, v.frequency DESC, v.norm COLLATE "C"
        LIMIT 1
    ) c ON true
$$;

CREATE OR REPLACE FUNCTION search_correct_product_query_v2(p_query text) RETURNS text
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
               t.is_chosung OR length(t.norm) < 3 OR search_product_has_spelling(t.norm)
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
