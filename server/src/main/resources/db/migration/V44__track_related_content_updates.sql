-- 주요 콘텐츠 변경의 시각은 적재자가 부모 행을 수동 갱신하는 데 기대지 않는다.
-- 상세에 표시하지 않는 피부 필터 분류는 기존 적재의 집합 비교로 관리한다.
-- 조회수·사용자 데이터에는 연결하지 않는다. updated_at만 지정한 이력 복원은 허용한다.
CREATE FUNCTION seo_stamp_content_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (to_jsonb(OLD) - 'updated_at' - 'created_at' - 'is_sensitive_skin')
        IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at' - 'created_at' - 'is_sensitive_skin') THEN
        NEW.updated_at := greatest(NEW.updated_at, statement_timestamp() AT TIME ZONE 'Asia/Seoul');
    END IF;
    RETURN NEW;
END $$;

CREATE FUNCTION seo_touch_products(ids bigint[]) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    -- 추천 카드에 표시되는 대상 제품의 가격·이름·성분 변경도 직접 참조하는 페이지에 반영한다.
    -- updated_at만의 변경은 seo_related가 전파하지 않으므로 추천 그래프의 순환도 종료된다.
    UPDATE product SET updated_at = greatest(updated_at, statement_timestamp() AT TIME ZONE 'Asia/Seoul')
    WHERE updated_at < (statement_timestamp() AT TIME ZONE 'Asia/Seoul')
    AND (id = ANY(ids) OR id IN (
        SELECT source.product_id FROM product_similarity similarity
        JOIN product_component source ON source.id = similarity.component_id
        JOIN product_component target ON target.id = similarity.similar_component_id
        WHERE target.product_id = ANY(ids)
    ));
END $$;

CREATE FUNCTION seo_touch_ingredients(ids bigint[]) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE ingredient SET updated_at = greatest(updated_at, statement_timestamp() AT TIME ZONE 'Asia/Seoul')
    WHERE id = ANY(ids) AND updated_at < (statement_timestamp() AT TIME ZONE 'Asia/Seoul');
    PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE id IN (SELECT pc.product_id FROM product_component pc
        JOIN product_ingredient pi ON pi.component_id = pc.id WHERE pi.ingredient_id = ANY(ids))));
END $$;

CREATE FUNCTION seo_touch_related_content() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_row jsonb := to_jsonb(OLD);
    new_row jsonb := to_jsonb(NEW);
    ids bigint[];
    codes text[];
BEGIN
    IF TG_OP = 'UPDATE' AND (old_row - 'updated_at' - 'created_at' - 'is_sensitive_skin')
        IS NOT DISTINCT FROM (new_row - 'updated_at' - 'created_at' - 'is_sensitive_skin') THEN RETURN NULL; END IF;

    IF TG_TABLE_NAME IN ('product_variant', 'product_component',
        'product_badge', 'product_attribute_value') THEN
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
    ELSIF TG_TABLE_NAME = 'badge' THEN
        PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE id IN (SELECT product_id FROM product_badge WHERE badge_code IN (old_row->>'code', new_row->>'code'))));
    ELSIF TG_TABLE_NAME IN ('attribute', 'attribute_value') THEN
        ids := ARRAY[(old_row->>'id')::bigint, (new_row->>'id')::bigint,
                     (old_row->>'attribute_id')::bigint, (new_row->>'attribute_id')::bigint];
        PERFORM seo_touch_products(ARRAY(SELECT id FROM product WHERE id IN (SELECT product_id FROM product_attribute_value WHERE attribute_id = ANY(ids))));
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

DO $$ DECLARE relation text; BEGIN
    FOREACH relation IN ARRAY ARRAY['product', 'ingredient', 'brand', 'category', 'manufacturer', 'curation',
        'ingredient_group', 'tag', 'badge', 'attribute', 'attribute_value', 'product_variant', 'product_component',
        'product_ingredient', 'ingredient_alias', 'ingredient_source', 'ingredient_tag', 'ingredient_group_ingredient',
        'product_badge', 'product_attribute_value'] LOOP
        EXECUTE format('CREATE TRIGGER seo_stamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION seo_stamp_content_update()', relation);
    END LOOP;
    FOREACH relation IN ARRAY ARRAY['product', 'ingredient', 'brand', 'category', 'manufacturer',
        'ingredient_group', 'tag', 'badge', 'attribute', 'attribute_value', 'product_variant', 'product_component',
        'product_ingredient', 'product_similarity', 'ingredient_alias', 'ingredient_source', 'ingredient_tag',
        'ingredient_group_ingredient', 'product_badge', 'product_attribute_value'] LOOP
        EXECUTE format('CREATE TRIGGER seo_related AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION seo_touch_related_content()', relation);
    END LOOP;
END $$;
