CREATE TABLE routine (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY,
    user_id    BIGINT       NOT NULL,
    name       VARCHAR(25)  NOT NULL,
    memo       VARCHAR(200) NULL,
    is_public  BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_routine PRIMARY KEY (id),
    CONSTRAINT fk_routine_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE,
    CONSTRAINT ck_routine_name_not_blank CHECK (name !~ '^\s*$')
);

CREATE INDEX ix_routine_user_created_at ON routine (user_id, created_at DESC, id DESC);

CREATE TABLE routine_product (
    routine_id    BIGINT      NOT NULL,
    time_of_day   VARCHAR(10) NOT NULL,
    product_id    BIGINT      NOT NULL,
    display_order INTEGER     NOT NULL,
    CONSTRAINT pk_routine_product PRIMARY KEY (routine_id, time_of_day, product_id),
    CONSTRAINT fk_routine_product_routine FOREIGN KEY (routine_id) REFERENCES routine (id) ON DELETE CASCADE,
    CONSTRAINT fk_routine_product_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_routine_product_time_of_day CHECK (time_of_day IN ('MORNING', 'EVENING')),
    CONSTRAINT ux_routine_product_display_order UNIQUE (routine_id, time_of_day, display_order) DEFERRABLE INITIALLY DEFERRED
);
