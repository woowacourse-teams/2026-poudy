CREATE TABLE pending_image (
    id         UUID        NOT NULL,
    purpose    VARCHAR(20) NOT NULL,
    created_at TIMESTAMP   NOT NULL,
    CONSTRAINT pk_pending_image PRIMARY KEY (id),
    CONSTRAINT ck_pending_image_purpose CHECK (purpose IN ('FEEDBACK'))
);

CREATE INDEX ix_pending_image_created_at ON pending_image (created_at);
