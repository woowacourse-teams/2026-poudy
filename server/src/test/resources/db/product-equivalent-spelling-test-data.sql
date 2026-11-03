INSERT INTO product (id, brand_id, category_id, product_name, updated_at) VALUES
    (90100, 90002, 2, '수분 선크림 차단', now()),
    (90101, 90002, 2, '수분 썬크림 차단', now()),
    (90102, 90002, 2, '선크림 썬크림 차단', now()),
    (90103, 90000, 2, '수분 선크림 차단', now()),
    (90104, 90000, 2, '수분 썬크림 차단', now()),
    (90105, 90002, 2, '검증스네일 선크림 차단', now()),
    (90106, 90002, 2, '검증스네일 썬크림 차단', now()),
    (90107, 90002, 2, '수분 크림', now()),
    (90108, 90002, 2, '선세럼 선스틱 썬스틱', now()),
    (90109, 90002, 2, '선물 썬물', now());

INSERT INTO product_component (product_id, display_order, moisture_level, oil_level) VALUES
    (90100, 0, 2, 1),
    (90101, 0, 2, 1),
    (90102, 0, 1, 1),
    (90103, 0, 2, 1),
    (90104, 0, 2, 1),
    (90105, 0, 1, 1),
    (90106, 0, 1, 1),
    (90107, 0, 2, 1),
    (90108, 0, 1, 1),
    (90109, 0, 1, 1);

INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
SELECT id, id, 0, 1000 + (id - 90100) * 100, 50, 'ml', 'active'
FROM product WHERE id BETWEEN 90100 AND 90109;

REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW search_vocabulary;
