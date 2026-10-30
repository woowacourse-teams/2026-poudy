-- 공개 함량 단위에 mg를 더한다. 운영·스테이징은 수동 적재 때 이미 mg를 허용했으므로
-- 같은 이름의 제약을 지우고 다시 만들어 어느 DB에서든 같은 정의가 되게 한다.
ALTER TABLE product_ingredient DROP CONSTRAINT IF EXISTS ck_product_ingredient_amount_unit;
ALTER TABLE product_ingredient ADD CONSTRAINT ck_product_ingredient_amount_unit CHECK (
    disclosed_amount_unit IS NULL OR disclosed_amount_unit IN ('ppm', 'ppb', 'percent', 'mg')
);
