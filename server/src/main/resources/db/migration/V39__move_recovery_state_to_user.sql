ALTER TABLE "user"
 ADD COLUMN restored_at TIMESTAMP,
 ADD COLUMN restored_withdrawn_at TIMESTAMP,
 ADD COLUMN restored_requested_at TIMESTAMP;

-- 현재 탈퇴 중인 회원은 기존 deleted_at/restore_requested_at을 그대로 사용한다.
-- 활성 회원은 가장 최근에 완료한 복구의 정보만 회원 행으로 옮긴다.
UPDATE "user" u
SET restored_at=h.restored_at,
    restored_withdrawn_at=h.withdrawn_at,
    restored_requested_at=h.requested_at
FROM (
 SELECT DISTINCT ON (user_id) user_id, withdrawn_at, requested_at, restored_at
 FROM user_withdrawal_history
 WHERE restored_at IS NOT NULL
 ORDER BY user_id, restored_at DESC, withdrawn_at DESC, id DESC
) h
WHERE u.id=h.user_id AND u.deleted_at IS NULL;

CREATE INDEX ix_user_restored_at ON "user"(restored_at,id)
 WHERE deleted_at IS NULL AND restored_at IS NOT NULL;

DROP TRIGGER record_recovery ON "user";
DROP FUNCTION record_user_recovery();
DROP TABLE user_withdrawal_history;
