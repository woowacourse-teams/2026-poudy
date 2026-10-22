CREATE TABLE user_shelf_analysis_ingredient (
    user_id       BIGINT    NOT NULL,
    ingredient_id BIGINT    NOT NULL,
    is_new        BOOLEAN   NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_user_shelf_analysis_ingredient PRIMARY KEY (user_id, ingredient_id),
    CONSTRAINT fk_user_shelf_analysis_ingredient_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_shelf_analysis_ingredient_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id)
);
