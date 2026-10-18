-- 최근 조회수: 측정하는 날 기준 30일 창 안에 결정적으로 만든다(id % 3 <> 0 인 제품, 하루 1~13회).
DELETE FROM product_daily_view;
INSERT INTO product_daily_view (view_date, product_id, view_count)
SELECT (now() AT TIME ZONE 'Asia/Seoul')::date - d, p.id, 1 + (p.id * 7 + d) % 13
FROM product p, generate_series(0, 29) d
WHERE p.id % 3 <> 0;
