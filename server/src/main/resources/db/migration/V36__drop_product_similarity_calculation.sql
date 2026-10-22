ALTER TABLE product_similarity DROP CONSTRAINT fk_product_similarity_calculation;
ALTER TABLE product_similarity ADD CONSTRAINT fk_product_similarity_source FOREIGN KEY (component_id)
    REFERENCES product_component (id) ON DELETE CASCADE;

DROP TABLE product_similarity_calculation;
