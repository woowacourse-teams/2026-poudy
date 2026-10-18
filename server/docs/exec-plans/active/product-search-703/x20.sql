-- 스냅샷 501개를 이름 끝에 단어 하나를 붙여 19벌 더 만든다(id + 1000 * k). 브랜드·카테고리·가격은 원본과 같다.
BEGIN;
INSERT INTO product (id, brand_id, category_id, product_name, image_url, moisture_level, oil_level, updated_at, created_at, is_sensitive_skin)
SELECT p.id + 1000 * k, p.brand_id, p.category_id,
       p.product_name || ' ' || (ARRAY['리필','기획','대용량','미니','듀오','세트','스페셜','리뉴얼','한정판','트래블',
                                      '라이트','리치','마일드','데일리','플러스','프로','에디션','오리지널','포맨'])[k],
       p.image_url, p.moisture_level, p.oil_level, p.updated_at, p.created_at, p.is_sensitive_skin
FROM product p, generate_series(1, 19) k
WHERE p.id < 1000;
INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status, created_at, updated_at)
SELECT v.id + 1000 * k, v.product_id + 1000 * k, v.display_order, v.price, v.volume_value, v.volume_unit, v.status, v.created_at, v.updated_at
FROM product_variant v, generate_series(1, 19) k
WHERE v.product_id < 1000;
COMMIT;
