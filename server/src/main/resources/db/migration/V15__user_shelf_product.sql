CREATE TABLE user_shelf_product (
    user_id               BIGINT           NOT NULL,
    product_id            BIGINT           NOT NULL,
    usage_status          VARCHAR(20)      NOT NULL,
    rating_preference     VARCHAR(20)      NULL,
    rating_moisture_level DOUBLE PRECISION NULL,
    rating_oil_level      DOUBLE PRECISION NULL,
    created_at            TIMESTAMP        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at            TIMESTAMP        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_user_shelf_product PRIMARY KEY (user_id, product_id),
    CONSTRAINT fk_user_shelf_product_member FOREIGN KEY (user_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_shelf_product_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_user_shelf_product_usage_status CHECK (usage_status IN ('IN_USE', 'USED')),
    CONSTRAINT ck_user_shelf_product_rating_preference CHECK (
        rating_preference IS NULL OR rating_preference IN ('GOOD', 'BAD')
    ),
    CONSTRAINT ck_user_shelf_product_rating_moisture_level CHECK (
        rating_moisture_level IS NULL OR rating_moisture_level IN (0, 0.5, 1, 1.5, 2, 2.5, 3)
    ),
    CONSTRAINT ck_user_shelf_product_rating_oil_level CHECK (
        rating_oil_level IS NULL OR rating_oil_level IN (0, 0.5, 1, 1.5, 2, 2.5, 3)
    )
);
