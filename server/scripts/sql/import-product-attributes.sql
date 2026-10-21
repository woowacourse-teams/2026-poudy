-- psql -v ON_ERROR_STOP=1 -v category_id=<검증한 선케어 대분류 ID> -f scripts/sql/import-product-attributes.sql
-- 구버전 서버 종료 후 실제 badge 코드 목록을 확인하고 매핑을 확정한 뒤 실행한다.
-- 직렬화 실패(40001)는 이 파일 전체를 재실행한다. 추정한 제품별 속성값은 추가하지 않는다.
BEGIN ISOLATION LEVEL SERIALIZABLE;

INSERT INTO category_attribute(category_id, attribute_id, display_order)
SELECT :category_id, id, CASE code WHEN 'UV_FILTER_TYPE' THEN 0 WHEN 'WASHABILITY' THEN 1 ELSE 2 END
FROM attribute WHERE code IN ('UV_FILTER_TYPE', 'WASHABILITY', 'WATER_RESISTANCE')
ON CONFLICT (category_id, attribute_id) DO NOTHING;

CREATE TEMP TABLE legacy_attribute_badge_mapping (
    badge_code VARCHAR(50) PRIMARY KEY,
    attribute_code VARCHAR(50) NOT NULL,
    value_code VARCHAR(50) NOT NULL
) ON COMMIT DROP;
INSERT INTO legacy_attribute_badge_mapping VALUES
    ('MINERAL', 'UV_FILTER_TYPE', 'MINERAL'),
    ('ORGANIC', 'UV_FILTER_TYPE', 'ORGANIC'),
    ('HYBRID', 'UV_FILTER_TYPE', 'HYBRID'),
    ('EASY_WASH', 'WASHABILITY', 'EASY_WASH'),
    ('WATERPROOF', 'WATER_RESISTANCE', 'WATERPROOF');

-- 매핑되지 않은 표식은 그대로 보존하고 확인 대상으로 출력한다.
SELECT pb.badge_code, count(*) FROM product_badge pb
WHERE pb.badge_code <> 'DAISO'
  AND NOT EXISTS (SELECT 1 FROM legacy_attribute_badge_mapping m WHERE m.badge_code = pb.badge_code)
GROUP BY pb.badge_code ORDER BY pb.badge_code;

-- 같은 속성의 서로 다른 값이나 기존 제품값과의 충돌은 전체 적재를 실패시킨다.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM legacy_attribute_badge_mapping m
        LEFT JOIN attribute a ON a.code = m.attribute_code
        LEFT JOIN attribute_value av ON av.attribute_id = a.id AND av.value_code = m.value_code
        WHERE av.attribute_id IS NULL
    ) THEN
        RAISE EXCEPTION '이관할 속성·선택값 정의가 없다.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT pb.product_id, m.attribute_code FROM product_badge pb
        JOIN legacy_attribute_badge_mapping m ON m.badge_code = pb.badge_code
        GROUP BY pb.product_id, m.attribute_code HAVING count(DISTINCT m.value_code) > 1
    ) OR EXISTS (
        SELECT 1 FROM product_badge pb
        JOIN legacy_attribute_badge_mapping m ON m.badge_code = pb.badge_code
        JOIN attribute a ON a.code = m.attribute_code
        JOIN product_attribute_value pav ON pav.product_id = pb.product_id AND pav.attribute_id = a.id
        WHERE pav.value_code <> m.value_code
    ) THEN
        RAISE EXCEPTION '기존 배지와 제품별 속성값이 충돌한다.' USING ERRCODE = '23514';
    END IF;
END $$;

INSERT INTO product_attribute_value(product_id, attribute_id, value_code, created_at, updated_at)
SELECT pb.product_id, a.id, m.value_code, pb.created_at, pb.updated_at FROM product_badge pb
JOIN legacy_attribute_badge_mapping m ON m.badge_code = pb.badge_code
JOIN attribute a ON a.code = m.attribute_code
ON CONFLICT (product_id, attribute_id) DO NOTHING;

DELETE FROM product_badge pb USING legacy_attribute_badge_mapping m, attribute a
WHERE pb.badge_code = m.badge_code AND a.code = m.attribute_code
    AND EXISTS (SELECT 1 FROM product_attribute_value pav
        WHERE pav.product_id = pb.product_id AND pav.attribute_id = a.id AND pav.value_code = m.value_code);
COMMIT;
