ALTER TABLE admin_inquiry_event ADD COLUMN memo VARCHAR(2000);

UPDATE admin_inquiry_event e SET memo = m.content FROM admin_inquiry_memo m WHERE m.id = e.memo_id;

INSERT INTO admin_inquiry_event(id, feedback_id, correction_request_id, product_request_id, event_type, memo, occurred_at)
SELECT gen_random_uuid(), m.feedback_id, m.correction_request_id, m.product_request_id, 'MEMO_ADDED', m.content, m.created_at
FROM admin_inquiry_memo m
WHERE NOT EXISTS (SELECT 1 FROM admin_inquiry_event e WHERE e.memo_id = m.id);

ALTER TABLE admin_inquiry_event DROP COLUMN memo_id;
ALTER TABLE admin_inquiry_event ADD CONSTRAINT ck_admin_inquiry_event_memo CHECK (
    (event_type = 'MEMO_ADDED') = (memo IS NOT NULL) AND (memo IS NULL OR length(btrim(memo)) > 0)
);

DROP TABLE admin_inquiry_memo;
