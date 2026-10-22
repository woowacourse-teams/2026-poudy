CREATE TABLE inquiry_image (
    image_id              UUID      NOT NULL,
    feedback_id           UUID      NULL,
    correction_request_id UUID      NULL,
    display_order         INT       NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at            TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_inquiry_image PRIMARY KEY (image_id),
    CONSTRAINT ck_inquiry_image_owner CHECK (num_nonnulls(feedback_id, correction_request_id) = 1),
    CONSTRAINT ux_inquiry_image_feedback_order UNIQUE (feedback_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ux_inquiry_image_correction_request_order UNIQUE (correction_request_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_inquiry_image_feedback FOREIGN KEY (feedback_id) REFERENCES feedback (id) ON DELETE CASCADE,
    CONSTRAINT fk_inquiry_image_correction_request FOREIGN KEY (correction_request_id)
        REFERENCES product_correction_request (id) ON DELETE CASCADE,
    CONSTRAINT ck_inquiry_image_order CHECK (display_order BETWEEN 0 AND 4)
);

INSERT INTO inquiry_image(image_id, feedback_id, display_order, created_at, updated_at)
SELECT image_id, feedback_id, display_order, created_at, updated_at FROM feedback_image;

INSERT INTO inquiry_image(image_id, correction_request_id, display_order, created_at, updated_at)
SELECT image_id, request_id, display_order, created_at, updated_at FROM product_correction_request_image;

DROP TABLE feedback_image;
DROP TABLE product_correction_request_image;

CREATE CONSTRAINT TRIGGER tg_inquiry_image_feedback_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON inquiry_image
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('feedback_id', 'display_order');
CREATE CONSTRAINT TRIGGER tg_inquiry_image_correction_request_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON inquiry_image
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('correction_request_id', 'display_order');
