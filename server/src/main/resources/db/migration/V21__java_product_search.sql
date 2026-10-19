-- Java가 만든 표현과 UTF-16 원문 위치를 저장한다. 기존 검색 뷰와 함수는 이전 서버용으로 유지한다.
CREATE TABLE product_search_name (
    product_id bigint NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
    field text NOT NULL CHECK (field IN ('PRODUCT_NAME','BRAND_NAME','BRAND_ENGLISH_NAME')),
    kind text NOT NULL CHECK (kind IN ('DIRECT','READING','INITIALS','READING_INITIALS')),
    analysis_version int NOT NULL,
    source_text text NOT NULL,
    normalized text NOT NULL,
    search_text text NOT NULL,
    source_starts int[] NOT NULL,
    source_ends int[] NOT NULL,
    PRIMARY KEY (product_id,field,kind,analysis_version),
    CHECK (cardinality(source_starts)=length(search_text)),
    CHECK (cardinality(source_ends)=length(search_text))
);
CREATE INDEX ix_product_search_name_text ON product_search_name USING gin (search_text gin_trgm_ops)
    WHERE kind IN ('DIRECT','READING');
CREATE INDEX ix_product_search_name_initials ON product_search_name USING gin (search_text gin_trgm_ops)
    WHERE kind IN ('INITIALS','READING_INITIALS');

-- 여기서는 글자를 조합하거나 읽기 형태를 만들지 않는다. 입력은 Java 분석기가 만든 조건이다.
-- unit 0은 공백을 제거한 질의 전체, 1 이상은 중복을 제거한 토큰이다.
CREATE FUNCTION search_product_hits(p_query jsonb)
RETURNS TABLE (product_id bigint,tier smallint,token_ratio real,recent_views bigint,name_length int,
               match_field text,match_text text,match_start int,match_end int)
