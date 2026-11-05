UPDATE product_component pc
SET moisture_level = NULL, oil_level = NULL
FROM product p
JOIN category c ON c.id = p.category_id
LEFT JOIN category root ON root.id = c.parent_id
WHERE pc.product_id = p.id
  AND coalesce(root.name, c.name) IN ('향수', '클렌징')
  AND (pc.moisture_level IS NOT NULL OR pc.oil_level IS NOT NULL);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM product_component pc
        JOIN product p ON p.id = pc.product_id
        JOIN category c ON c.id = p.category_id
        LEFT JOIN category root ON root.id = c.parent_id
        WHERE coalesce(root.name, c.name) NOT IN ('향수', '클렌징')
          AND (pc.moisture_level IS NULL OR pc.oil_level IS NULL)
    ) THEN
        RAISE EXCEPTION '향수·클렌징 외 구성품에는 수분감과 유분감이 모두 필요합니다.'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_product_component_sensory_category';
    END IF;
END $$;

CREATE FUNCTION validate_component_sensory_category() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    product_ids bigint[];
BEGIN
    IF TG_TABLE_NAME = 'product_component' THEN
        product_ids := ARRAY[NEW.product_id];
    ELSIF TG_TABLE_NAME = 'product' THEN
        product_ids := ARRAY[NEW.id];
    ELSE
        SELECT array_agg(p.id ORDER BY p.id) INTO product_ids
        FROM product p JOIN category c ON c.id = p.category_id
        WHERE c.id = NEW.id OR c.parent_id = NEW.id;
    END IF;

    PERFORM id FROM category
    WHERE id IN (
        SELECT category_id FROM product WHERE id = ANY(product_ids)
        UNION
        SELECT c.parent_id FROM product p JOIN category c ON c.id = p.category_id
        WHERE p.id = ANY(product_ids)
    ) ORDER BY id FOR SHARE;

    PERFORM id FROM product WHERE id = ANY(product_ids) ORDER BY id FOR NO KEY UPDATE;

    IF EXISTS (
        SELECT 1 FROM product_component pc
        JOIN product p ON p.id = pc.product_id
        JOIN category c ON c.id = p.category_id
        LEFT JOIN category root ON root.id = c.parent_id
        WHERE p.id = ANY(product_ids) AND (
            (coalesce(root.name, c.name) IN ('향수', '클렌징')
                AND (pc.moisture_level IS NOT NULL OR pc.oil_level IS NOT NULL))
            OR (coalesce(root.name, c.name) NOT IN ('향수', '클렌징')
                AND (pc.moisture_level IS NULL OR pc.oil_level IS NULL))
        )
    ) THEN
        RAISE EXCEPTION '향수·클렌징의 유수분은 모두 null이어야 하고 나머지 구성품에는 두 값이 모두 필요합니다.'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_product_component_sensory_category';
    END IF;
    RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER check_component_sensory_category
AFTER INSERT OR UPDATE ON product_component
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_component_sensory_category();

CREATE CONSTRAINT TRIGGER check_product_sensory_category
AFTER UPDATE ON product
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id)
EXECUTE FUNCTION validate_component_sensory_category();

CREATE CONSTRAINT TRIGGER check_category_sensory_category
AFTER UPDATE ON category
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name OR OLD.parent_id IS DISTINCT FROM NEW.parent_id)
EXECUTE FUNCTION validate_component_sensory_category();
