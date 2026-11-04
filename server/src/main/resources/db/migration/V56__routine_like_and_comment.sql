CREATE TABLE routine_like (
    routine_id BIGINT    NOT NULL,
    user_id    BIGINT    NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_routine_like PRIMARY KEY (routine_id, user_id),
    CONSTRAINT fk_routine_like_routine FOREIGN KEY (routine_id) REFERENCES routine (id) ON DELETE CASCADE,
    CONSTRAINT fk_routine_like_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX ix_routine_like_user ON routine_like (user_id);

CREATE TABLE routine_comment (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY,
    routine_id BIGINT       NOT NULL,
    user_id    BIGINT       NOT NULL,
    content    VARCHAR(300) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_routine_comment PRIMARY KEY (id),
    CONSTRAINT fk_routine_comment_routine FOREIGN KEY (routine_id) REFERENCES routine (id) ON DELETE CASCADE,
    CONSTRAINT fk_routine_comment_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE,
    CONSTRAINT ck_routine_comment_content_not_blank CHECK (content !~ '^\s*$')
);

CREATE INDEX ix_routine_comment_routine_created_at ON routine_comment (routine_id, created_at, id);
CREATE INDEX ix_routine_comment_user ON routine_comment (user_id);
