-- 구버전 서버와 badge/product_badge 직접 적재 경로가 종료된 다음 배포에서만 실행한다.
-- 이 파일을 그 배포의 다음 V번호 마이그레이션으로 승격한다. V26과 함께 실행하지 않는다.
DROP VIEW product_mark;
DROP VIEW mark;
ALTER TABLE badge RENAME TO mark;
ALTER TABLE product_badge RENAME TO product_mark;
ALTER TABLE product_mark RENAME COLUMN badge_code TO mark_code;
ALTER TABLE mark RENAME CONSTRAINT pk_badge TO pk_mark;
ALTER TABLE product_mark RENAME CONSTRAINT pk_product_badge TO pk_product_mark;
ALTER TABLE product_mark RENAME CONSTRAINT fk_product_badge_product TO fk_product_mark_product;
ALTER TABLE product_mark RENAME CONSTRAINT fk_product_badge_badge TO fk_product_mark_mark;
ALTER INDEX ix_product_badge_badge_product RENAME TO ix_product_mark_mark_product;
