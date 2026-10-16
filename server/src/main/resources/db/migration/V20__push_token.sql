CREATE TABLE push_token (
    token      VARCHAR(255) NOT NULL,
    user_id    BIGINT       NULL,
    is_enabled BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_push_token PRIMARY KEY (token),
    CONSTRAINT fk_push_token_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL
);

CREATE INDEX ix_push_token_user ON push_token (user_id);
