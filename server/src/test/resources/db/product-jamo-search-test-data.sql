-- 상품 검색의 조합·분리 입력(#795) 사례. search-test-data.sql 다음에 넣는다.
-- 이름은 '젤리'로 시작하게 해 기존 검색 사례와 섞이지 않게 한다.
INSERT INTO brand (id, korean_name, english_name) VALUES
    (90100, '자모브랜드', 'JAMO LAB'),
    (90101, '자모크', NULL);

INSERT INTO product (id, brand_id, category_id, product_name, moisture_level, oil_level, updated_at) VALUES
    (90101, 90100, 2, '젤리크림', 1, 1, now()),
    (90102, 90100, 2, '젤리크램', 1, 1, now()),
    (90103, 90100, 2, '젤리크리스탈', 1, 1, now()),
    (90104, 90100, 2, '젤리과일', 1, 1, now()),
    (90105, 90100, 2, '젤리닭가슴살', 1, 1, now()),
    (90106, 90100, 2, '젤리달고나', 1, 1, now()),
    (90107, 90100, 2, '젤리수분크림', 1, 1, now()),
    (90108, 90100, 2, '젤리클렌저', 1, 1, now()),
    (90109, 90101, 2, '림프 세럼', 1, 1, now()),
    (90110, 90100, 2, '젤리 PDRN 앰플', 1, 1, now());

INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
SELECT id, id, 0, 2000 - (id - 90100) * 10, 100, 'ml', 'active' FROM product WHERE id BETWEEN 90101 AND 90110;

REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW search_vocabulary;
