CREATE TABLE badge (
    code       VARCHAR(50)  NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_badge PRIMARY KEY (code),
    CONSTRAINT ck_badge_code_not_blank CHECK (code <> '' AND code !~ '[[:space:]]'),
    CONSTRAINT ck_badge_name_not_blank CHECK (name <> '' AND name !~ '[[:space:]]')
);

CREATE TABLE product_badge (
    product_id BIGINT      NOT NULL,
    badge_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_badge PRIMARY KEY (product_id, badge_code),
    CONSTRAINT fk_product_badge_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT fk_product_badge_badge FOREIGN KEY (badge_code) REFERENCES badge (code)
);

CREATE INDEX ix_product_badge_badge_product ON product_badge (badge_code, product_id);

CREATE FUNCTION reject_badge_code_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION '배지 코드는 바꾸지 않는다 (% → %).', OLD.code, NEW.code
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER tg_badge_reject_code_update BEFORE UPDATE OF code ON badge
    FOR EACH ROW EXECUTE FUNCTION reject_badge_code_change();
