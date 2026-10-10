CREATE TABLE member_saved_product (
    member_id  BIGINT    NOT NULL,
    product_id BIGINT    NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'), -- 저장함에 담은 시각. 최근 저장순 정렬 기준
    updated_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_member_saved_product PRIMARY KEY (member_id, product_id),
    CONSTRAINT fk_member_saved_product_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_member_saved_product_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE INDEX ix_member_saved_product_member_created_at ON member_saved_product (member_id, created_at DESC);
