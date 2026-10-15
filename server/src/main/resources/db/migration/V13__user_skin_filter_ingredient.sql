CREATE TABLE user_skin_filter_ingredient (
    user_id       BIGINT    NOT NULL,
    ingredient_id BIGINT    NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_user_skin_filter_ingredient PRIMARY KEY (user_id, ingredient_id),
    CONSTRAINT fk_user_skin_filter_ingredient_member FOREIGN KEY (user_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_skin_filter_ingredient_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id)
);
