INSERT INTO brand (id, korean_name, english_name) VALUES
    (91000, '연관브랜드', 'RELATED BRAND'),
    (91001, '다른연관', 'OTHER RELATED'),
    (91002, '에스트라검증', 'AESTURA TEST');

INSERT INTO product (id, brand_id, category_id, product_name, moisture_level, oil_level, updated_at) VALUES
    (91001, 91000, 2, '수분 연관토너', 1, 1, now()),
    (91002, 91000, 2, '수분 연관토너 대용량', 1, 1, now()),
    (91003, 91001, 2, '진정 연관토너', 1, 1, now()),
    (91004, 91001, 2, '50ml 연관토너', 1, 1, now()),
    (91005, 91001, 2, '1+1 연관토너', 1, 1, now()),
    (91006, 91001, 2, '[기획] 연관토너', 1, 1, now()),
    (91007, 91001, 2, '123 연관토너', 1, 1, now()),
    (91008, 91001, 2, 'ＳＯＯＴＨ 연관토너', 1, 1, now()),
    (91009, 91001, 2, 'SOOTH 연관토너', 1, 1, now()),
    (91010, 91001, 2, 'SOOTH 연관토너 대용량', 1, 1, now()),
    (91011, 91000, 2, '😀보습 연관토너', 1, 1, now()),
    (91012, 91000, 2, '긴수식 연관토너', 1, 1, now()),
    (91013, 91002, 2, '연관크림', 1, 1, now()),
    (91014, 91000, 2, '보습 PDRN 연관세럼', 1, 1, now()),
    (91015, 91000, 2, '토너 연관토너', 1, 1, now());

INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
SELECT id, id, 0, 1000, 100, 'ml', 'active' FROM product WHERE id BETWEEN 91001 AND 91015;

INSERT INTO product_mark (product_id, mark_code) VALUES (91001, 'DAISO');

REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW search_vocabulary;
