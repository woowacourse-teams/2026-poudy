ALTER TABLE product_component
    ALTER COLUMN moisture_level DROP NOT NULL,
    ALTER COLUMN oil_level DROP NOT NULL,
    ADD CONSTRAINT ck_product_component_sensory_pair CHECK (
        (moisture_level IS NULL) = (oil_level IS NULL)
    );
