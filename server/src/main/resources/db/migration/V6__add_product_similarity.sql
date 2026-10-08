-- 점수 계산과 갱신은 외부 배치가 소유한다. 서버는 저장된 결과만 조회한다.
CREATE TABLE product_similarity_calculation (
    component_id BIGINT NOT NULL,
    CONSTRAINT pk_product_similarity_calculation PRIMARY KEY (component_id),
    CONSTRAINT fk_product_similarity_calculation_component FOREIGN KEY (component_id)
        REFERENCES product_component (id) ON DELETE CASCADE
);

CREATE TABLE product_similarity (
    component_id BIGINT NOT NULL,
    similar_component_id BIGINT NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_product_similarity PRIMARY KEY (component_id, similar_component_id),
    CONSTRAINT fk_product_similarity_calculation FOREIGN KEY (component_id)
        REFERENCES product_similarity_calculation (component_id) ON DELETE CASCADE,
    CONSTRAINT fk_product_similarity_target FOREIGN KEY (similar_component_id)
        REFERENCES product_component (id) ON DELETE CASCADE,
    CONSTRAINT ck_product_similarity_different_component CHECK (component_id <> similar_component_id),
    CONSTRAINT ck_product_similarity_score CHECK (similarity_score BETWEEN 0 AND 1)
);

CREATE INDEX ix_product_similarity_target ON product_similarity (similar_component_id);
CREATE INDEX ix_product_similarity_rank
    ON product_similarity (component_id, similarity_score DESC, similar_component_id);
