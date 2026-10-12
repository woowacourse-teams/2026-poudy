UPDATE member
SET skin_type = NULL, updated_at = (now() AT TIME ZONE 'Asia/Seoul')
WHERE skin_type = 'UNKNOWN';

ALTER TABLE member
    DROP CONSTRAINT ck_member_skin_type,
    ADD CONSTRAINT ck_member_skin_type CHECK (
        skin_type IS NULL OR skin_type IN ('DRY', 'OILY', 'SENSITIVE', 'COMBINATION')
    );
