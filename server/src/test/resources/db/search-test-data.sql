INSERT INTO brand (id, korean_name, english_name) VALUES
    (90000, '검증브랜드', 'TEST BRAND'),
    (90001, '라운드랩', 'ROUND LAB'),
    (90002, '닥터지', 'Dr.G');

INSERT INTO product (id, brand_id, category_id, product_name, moisture_level, oil_level, updated_at) VALUES
    (90001, 90000, 2, '검증토너', 1, 1, now()),
    (90002, 90000, 2, '검증토너수', 1, 1, now()),
    (90003, 90000, 2, '물검증토너', 1, 1, now()),
    (90004, 90000, 2, '검증토너물', 1, 1, now()),
    (90005, 90000, 2, 'PDRN 검증 크림', 1, 1, now()),
    (90006, 90001, 2, '검증독도 토너', 1, 1, now()),
    (90007, 90002, 2, '블랙검증', 1, 1, now()),
    (90008, 90000, 2, '검증수분 진정 검증토너', 1, 1, now()),
    (90009, 90000, 2, '가나다라마바사아자차', 1, 1, now()),
    (90010, 90000, 2, '빨간검증', 1, 1, now()),
    (90011, 90000, 2, '바보검증', 1, 1, now()),
    (90012, 90000, 2, '검증스네일 세럼', 1, 1, now()),
    (90013, 90000, 2, '😀검증젤', 1, 1, now()),
    (90014, 90000, 2, '검증 비타민C', 1, 1, now());

INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
SELECT id, id, 0, 1000, 100, 'ml', 'active' FROM product WHERE id BETWEEN 90001 AND 90014;

INSERT INTO ingredient (id, korean_name, english_name, description, updated_at) VALUES
    (90001, '계약성분유도체', 'Contract Derivative', '', now()),
    (90002, '다른계약물질', 'Other Contract', '', now()),
    (90003, '검증복합성분', NULL, '', now()),
    (90004, '빨간검증추출물', NULL, '', now()),
    (90005, '바보검증추출물', NULL, '', now()),
    (90006, '검증스네일원료', NULL, '', now()),
    (90007, 'PDRN 검증성분', 'PDRN TEST', '', now()),
    (90008, '검증단독영문', 'Only Latin', '', now());

INSERT INTO ingredient_alias (ingredient_id, display_order, alias) VALUES
    (90002, 0, '계약성분'),
    (90003, 0, '계약수분'),
    (90003, 1, '계약진정'),
    (90007, 0, '피디알엔 검증성분');

INSERT INTO product_daily_view (view_date, product_id, view_count) VALUES
    ((now() AT TIME ZONE 'Asia/Seoul')::date - 30, 90002, 10000),
    ((now() AT TIME ZONE 'Asia/Seoul')::date - 29, 90004, 2),
    ((now() AT TIME ZONE 'Asia/Seoul')::date, 90004, 3),
    ((now() AT TIME ZONE 'Asia/Seoul')::date + 1, 90002, 10000);

REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW ingredient_search_term;
REFRESH MATERIALIZED VIEW search_vocabulary;
