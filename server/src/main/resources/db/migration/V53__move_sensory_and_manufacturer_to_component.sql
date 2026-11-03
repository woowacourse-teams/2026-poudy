ALTER TABLE product_component
    ADD COLUMN moisture_level DOUBLE PRECISION NULL,
    ADD COLUMN oil_level DOUBLE PRECISION NULL,
    ADD COLUMN manufacturer_id BIGINT NULL,
    ADD COLUMN manufacturing_country CHAR(2) NULL;

ALTER TABLE product_component DISABLE TRIGGER seo_stamp;
ALTER TABLE product_component DISABLE TRIGGER seo_related;

UPDATE product_component pc
SET moisture_level = p.moisture_level,
    oil_level = p.oil_level,
    manufacturer_id = p.manufacturer_id,
    manufacturing_country = p.manufacturing_country
FROM product p
WHERE p.id = pc.product_id;

ALTER TABLE product_component ENABLE TRIGGER seo_stamp;
ALTER TABLE product_component ENABLE TRIGGER seo_related;

ALTER TABLE product_component
    ALTER COLUMN moisture_level SET NOT NULL,
    ALTER COLUMN oil_level SET NOT NULL,
    ADD CONSTRAINT ck_product_component_moisture_level CHECK (moisture_level BETWEEN 0 AND 3),
    ADD CONSTRAINT ck_product_component_oil_level CHECK (oil_level BETWEEN 0 AND 3),
    ADD CONSTRAINT fk_product_component_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturer (id),
    ADD CONSTRAINT ck_product_component_manufacturing_country CHECK (manufacturing_country IN (
        'KR', 'AU', 'FR', 'CA', 'US', 'JP', 'GB', 'TH', 'BE', 'CN', 'CH'
    ));

ALTER TABLE product
    DROP COLUMN moisture_level,
    DROP COLUMN oil_level,
    DROP COLUMN manufacturer_id,
    DROP COLUMN manufacturing_country;

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
        IF TG_TABLE_NAME = 'product_component' AND (TG_OP <> 'UPDATE'
            OR (old_row - 'updated_at' - 'moisture_level' - 'oil_level' - 'manufacturer_id' - 'manufacturing_country')
                IS DISTINCT FROM (new_row - 'updated_at' - 'moisture_level' - 'oil_level' - 'manufacturer_id' - 'manufacturing_country')) THEN
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
            PERFORM seo_touch_products(ARRAY(SELECT product_id FROM product_component WHERE manufacturer_id = ANY(ids)));
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