LANGUAGE sql STABLE AS $$
WITH units AS MATERIALIZED (
    SELECT 0 AS unit,p_query->'whole' AS token
    UNION ALL
    SELECT u.ord::int,u.token FROM jsonb_array_elements(p_query->'tokens') WITH ORDINALITY u(token,ord)
), unit_groups AS (
    SELECT token,array_agg(unit) AS units FROM units GROUP BY token
), needles AS MATERIALIZED (
    SELECT u.units,u.token->>'norm' AS norm,(u.token->>'initials')::boolean AS initials,
           u.token->>'pattern' AS pattern,e.value,e.ord::int AS priority
    FROM unit_groups u CROSS JOIN LATERAL jsonb_array_elements_text(u.token->'expressions') WITH ORDINALITY e(value,ord)
    WHERE e.value<>''
), name_matches AS MATERIALIZED (
    SELECT n.*,q.units,q.norm,q.priority,
           CASE n.field WHEN 'PRODUCT_NAME' THEN 0 WHEN 'BRAND_NAME' THEN 1 ELSE 2 END AS field_priority,
           CASE n.kind WHEN 'READING' THEN 1 ELSE 0 END AS form_priority,
           CASE WHEN n.search_text=q.value THEN 0 WHEN n.search_text LIKE q.value||'%' THEN 1 ELSE 2 END AS tier,
           strpos(n.search_text,q.value) AS at,
           length(q.value) AS span
    FROM needles q JOIN product_search_name n ON n.analysis_version=(p_query->>'version')::int
      AND NOT q.initials AND n.kind IN ('DIRECT','READING') AND n.search_text LIKE '%'||q.value||'%'
    UNION ALL
    SELECT n.*,q.units,q.norm,q.priority,
           CASE n.field WHEN 'PRODUCT_NAME' THEN 0 WHEN 'BRAND_NAME' THEN 1 ELSE 2 END,
           CASE n.kind WHEN 'READING_INITIALS' THEN 1 ELSE 0 END,
           CASE WHEN n.search_text SIMILAR TO q.pattern THEN 0
                WHEN n.search_text SIMILAR TO q.pattern||'%' THEN 1 ELSE 2 END,
           regexp_instr(n.search_text,q.pattern),length(q.value)
    FROM needles q JOIN product_search_name n ON n.analysis_version=(p_query->>'version')::int
      AND q.initials AND n.kind IN ('INITIALS','READING_INITIALS') AND n.field<>'BRAND_ENGLISH_NAME'
      AND n.search_text SIMILAR TO '%'||q.pattern||'%'
), matches AS MATERIALIZED (
    SELECT m.*,u.unit FROM name_matches m CROSS JOIN LATERAL unnest(m.units) u(unit)
), whole_fields AS (
    SELECT product_id,field,min(tier) AS tier,min(field_priority) AS field_priority
    FROM matches WHERE unit=0 GROUP BY product_id,field
), whole AS (
    SELECT DISTINCT ON (w.product_id) w.product_id,w.tier,m.field,m.source_text,m.source_starts,m.source_ends,m.at,m.span
    FROM whole_fields w JOIN matches m ON m.product_id=w.product_id AND m.field=w.field AND m.unit=0
    ORDER BY w.product_id,w.tier,w.field_priority,m.priority,m.form_priority
), token_counts AS (
    SELECT product_id,count(DISTINCT unit) AS matched FROM matches WHERE unit>0 GROUP BY product_id
), token_reason AS (
    SELECT DISTINCT ON (product_id) product_id,field,source_text,source_starts,source_ends,at,span
    FROM matches WHERE unit>0
    ORDER BY product_id,field_priority,length(norm) DESC,unit,priority,form_priority
), splits AS (
    SELECT s.value->'brand' AS brand,s.value->'product' AS product
    FROM jsonb_array_elements(p_query->'splits') s
), brand_names AS MATERIALIZED (
    SELECT b.id AS brand_id,n.field,n.kind,n.search_text
    FROM brand b CROSS JOIN LATERAL (SELECT p.id FROM product p WHERE p.brand_id=b.id ORDER BY p.id LIMIT 1) p
    JOIN product_search_name n ON n.product_id=p.id AND n.field<>'PRODUCT_NAME'
                              AND n.analysis_version=(p_query->>'version')::int
), brand_splits AS (
    SELECT DISTINCT b.brand_id,s.product
    FROM splits s JOIN brand_names b
      ON CASE WHEN (p_query->'whole'->>'initials')::boolean THEN b.kind IN ('INITIALS','READING_INITIALS') AND b.field='BRAND_NAME'
                 AND (b.search_text=s.brand->>'norm'
                      OR (length(s.brand->>'norm')>=2 AND b.search_text LIKE (s.brand->>'norm')||'%'))
               ELSE b.kind IN ('DIRECT','READING') AND
                 (b.search_text=s.brand->'expressions'->>0
                  OR (length(s.brand->>'norm')>=2 AND b.search_text LIKE (s.brand->'expressions'->>0)||'%')) END
), combined AS (
    SELECT DISTINCT ON (n.product_id) n.product_id,n.field,n.source_text,n.source_starts,n.source_ends,
           CASE WHEN (p_query->'whole'->>'initials')::boolean THEN strpos(n.search_text,s.product->>'norm')
                ELSE strpos(n.search_text,e.value) END AS at,
           length(e.value) AS span
    FROM brand_splits s JOIN product p ON p.brand_id=s.brand_id
    CROSS JOIN LATERAL jsonb_array_elements_text(s.product->'expressions') WITH ORDINALITY e(value,ord)
    JOIN product_search_name n ON n.product_id=p.id AND n.field='PRODUCT_NAME'
      AND n.analysis_version=(p_query->>'version')::int
      AND CASE WHEN (p_query->'whole'->>'initials')::boolean THEN n.kind IN ('INITIALS','READING_INITIALS')
                 AND n.search_text LIKE '%'||(s.product->>'norm')||'%'
               ELSE n.kind IN ('DIRECT','READING') AND n.search_text LIKE '%'||e.value||'%' END
    ORDER BY n.product_id,length(s.product->>'norm') DESC,(s.product->>'norm') COLLATE "C",e.ord,
             CASE WHEN n.kind IN ('READING','READING_INITIALS') THEN 1 ELSE 0 END
), reasons AS (
    SELECT product_id,0 AS priority,field,source_text,source_starts,source_ends,at,span FROM whole
    UNION ALL SELECT product_id,1,field,source_text,source_starts,source_ends,at,span FROM combined
    UNION ALL SELECT product_id,2,field,source_text,source_starts,source_ends,at,span FROM token_reason
), chosen AS (
    SELECT DISTINCT ON (product_id) * FROM reasons ORDER BY product_id,priority
)
SELECT r.product_id,
       least(coalesce(w.tier,9),CASE WHEN c.product_id IS NOT NULL THEN 2 ELSE 9 END,
             CASE WHEN tc.matched=jsonb_array_length(p_query->'tokens') THEN 2 ELSE 3 END)::smallint,
       CASE WHEN c.product_id IS NOT NULL THEN 1::real
            ELSE coalesce(tc.matched,0)::real / greatest(jsonb_array_length(p_query->'tokens'),1) END,
       coalesce((SELECT sum(v.view_count) FROM product_daily_view v WHERE v.product_id=r.product_id
                  AND v.view_date>(now() AT TIME ZONE 'Asia/Seoul')::date-30
                  AND v.view_date<=(now() AT TIME ZONE 'Asia/Seoul')::date),0)::bigint,
       length(pn.normalized),
       CASE r.field WHEN 'PRODUCT_NAME' THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END,
       r.source_text,r.source_starts[r.at],r.source_ends[r.at+r.span-1]
FROM chosen r
JOIN product_search_name pn ON pn.product_id=r.product_id AND pn.field='PRODUCT_NAME' AND pn.kind='DIRECT'
                              AND pn.analysis_version=(p_query->>'version')::int
LEFT JOIN whole w ON w.product_id=r.product_id
LEFT JOIN combined c ON c.product_id=r.product_id
LEFT JOIN token_counts tc ON tc.product_id=r.product_id
$$;
