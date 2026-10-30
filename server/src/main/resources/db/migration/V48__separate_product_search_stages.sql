-- #975: 일치 사실과 검색 정책을 분리한다. V47의 근거 타입과 V46의 마크 정의 인자를 유지한다.
CREATE TYPE product_search_field_fact AS (
    product_id bigint, ord int, field text, text text, query text,
    match_kind text, term_key text, literal_match boolean, has_spelling boolean
);
CREATE TYPE product_search_combination_fact AS (
    product_id bigint, brand_part text, product_part text,
    brand_first boolean, brand_exact boolean, product_exact boolean, product_prefix boolean
);

-- 문자열 비교 결과를 등급으로 해석하는 정책. 토큰의 PRESENT는 충족 여부에만 쓰인다.
CREATE FUNCTION search_product_match_tier(p_kind text) RETURNS int
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT CASE p_kind WHEN 'EXACT' THEN 0 WHEN 'PREFIX' THEN 1 WHEN 'CONTAINS' THEN 2 END $$;

CREATE FUNCTION search_product_combination_score(p_fact product_search_combination_fact)
    RETURNS TABLE (tier int, ratio real)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT CASE WHEN p_fact.brand_first AND p_fact.brand_exact AND p_fact.product_exact THEN 0
                WHEN p_fact.brand_first AND p_fact.brand_exact AND p_fact.product_prefix THEN 1 ELSE 2 END,
           ((p_fact.brand_first::int + p_fact.brand_exact::int + p_fact.product_prefix::int + 1) / 4.0)::real
$$;

-- 같은 제품의 여러 분할을 선택하는 순서도 정책 한 곳에서 소유한다.
CREATE FUNCTION search_product_choose_combinations(p_facts product_search_combination_fact[])
    RETURNS TABLE (product_id bigint, fact product_search_combination_fact, tier int, ratio real)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT DISTINCT ON (f.product_id) f.product_id, f, s.tier, s.ratio
    FROM unnest(p_facts) f CROSS JOIN LATERAL search_product_combination_score(f) s
    ORDER BY f.product_id, s.tier, s.ratio DESC, length(f.product_part) DESC, f.product_part COLLATE "C"
$$;

CREATE FUNCTION search_product_metadata_facts(p_parts product_search_part[], p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_field_fact
    LANGUAGE sql STABLE
AS $$
    WITH matched AS MATERIALIZED (
        SELECT m.*, q.ord, q.norm AS query, q.has_spelling,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) THEN 'EXACT'
                        WHEN m.chosung SIMILAR TO search_chosung_query(q.norm) || '%' THEN 'PREFIX' ELSE 'CONTAINS' END
               ELSE
                   CASE WHEN m.norm IN (q.norm, q.read) OR m.read IN (q.norm, q.read) THEN 'EXACT'
                        WHEN m.norm LIKE q.norm || '%' OR m.norm LIKE q.read || '%'
                          OR m.read LIKE q.norm || '%' OR m.read LIKE q.read || '%' THEN 'PREFIX' ELSE 'CONTAINS' END
               END AS match_kind
        FROM unnest(p_parts) q CROSS JOIN LATERAL (
            SELECT original.field, original.mark_code, original.text, original.chosung,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.norm) THEN search_product_key(original.norm) ELSE original.norm END AS norm,
                   CASE WHEN q.has_spelling AND search_product_has_spelling(original.read) THEN search_product_key(original.read) ELSE original.read END AS read
            FROM product_search_metadata_terms(p_marks) original
        ) m
        WHERE q.norm <> '' AND (
            m.norm LIKE '%' || q.norm || '%' OR m.norm LIKE '%' || q.read || '%'
            OR m.read LIKE '%' || q.norm || '%' OR m.read LIKE '%' || q.read || '%'
            OR (q.is_chosung AND m.chosung SIMILAR TO q.chosung_contains))
    ), linked AS (
        SELECT p.product_id, m.*, m.mark_code::text AS term_key
        FROM matched m JOIN product_mark p ON p.mark_code = m.mark_code
        WHERE m.field = 'MARK'
    )
    SELECT product_id, ord, field, text, query, match_kind, term_key, true, has_spelling FROM linked
$$;

CREATE FUNCTION search_product_combination_facts(p_parts product_search_part[])
    RETURNS SETOF product_search_combination_fact
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
        FROM product_search_document d CROSS JOIN q WHERE q.token_count = 1
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
    combined AS (
        SELECT d.product_id, bs.brand_part, bs.product_part, bs.brand_first, bs.brand_exact,
               m.product_exact, m.product_prefix
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
    )
    SELECT * FROM combined
