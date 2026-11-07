INSERT INTO brand (id, korean_name) VALUES (94000, '비교 브랜드');
INSERT INTO category (id, parent_id, name, depth) VALUES
    (94000, NULL, '클렌징', 0),
    (94001, 94000, '비교 클렌저', 1);

INSERT INTO product (id, brand_id, category_id, product_name, updated_at, is_sensitive_skin) VALUES
    (94001, 94000, 2, '복수 구성품 비교 제품', now(), FALSE),
    (94002, 94000, 14, '다른 카테고리 비교 제품', now(), TRUE),
    (94003, 94000, 94001, '유수분 미제공 제품', now(), FALSE),
    (94004, 94000, 2, '구성품 없는 제품', now(), FALSE),
    (94005, 94000, 2, '빈 성분 제품', now(), FALSE);

INSERT INTO product_mark (product_id, mark_code) VALUES
    (94002, 'MINERAL'),
    (94002, 'EASY_WASH'),
    (94002, 'WATERPROOF'),
    (94002, 'DAISO');

INSERT INTO product_variant (id, product_id, display_order, price, volume_value, volume_unit, status) VALUES
    (94201, 94001, 0, 10000, 50, 'ml', 'active'),
    (94202, 94001, 1, 18000, 100, 'ml', 'discontinued'),
    (94203, 94002, 0, 15000, 30, 'g', 'active'),
    (94204, 94003, 0, 20000, 200, 'ml', 'active'),
    (94205, 94004, 0, 12000, 20, 'g', 'active'),
    (94206, 94005, 0, 9000, 100, 'ml', 'active');

INSERT INTO product_component (id, product_id, display_order, name, moisture_level, oil_level)
OVERRIDING SYSTEM VALUE VALUES
    (94101, 94001, 0, '1제', 0.24, 0.25),
    (94102, 94001, 1, '2제', 2.24, 2.75),
    (94103, 94001, 2, '3제', 1.5, 1),
    (94104, 94002, 0, NULL, 1, 0),
    (94105, 94003, 0, NULL, NULL, NULL),
    (94106, 94005, 0, NULL, 0, 0);

INSERT INTO product_ingredient (component_id, ingredient_id, display_order) VALUES
    (94101, 9, 0),
    (94101, 20, 1),
    (94102, 2, 0),
    (94103, 9, 0),
    (94104, 20, 0),
    (94105, 9, 0);

INSERT INTO tag (category_code, code, name) VALUES
    ('BIOLOGICAL_EFFECT', 'COMPARISON_A', '비교 작용 A'),
    ('BIOLOGICAL_EFFECT', 'COMPARISON_B', '비교 작용 B'),
    ('BIOLOGICAL_EFFECT', 'COMPARISON_C', '비교 작용 C'),
    ('BIOLOGICAL_EFFECT', 'COMPARISON_D', '비교 작용 D');
INSERT INTO ingredient_tag (ingredient_id, tag_code, display_order) VALUES
    (9, 'COMPARISON_A', 100),
    (9, 'COMPARISON_B', 101),
    (9, 'COMPARISON_C', 102),
    (9, 'COMPARISON_D', 103);
INSERT INTO ingredient_source (ingredient_id, type, content) VALUES (9, 'EFFECT', '비교 테스트 작용 근거');
INSERT INTO ingredient_group_ingredient (group_code, ingredient_id, display_order) VALUES ('SULFATES', 9, 999);
