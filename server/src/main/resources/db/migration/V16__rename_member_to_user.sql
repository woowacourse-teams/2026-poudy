INSERT INTO skin_type (code, name) VALUES
    ('DRY', '건성'),
    ('OILY', '지성'),
    ('SENSITIVE', '민감성'),
    ('COMBINATION', '복합성')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE member RENAME TO "user";
ALTER SEQUENCE member_id_seq RENAME TO user_id_seq;
ALTER TABLE "user" RENAME CONSTRAINT pk_member TO pk_user;
ALTER TABLE "user" RENAME CONSTRAINT ux_member_oauth TO ux_user_oauth;
ALTER TABLE "user" RENAME CONSTRAINT ux_member_email TO ux_user_email;
ALTER TABLE "user" RENAME CONSTRAINT ck_member_oauth_provider TO ck_user_oauth_provider;
ALTER TABLE "user" RENAME CONSTRAINT ck_member_oauth_provider_id_not_blank TO ck_user_oauth_provider_id_not_blank;
ALTER TABLE "user" RENAME CONSTRAINT ck_member_email_normalized TO ck_user_email_normalized;
ALTER TABLE "user" RENAME CONSTRAINT ck_member_age_range TO ck_user_age_range;
ALTER TABLE "user" RENAME CONSTRAINT ck_member_gender TO ck_user_gender;
ALTER TABLE "user" RENAME CONSTRAINT ck_member_restore_request TO ck_user_restore_request;
ALTER TABLE "user"
    DROP CONSTRAINT ck_member_skin_type,
    ADD COLUMN is_sensitive_skin BOOLEAN NULL,
    ADD CONSTRAINT fk_user_skin_type FOREIGN KEY (skin_type) REFERENCES skin_type (code);

ALTER TABLE member_saved_product RENAME TO user_wishlist_product;
ALTER TABLE user_wishlist_product RENAME COLUMN member_id TO user_id;
ALTER TABLE user_wishlist_product RENAME CONSTRAINT pk_member_saved_product TO pk_user_wishlist_product;
ALTER TABLE user_wishlist_product RENAME CONSTRAINT fk_member_saved_product_member TO fk_user_wishlist_product_user;
ALTER TABLE user_wishlist_product RENAME CONSTRAINT fk_member_saved_product_product TO fk_user_wishlist_product_product;
ALTER INDEX ix_member_saved_product_member_created_at RENAME TO ix_user_wishlist_product_user_created_at;

ALTER TABLE user_shelf_product RENAME CONSTRAINT fk_user_shelf_product_member TO fk_user_shelf_product_user;
ALTER TABLE user_skin_filter_ingredient
    RENAME CONSTRAINT fk_user_skin_filter_ingredient_member TO fk_user_skin_filter_ingredient_user;

ALTER TABLE product
    DROP CONSTRAINT ck_product_moisture_level,
    DROP CONSTRAINT ck_product_oil_level,
    ALTER COLUMN moisture_level TYPE DOUBLE PRECISION,
    ALTER COLUMN oil_level TYPE DOUBLE PRECISION,
    ADD COLUMN is_sensitive_skin BOOLEAN NOT NULL DEFAULT false,
    ADD CONSTRAINT ck_product_moisture_level CHECK (moisture_level BETWEEN 0 AND 3),
    ADD CONSTRAINT ck_product_oil_level CHECK (oil_level BETWEEN 0 AND 3);
