ALTER TABLE curation_block
    ADD COLUMN alt_text VARCHAR(500) NULL,
    ADD COLUMN body_text TEXT NULL,
    ADD CONSTRAINT ck_curation_block_image_text CHECK (
        type = 'IMAGE' OR (alt_text IS NULL AND body_text IS NULL)
    );
