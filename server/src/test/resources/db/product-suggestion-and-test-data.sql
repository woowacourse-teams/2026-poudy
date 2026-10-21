INSERT INTO brand (id, korean_name, english_name) VALUES
    (90003, '에스트라', 'AESTURA');

INSERT INTO product (id, brand_id, category_id, product_name, moisture_level, oil_level, updated_at) VALUES
    (90015, 90003, 2, '아토베리어 로션', 1, 1, now()),
    (90016, 90003, 2, '아토베리어 크림', 1, 1, now()),
    (90017, 90002, 2, '레드 로션', 1, 1, now()),
    (90018, 90002, 2, '레드 앰플', 1, 1, now()),
    (90019, 90000, 2, '로션 앰플', 1, 1, now()),
    (90020, 90003, 2, '수딩 로션', 1, 1, now());

INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
SELECT id, id, 0, 1000, 100, 'ml', 'active' FROM product WHERE id BETWEEN 90015 AND 90020;

REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW search_vocabulary;