$$;

CREATE FUNCTION search_product_name_facts(p_parts product_search_part[], p_ids bigint[])
    RETURNS SETOF product_search_field_fact
    LANGUAGE sql STABLE
AS $$
    WITH document_fields AS MATERIALIZED (
        SELECT d.product_id, f.* FROM product_search_document d
        JOIN (SELECT DISTINCT id FROM unnest(p_ids) ids(id)) ids ON ids.id = d.product_id
        CROSS JOIN LATERAL (VALUES
            ('PRODUCT_NAME', d.product_name::text, d.product_norm, d.product_read, d.product_chosung, d.product_key, d.product_read_key),
            ('BRAND_NAME', d.brand_korean_name::text, d.brand_norm, d.brand_read, d.brand_chosung, d.brand_key, d.brand_read_key),
            ('BRAND_ENGLISH_NAME', d.brand_english_name::text, d.brand_english_norm, NULL::text, NULL::text, d.brand_english_key, NULL::text)
        ) f(field, text, norm, read, chosung, key, read_key)
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
    SELECT product_id, ord, field, text, norm,
           CASE WHEN ord > 0 THEN 'PRESENT' -- 필수 토큰에는 충족 여부만 필요하고, 이름 등급은 전체 입력으로 정한다.
           WHEN is_chosung AND field <> 'BRAND_ENGLISH_NAME' THEN
               CASE WHEN chosung SIMILAR TO search_chosung_query(norm) THEN 'EXACT'
                    WHEN chosung SIMILAR TO search_chosung_query(norm) || '%' THEN 'PREFIX' ELSE 'CONTAINS' END
           ELSE CASE WHEN field_norm IN (norm, read) OR field_read IN (norm, read) THEN 'EXACT'
                     WHEN field_norm LIKE norm || '%' OR field_norm LIKE read || '%'
                       OR field_read LIKE norm || '%' OR field_read LIKE read || '%' THEN 'PREFIX' ELSE 'CONTAINS' END END,
           NULL::text, literal_match, has_spelling FROM matched
$$;

-- 이전 필드 근거 계약에서만 원문 조각과 등급을 조립한다.
CREATE FUNCTION search_product_legacy_field(p_fact product_search_field_fact)
    RETURNS product_search_field_match LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT ROW(p_fact.product_id, p_fact.ord, p_fact.field, p_fact.text, p_fact.query,
           CASE WHEN p_fact.field = 'MARK' AND p_fact.has_spelling
                THEN search_product_match_piece(p_fact.text, p_fact.query) ELSE p_fact.query END,
           search_product_match_tier(p_fact.match_kind), p_fact.term_key, p_fact.literal_match)::product_search_field_match
$$;

CREATE OR REPLACE FUNCTION search_product_metadata_matches(p_parts product_search_part[], p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_field_match LANGUAGE sql STABLE
AS $$ SELECT (search_product_legacy_field(f)).* FROM search_product_metadata_facts(p_parts, p_marks) f $$;

CREATE OR REPLACE FUNCTION search_product_name_matches(p_parts product_search_part[], p_ids bigint[])
    RETURNS SETOF product_search_field_match LANGUAGE sql STABLE
AS $$ SELECT (search_product_legacy_field(f)).* FROM search_product_name_facts(p_parts, p_ids) f $$;

-- 분할 선택은 사실 수집 이후의 정책이다. 표시도 이 선택을 그대로 사용한다.
CREATE OR REPLACE FUNCTION search_product_combination_matches(p_parts product_search_part[])
    RETURNS SETOF product_search_combination LANGUAGE sql STABLE
AS $$
    SELECT product_id, (fact).brand_part, (fact).product_part, tier, ratio
    FROM search_product_choose_combinations(ARRAY(SELECT f FROM search_product_combination_facts(p_parts) f))
$$;

-- 이름 ID는 넓은 복합 값으로 확장하기 전에 중복을 줄인다. 메타데이터·결합은 이미 확인한 사실을 전달한다.
CREATE TYPE product_search_candidate AS (
    product_id bigint, field_fact product_search_field_fact, combination_fact product_search_combination_fact
);
CREATE FUNCTION search_product_candidates(p_parts product_search_part[], p_include_metadata boolean, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_candidate LANGUAGE sql STABLE
AS $$
    SELECT product_id, NULL::product_search_field_fact, NULL::product_search_combination_fact
    FROM (SELECT DISTINCT product_id FROM search_product_candidate_ids(p_parts)) ids
    UNION ALL
    SELECT f.product_id, f, NULL::product_search_combination_fact
    FROM search_product_metadata_facts(p_parts, p_marks) f WHERE p_include_metadata
    UNION ALL
    SELECT f.product_id, NULL::product_search_field_fact, f FROM search_product_combination_facts(p_parts) f
$$;

-- V47 상세 근거 조회의 호환 진입점. 후보가 확인한 필드를 재검색하지 않는다.
CREATE OR REPLACE FUNCTION search_product_match_evidence(p_parts product_search_part[], p_include_metadata boolean, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_evidence LANGUAGE sql STABLE
AS $$
    WITH candidates AS MATERIALIZED (
        SELECT * FROM search_product_candidates(p_parts, p_include_metadata, p_marks)
    ), ids AS MATERIALIZED (
        SELECT DISTINCT product_id FROM candidates
    ), fields AS (
        SELECT search_product_legacy_field(f) AS fact
        FROM search_product_name_facts(p_parts, (SELECT array_agg(product_id) FROM ids)) f
        UNION ALL SELECT search_product_legacy_field(field_fact) FROM candidates WHERE (field_fact).product_id IS NOT NULL
    ), collected AS (
        SELECT (fact).product_id, array_agg(fact ORDER BY (fact).ord, (fact).field, (fact).term_key COLLATE "C") AS fields
        FROM fields GROUP BY (fact).product_id
    ), combined AS (
        SELECT product_id, (fact).brand_part, (fact).product_part, tier, ratio
        FROM search_product_choose_combinations(ARRAY(
            SELECT combination_fact FROM candidates WHERE (combination_fact).product_id IS NOT NULL))
    )
    SELECT d.product_id, d.product_name, d.brand_korean_name, d.brand_english_name, length(d.product_norm), p_parts,
           coalesce(f.fields, ARRAY[]::product_search_field_match[]), c::product_search_combination,
           greatest(strpos(CASE WHEN q.has_spelling THEN coalesce(d.product_key, d.product_norm) ELSE d.product_norm END, q.norm),
                    strpos(CASE WHEN q.has_spelling THEN coalesce(d.product_read_key, d.product_read) ELSE d.product_read END, q.norm),
                    strpos(d.product_chosung, q.norm)) > 0
    FROM ids JOIN product_search_document d ON d.product_id = ids.product_id
    LEFT JOIN collected f ON f.product_id = d.product_id
    LEFT JOIN combined c ON c.product_id = d.product_id
    CROSS JOIN unnest(p_parts) q WHERE q.ord = 0
$$;


-- 목록과 개수는 표시 문자열·JSON 없이 관련도 재료를 요청 필터에 연결한다.
CREATE TYPE product_search_score AS (
    product_id bigint, tier smallint, token_ratio real, recent_views bigint, name_length int
);

-- 정책은 문자열이나 표시 필드를 받지 않고 집계한 충족 여부와 품질만 받는다.
CREATE TYPE product_search_summary AS (
    matched int, all_matched int, product_tier int, brand_tier int, english_tier int,
    metadata_tier int, metadata_hit boolean, combined_tier int, combined_ratio real
);
-- name_hit은 표시 단계가 같은 판정으로 이름·메타데이터 표시를 고르도록 함께 돌려준다.
CREATE FUNCTION search_product_policy(p_summary product_search_summary, p_token_count int, p_has_spelling boolean)
    RETURNS TABLE (tier smallint, token_ratio real, name_hit boolean) LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH eligibility AS (
        SELECT p_summary.*,
               (p_summary.matched > 0 OR p_summary.combined_tier IS NOT NULL
                OR least(p_summary.product_tier, p_summary.brand_tier, p_summary.english_tier) < 9) AS name_hit,
               ((p_summary.combined_tier IS NOT NULL OR p_summary.matched = p_token_count
                  OR least(p_summary.product_tier, p_summary.brand_tier, p_summary.english_tier) < 9)
                AND (NOT p_has_spelling OR p_summary.combined_tier IS NOT NULL OR p_summary.matched = p_token_count)) AS name_eligible
    ), accepted AS (
        SELECT *, (name_eligible OR metadata_tier IS NOT NULL OR all_matched = p_token_count) AS eligible
        FROM eligibility WHERE p_token_count > 0 AND (name_hit OR metadata_hit)
    )
    SELECT CASE WHEN eligible THEN least(
               CASE WHEN name_eligible THEN least(product_tier, brand_tier, english_tier,
                    coalesce(combined_tier, 9), CASE WHEN matched = p_token_count THEN 2 ELSE 9 END) ELSE 3 END,
               coalesce(metadata_tier, 9), CASE WHEN all_matched = p_token_count THEN 2 ELSE 3 END)
                ELSE 3 END::smallint,
           CASE WHEN name_eligible THEN CASE WHEN combined_tier IS NOT NULL THEN greatest(combined_ratio, matched::real / p_token_count)
                                             ELSE matched::real / p_token_count END
                WHEN metadata_tier IS NOT NULL THEN 1 ELSE all_matched::real / p_token_count END::real,
           name_hit
    FROM accepted
$$;

-- 이름 등급과 name_hit는 정책이 읽은 요약 그대로다. 표시는 이 값을 다시 계산하지 않는다.
CREATE TYPE product_search_detail AS (
    product_id bigint, product_name text, brand_name text, brand_english_name text, name_length int,
    fields product_search_field_fact[], combination product_search_combination_fact, product_covers_query boolean,
    product_tier int, brand_tier int, english_tier int, name_hit boolean
);

-- 복잡한 단계 조합의 요청별 재계획 비용을 피한다. 계획 재사용 설정은 이 함수 안에서만 적용한다.
-- 사실 행은 한 요청 안에서 공유한다. 전체 후보에는 요약만, 표시에는 선택한 페이지의 상세만 조립한다.
CREATE FUNCTION search_product_evaluate(p_parts product_search_part[], p_offset bigint, p_limit int,
                                       p_max_tier int, p_include_metadata boolean, p_details boolean, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, has_full_match boolean, scores product_search_score[], details product_search_detail[])
    LANGUAGE sql STABLE SET plan_cache_mode = force_generic_plan
AS $$
    WITH candidates AS MATERIALIZED (
        SELECT * FROM search_product_candidates(p_parts, p_include_metadata, p_marks)
    ), ids AS MATERIALIZED (
        SELECT DISTINCT product_id FROM candidates
    ), fields AS MATERIALIZED (
        SELECT f.* FROM search_product_name_facts(p_parts, (SELECT array_agg(product_id) FROM ids)) f
        UNION ALL SELECT (field_fact).* FROM candidates WHERE (field_fact).product_id IS NOT NULL
    ), combined AS MATERIALIZED (
        SELECT * FROM search_product_choose_combinations(ARRAY(
            SELECT combination_fact FROM candidates WHERE (combination_fact).product_id IS NOT NULL))
    ), summary AS (
        SELECT product_id,
               count(DISTINCT ord) FILTER (WHERE ord > 0 AND field IN ('PRODUCT_NAME','BRAND_NAME','BRAND_ENGLISH_NAME'))::int AS matched,
               count(DISTINCT ord) FILTER (WHERE ord > 0)::int AS all_matched,
               min(search_product_match_tier(match_kind)) FILTER (WHERE ord = 0 AND field = 'PRODUCT_NAME') AS product_tier,
               min(search_product_match_tier(match_kind)) FILTER (WHERE ord = 0 AND field = 'BRAND_NAME') AS brand_tier,
               min(search_product_match_tier(match_kind)) FILTER (WHERE ord = 0 AND field = 'BRAND_ENGLISH_NAME') AS english_tier,
               min(search_product_match_tier(match_kind)) FILTER (WHERE ord = 0 AND field = 'MARK') AS metadata_tier,
               bool_or(field = 'MARK') AS metadata_hit
        FROM fields GROUP BY product_id
    ), scored AS MATERIALIZED (
        SELECT ids.product_id, p.tier, p.token_ratio,
               coalesce((SELECT sum(v.view_count) FROM product_daily_view v WHERE v.product_id = ids.product_id
                   AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                   AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date), 0)::bigint AS recent_views,
               length(d.product_norm) AS name_length,
               coalesce(s.product_tier, 9) AS product_tier, coalesce(s.brand_tier, 9) AS brand_tier,
               coalesce(s.english_tier, 9) AS english_tier, p.name_hit
        FROM ids JOIN product_search_document d ON d.product_id = ids.product_id
        LEFT JOIN summary s ON s.product_id = ids.product_id LEFT JOIN combined c ON c.product_id = ids.product_id
        CROSS JOIN unnest(p_parts) q CROSS JOIN LATERAL search_product_policy(ROW(
            coalesce(s.matched, 0), coalesce(s.all_matched, 0), coalesce(s.product_tier, 9), coalesce(s.brand_tier, 9),
            coalesce(s.english_tier, 9), s.metadata_tier, coalesce(s.metadata_hit, false), c.tier, c.ratio
        )::product_search_summary, cardinality(p_parts) - 1, q.has_spelling) p WHERE q.ord = 0
    ), page AS MATERIALIZED (
        SELECT * FROM scored WHERE tier <= p_max_tier AND p_limit IS NULL AND p_offset = 0
        UNION ALL
        (SELECT * FROM scored WHERE tier <= p_max_tier AND (p_limit IS NOT NULL OR p_offset > 0)
         ORDER BY tier, token_ratio DESC, recent_views DESC, name_length, product_id OFFSET p_offset LIMIT p_limit)
    ), page_fields AS (
        SELECT f.product_id, array_agg(f::product_search_field_fact ORDER BY f.ord, f.field, f.term_key COLLATE "C") AS fields
        FROM fields f JOIN page p ON p.product_id = f.product_id WHERE p_details GROUP BY f.product_id
    ), page_details AS (
        SELECT d.product_id, d.product_name, d.brand_korean_name, d.brand_english_name, length(d.product_norm),
               coalesce(f.fields, ARRAY[]::product_search_field_fact[]), c.fact,
               greatest(strpos(CASE WHEN q.has_spelling THEN coalesce(d.product_key, d.product_norm) ELSE d.product_norm END, q.norm),
                        strpos(CASE WHEN q.has_spelling THEN coalesce(d.product_read_key, d.product_read) ELSE d.product_read END, q.norm),
                        strpos(d.product_chosung, q.norm)) > 0,
               p.product_tier, p.brand_tier, p.english_tier, p.name_hit
        FROM page p JOIN product_search_document d ON d.product_id = p.product_id
        LEFT JOIN page_fields f ON f.product_id = p.product_id LEFT JOIN combined c ON c.product_id = p.product_id
        CROSS JOIN unnest(p_parts) q WHERE p_details AND q.ord = 0
    )
    SELECT (SELECT count(*) FROM scored WHERE tier <= p_max_tier), EXISTS (SELECT 1 FROM scored WHERE tier <= 2),
           coalesce((SELECT array_agg(ROW(p.product_id, p.tier, p.token_ratio, p.recent_views, p.name_length)::product_search_score)
                     FROM page p), ARRAY[]::product_search_score[]),
           coalesce((SELECT array_agg(d::product_search_detail) FROM page_details d), ARRAY[]::product_search_detail[])
$$;

-- 교정은 요청 필터와 페이지 전에 전체 검색의 성공 여부로만 결정한다.
CREATE FUNCTION search_product_resolve_result(p_query text, p_offset bigint, p_limit int, p_max_tier int, p_details boolean, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, corrected_query text, parts product_search_part[],
                   scores product_search_score[], details product_search_detail[])
    LANGUAGE plpgsql STABLE
AS $$
DECLARE
    original record;
    corrected record;
    correction text;
    original_parts product_search_part[] := search_product_analyze(p_query);
    corrected_parts product_search_part[];
BEGIN
    IF p_offset IS NULL OR p_offset < 0 OR p_limit < 1 OR p_max_tier IS NULL OR p_max_tier NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION '페이지 조건이 올바르지 않다 (offset %, limit %, max_tier %).', p_offset, p_limit, p_max_tier;
    END IF;
    SELECT * INTO original FROM search_product_evaluate(original_parts, p_offset, p_limit, p_max_tier, true, p_details, p_marks);
    IF NOT original.has_full_match THEN
        correction := search_correct_product_query_v2(p_query, p_marks);
        IF search_norm(correction) <> search_norm(p_query) THEN
            corrected_parts := search_product_analyze(correction);
            SELECT * INTO corrected FROM search_product_evaluate(corrected_parts, p_offset, p_limit, p_max_tier, true, p_details, p_marks);
            IF corrected.total > 0 THEN
                RETURN QUERY SELECT corrected.total, correction, corrected_parts, corrected.scores, corrected.details;
                RETURN;
            END IF;
        END IF;
    END IF;
    RETURN QUERY SELECT original.total, NULL::text, original_parts, original.scores, original.details;
END
$$;

-- 검색 순위는 여기서만 정한다. 목록은 rank로 정렬하고 같은 기준을 Java에 다시 적지 않는다.
CREATE FUNCTION search_product_results(p_query text, p_max_tier int DEFAULT 2, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (product_id bigint, tier smallint, token_ratio real, recent_views bigint, name_length int, rank bigint)
    LANGUAGE sql STABLE
AS $$
    SELECT s.*, row_number() OVER (ORDER BY s.tier, s.token_ratio DESC, s.recent_views DESC, s.name_length, s.product_id)
    FROM search_product_resolve_result(p_query, 0, NULL, p_max_tier, false, p_marks) r, unnest(r.scores) s
$$;

-- 표시 선택은 페이지의 상세 근거만 받는다. 포함 여부와 검색 점수를 바꿀 수 없다.
-- 이름 등급과 name_hit는 정책이 계산한 값을 상세로 받아 순위와 같은 판정으로 표시 필드를 고른다.
CREATE FUNCTION search_product_present(p_parts product_search_part[], p_detail product_search_detail)
    RETURNS TABLE (match_field text, match_text text, match_query text) LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH fields AS MATERIALIZED (SELECT * FROM unnest(p_detail.fields)), facts AS (
        SELECT q.norm AS whole_query, q.has_spelling, (p_detail.combination).product_id IS NOT NULL AS combined,
               p_detail.product_tier, p_detail.brand_tier, p_detail.english_tier, p_detail.name_hit,
               (array_agg(query ORDER BY length(query) DESC, f.ord) FILTER (WHERE f.ord > 0 AND field = 'PRODUCT_NAME'))[1] AS product_token,
               (array_agg(query ORDER BY length(query) DESC, f.ord) FILTER (WHERE f.ord > 0 AND field = 'BRAND_NAME'))[1] AS brand_token,
               (array_agg(query ORDER BY length(query) DESC, f.ord) FILTER (WHERE f.ord > 0 AND field = 'BRAND_ENGLISH_NAME'))[1] AS english_token
        FROM unnest(p_parts) q LEFT JOIN fields f ON true WHERE q.ord = 0 GROUP BY q.norm, q.has_spelling
    ), selected AS (
        SELECT s.name_hit, s.has_spelling,
               CASE WHEN NOT s.name_hit THEN m.field
                    WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END AS field,
               CASE WHEN NOT s.name_hit THEN m.text
                    WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                        CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN p_detail.product_name
                             WHEN s.brand_tier <= s.english_tier THEN p_detail.brand_name ELSE p_detail.brand_english_name END
                    WHEN s.combined OR s.product_token IS NOT NULL THEN p_detail.product_name
                    WHEN s.brand_token IS NOT NULL THEN p_detail.brand_name ELSE p_detail.brand_english_name END AS text,
               CASE WHEN NOT s.name_hit THEN m.query
                    WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN s.whole_query
                    WHEN s.combined THEN (p_detail.combination).product_part
                    ELSE coalesce(s.product_token, s.brand_token, s.english_token) END AS query
        FROM facts s LEFT JOIN LATERAL (
            SELECT field, text, CASE WHEN has_spelling THEN search_product_match_piece(text, query) ELSE query END AS query
            FROM fields WHERE NOT s.name_hit AND field = 'MARK'
            ORDER BY length(CASE WHEN has_spelling THEN search_product_match_piece(text, query) ELSE query END) DESC,
                     ord, term_key COLLATE "C" LIMIT 1
        ) m ON true
    )
    SELECT field, text, CASE WHEN name_hit AND has_spelling THEN search_product_match_piece(text, query) ELSE query END
    FROM selected WHERE p_detail.product_id IS NOT NULL
$$;

-- 전체 개수는 빈 페이지에도 한 행으로 남긴다. JSON은 호환 함수의 최종 경계에서만 만든다.
-- 표시를 고르지 못한 페이지 행도 제품명 전체를 표시해 ID·순위와 응답의 필수 표시 값을 함께 유지한다.
CREATE FUNCTION search_product_suggestions(p_query text, p_offset bigint, p_limit int, p_max_tier int DEFAULT 2, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, corrected_query text, product_id bigint, result_position bigint, tier smallint,
                   token_ratio real, recent_views bigint, match_field text, match_text text, match_range int[])
    LANGUAGE sql STABLE
AS $$
    WITH resolved AS MATERIALIZED (
        SELECT * FROM search_product_resolve_result(p_query, p_offset, p_limit, p_max_tier, true, p_marks)
    ), ordered AS MATERIALIZED (
        SELECT s.*, p_offset + row_number() OVER (ORDER BY s.tier, s.token_ratio DESC, s.recent_views DESC, s.name_length, s.product_id) AS position
        FROM resolved r CROSS JOIN LATERAL unnest(r.scores) s
    ), page AS (
        SELECT s.*, coalesce(display.match_field, 'PRODUCT_NAME') AS match_field,
               coalesce(display.match_text, d.product_name) AS match_text,
               CASE WHEN p_limit IS NULL THEN NULL
                    WHEN display.match_field IS NULL THEN ARRAY[0, search_utf16_index(d.product_name, length(d.product_name))]
                    ELSE search_match_range(display.match_text, display.match_query) END AS match_range
        FROM resolved r CROSS JOIN ordered s
        JOIN LATERAL unnest(r.details) d ON d.product_id = s.product_id
        LEFT JOIN LATERAL search_product_present(r.parts, d) display ON true
    )
    SELECT r.total, r.corrected_query, p.product_id, p.position, p.tier, p.token_ratio, p.recent_views,
           p.match_field, p.match_text, p.match_range FROM resolved r LEFT JOIN page p ON true ORDER BY p.position
$$;

CREATE OR REPLACE FUNCTION search_products_v2(p_query text, p_offset bigint DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, corrected_query text, items jsonb) LANGUAGE sql STABLE
AS $$
    SELECT total, corrected_query, coalesce(jsonb_agg(jsonb_build_object(
        'productId', product_id, 'rank', result_position, 'tier', tier, 'tokenRatio', token_ratio, 'recentViews', recent_views,
        'matchField', match_field, 'matchText', match_text, 'matchRange', to_jsonb(match_range))
        ORDER BY result_position) FILTER (WHERE product_id IS NOT NULL), '[]'::jsonb)
    FROM search_product_suggestions(p_query, p_offset, p_limit, p_max_tier, p_marks) GROUP BY total, corrected_query
$$;

CREATE OR REPLACE FUNCTION search_product_hits(p_query text, p_include_metadata boolean, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_hit LANGUAGE sql STABLE
AS $$
    WITH analysis AS MATERIALIZED (SELECT search_product_analyze(p_query) AS parts)
    SELECT s.product_id, s.tier, s.token_ratio, s.recent_views, s.name_length,
           coalesce(d.match_field, 'PRODUCT_NAME'), coalesce(d.match_text, detail.product_name), d.match_query
    FROM analysis a CROSS JOIN LATERAL search_product_evaluate(a.parts, 0, NULL, 3, p_include_metadata, true, p_marks) result
    CROSS JOIN LATERAL unnest(result.scores) s JOIN LATERAL unnest(result.details) detail ON detail.product_id = s.product_id
    LEFT JOIN LATERAL search_product_present(a.parts, detail) d ON true
$$;


CREATE FUNCTION search_product_related_prefix(p_parts product_search_part[], p_evidence product_search_detail) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH fields AS MATERIALIZED (SELECT * FROM unnest(p_evidence.fields) WHERE ord > 0),
    metadata AS (
        SELECT DISTINCT ON (m.text) m.text, m.ord FROM fields m
        WHERE m.field = 'MARK' AND NOT EXISTS (
            SELECT 1 FROM fields p WHERE p.ord = m.ord AND p.field = 'PRODUCT_NAME' AND p.literal_match)
        ORDER BY m.text, m.ord
    )
    SELECT CASE WHEN p_evidence.product_covers_query
        AND (SELECT count(DISTINCT ord) FROM fields WHERE field = 'PRODUCT_NAME') = cardinality(p_parts) - 1 THEN NULL
    ELSE coalesce(nullif(concat_ws(' ',
        CASE WHEN EXISTS (SELECT 1 FROM fields b WHERE b.field = 'BRAND_NAME' AND b.literal_match AND NOT EXISTS (
            SELECT 1 FROM fields p WHERE p.ord = b.ord AND p.field = 'PRODUCT_NAME' AND p.literal_match)) THEN p_evidence.brand_name END,
        (SELECT string_agg(text, ' ' ORDER BY ord, text) FROM metadata)
    ), ''), p_evidence.brand_name) END
$$;

CREATE FUNCTION search_product_related_ranges(p_parts product_search_part[], p_evidence product_search_detail, p_keyword text, p_prefix text)
    RETURNS int[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH parts AS MATERIALIZED (SELECT * FROM unnest(p_parts)),
    whole AS (
        SELECT search_match_range(p_keyword, CASE WHEN has_spelling THEN search_product_match_piece(p_keyword, norm) ELSE norm END) AS range
        FROM parts WHERE ord = 0 AND (NOT has_spelling OR NOT EXISTS (SELECT 1 FROM parts WHERE ord > 0 AND NOT has_spelling))
    ), tokens AS (
        SELECT norm, ord, search_match_range(p_keyword, CASE WHEN has_spelling THEN search_product_match_piece(p_keyword, norm) ELSE raw END) AS range
        FROM parts WHERE ord > 0
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
        (SELECT array_agg(range ORDER BY norm, ord) FROM tokens WHERE range IS NOT NULL),
        (SELECT array[brand_range, array[name_range[1] + gap, name_range[2] + gap]] FROM combined WHERE brand_range IS NOT NULL AND name_range IS NOT NULL),
        array[array[0, search_utf16_index(p_keyword, length(p_prefix))]])
$$;

CREATE OR REPLACE FUNCTION search_product_related_keywords(p_query text, p_limit int, p_max_length int, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (keyword text, match_ranges int[]) LANGUAGE sql STABLE
AS $$
    WITH resolved AS MATERIALIZED (SELECT * FROM search_product_resolve_result(p_query, 0, p_limit, 2, true, p_marks)),
    page AS (
        SELECT r.parts, d, row_number() OVER (ORDER BY s.tier, s.token_ratio DESC, s.recent_views DESC, s.name_length, s.product_id) AS position
        FROM resolved r CROSS JOIN LATERAL unnest(r.scores) s JOIN LATERAL unnest(r.details) d ON d.product_id = s.product_id
    ), prefixed AS MATERIALIZED (
        SELECT *, search_product_related_prefix(parts, d) AS prefix FROM page
    ), text AS (
        SELECT *, concat_ws(' ', prefix, (d).product_name) AS keyword FROM prefixed
    )
    SELECT keyword, search_product_related_ranges(parts, d, keyword, prefix) FROM text
    WHERE search_utf16_index(keyword, length(keyword)) <= p_max_length ORDER BY position
$$;

-- V47의 상세 타입은 호환 호출에서만 조립한다. 실행 경로는 분석 배열을 요청당 한 번 보관한다.
CREATE FUNCTION search_product_legacy_evidence(p_parts product_search_part[], p_detail product_search_detail)
    RETURNS product_search_evidence LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT ROW(p_detail.product_id, p_detail.product_name, p_detail.brand_name, p_detail.brand_english_name, p_detail.name_length,
        p_parts, ARRAY(SELECT search_product_legacy_field(f) FROM unnest(p_detail.fields) f),
        CASE WHEN (p_detail.combination).product_id IS NOT NULL THEN
            (SELECT ROW((p_detail.combination).product_id, (p_detail.combination).brand_part, (p_detail.combination).product_part,
                        c.tier, c.ratio)::product_search_combination FROM search_product_combination_score(p_detail.combination) c) END,
        p_detail.product_covers_query)::product_search_evidence
$$;

CREATE FUNCTION search_product_legacy_matches(p_parts product_search_part[], p_scores product_search_score[], p_details product_search_detail[])
    RETURNS SETOF product_search_ranked_match LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT ROW(s.product_id, s.tier, s.token_ratio, s.recent_views, s.name_length, display.match_field, display.match_text,
               display.match_query)::product_search_hit, search_product_legacy_evidence(p_parts, d)
    FROM unnest(p_scores) s JOIN unnest(p_details) d ON d.product_id = s.product_id
    CROSS JOIN LATERAL search_product_present(p_parts, d) display
    ORDER BY s.tier, s.token_ratio DESC, s.recent_views DESC, s.name_length, s.product_id
$$;

CREATE OR REPLACE FUNCTION search_product_ranked_matches(p_parts product_search_part[], p_include_metadata boolean, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS SETOF product_search_ranked_match LANGUAGE sql STABLE
AS $$
    SELECT m.* FROM search_product_evaluate(p_parts, 0, NULL, 3, p_include_metadata, true, p_marks) r
    CROSS JOIN LATERAL search_product_legacy_matches(p_parts, r.scores, r.details) m
$$;

CREATE OR REPLACE FUNCTION search_product_evidence_page(p_query text, p_offset bigint, p_limit int, p_max_tier int, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, has_full_match boolean, matches product_search_ranked_match[]) LANGUAGE sql STABLE
AS $$
    WITH analysis AS MATERIALIZED (SELECT search_product_analyze(p_query) AS parts)
    SELECT r.total, r.has_full_match, ARRAY(SELECT m FROM search_product_legacy_matches(a.parts, r.scores, r.details) m)
    FROM analysis a CROSS JOIN LATERAL search_product_evaluate(a.parts, p_offset, p_limit, p_max_tier, true, true, p_marks) r
$$;

CREATE OR REPLACE FUNCTION search_product_resolve(p_query text, p_offset bigint, p_limit int, p_max_tier int, p_marks jsonb DEFAULT '[]'::jsonb)
    RETURNS TABLE (total bigint, corrected_query text, matches product_search_ranked_match[]) LANGUAGE sql STABLE
AS $$
    SELECT r.total, r.corrected_query, ARRAY(SELECT m FROM search_product_legacy_matches(r.parts, r.scores, r.details) m)
    FROM search_product_resolve_result(p_query, p_offset, p_limit, p_max_tier, true, p_marks) r
$$;
