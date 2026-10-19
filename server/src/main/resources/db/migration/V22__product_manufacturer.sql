CREATE TABLE manufacturer (
    id         BIGINT       NOT NULL,
    name       VARCHAR(200) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_manufacturer PRIMARY KEY (id),
    CONSTRAINT ux_manufacturer_name UNIQUE (name),
    CONSTRAINT ck_manufacturer_name_nfc CHECK (name IS NFC NORMALIZED),
    CONSTRAINT ck_manufacturer_name_not_blank CHECK (name !~ '^\s*$')
);

ALTER TABLE product
    ADD COLUMN manufacturer_id BIGINT NULL,
    ADD COLUMN manufacturing_country CHAR(2) NULL,
    ADD CONSTRAINT fk_product_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturer (id),
    ADD CONSTRAINT ck_product_manufacturing_country CHECK (manufacturing_country IN (
        'KR', 'AU', 'FR', 'CA', 'US', 'JP', 'GB', 'TH', 'BE', 'CN', 'CH'
    ));
