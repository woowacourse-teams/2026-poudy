-- 선반 평가를 담거나 고칠 때마다 평가한 순간의 프로필과 함께 한 줄씩 쌓는다.
-- 탈퇴 회원을 파기하면 회원 번호만 비우고 나머지는 남긴다. 정확한 시각은 남기지 않고 날짜만 둔다.
-- 프로필 열은 코드가 바뀌어도 과거 기록을 당시 값 그대로 두도록 CHECK 와 FK 를 두지 않는다.
CREATE TABLE user_shelf_product_history (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id               BIGINT           NULL,
    product_id            BIGINT           NOT NULL,
    usage_status          VARCHAR(20)      NOT NULL,
    rating_preference     VARCHAR(20)      NULL,
    rating_moisture_level DOUBLE PRECISION NULL,
    rating_oil_level      DOUBLE PRECISION NULL,
    gender                VARCHAR(10)      NULL,
    age_range             VARCHAR(20)      NULL,
    skin_type             VARCHAR(20)      NULL,
    is_sensitive_skin     BOOLEAN          NULL,
    recorded_on           DATE             NOT NULL,
    is_current            BOOLEAN          NOT NULL,
    CONSTRAINT pk_user_shelf_product_history PRIMARY KEY (id),
    CONSTRAINT fk_user_shelf_product_history_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL,
    CONSTRAINT fk_user_shelf_product_history_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_user_shelf_product_history_usage_status CHECK (usage_status IN ('IN_USE', 'USED')),
    CONSTRAINT ck_user_shelf_product_history_rating_preference CHECK (
        rating_preference IS NULL OR rating_preference IN ('GOOD', 'BAD')
    ),
    CONSTRAINT ck_user_shelf_product_history_rating_moisture_level CHECK (
        rating_moisture_level IS NULL OR rating_moisture_level IN (0, 0.5, 1, 1.5, 2, 2.5, 3)
    ),
    CONSTRAINT ck_user_shelf_product_history_rating_oil_level CHECK (
        rating_oil_level IS NULL OR rating_oil_level IN (0, 0.5, 1, 1.5, 2, 2.5, 3)
    )
);

CREATE INDEX ix_user_shelf_product_history_user_product ON user_shelf_product_history (user_id, product_id);

-- 회원·제품·프로필마다 최신 평가는 하나다. 회원 번호를 비운 줄은 서로 다른 회원의 기록일 수 있어 뺀다.
CREATE UNIQUE INDEX ux_user_shelf_product_history_current
    ON user_shelf_product_history (user_id, product_id, gender, age_range, skin_type, is_sensitive_skin)
    NULLS NOT DISTINCT
    WHERE is_current AND user_id IS NOT NULL;
