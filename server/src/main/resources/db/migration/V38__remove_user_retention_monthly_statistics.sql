-- 복구 회차 기록은 유지하고 복구·파기의 월별 집계만 제거한다.
DROP TRIGGER record_purge ON "user";

CREATE OR REPLACE FUNCTION record_user_recovery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL THEN
  INSERT INTO user_withdrawal_history(user_id,withdrawn_at,requested_at) VALUES(NEW.id,NEW.deleted_at,NEW.restore_requested_at)
   ON CONFLICT(user_id,withdrawn_at) DO UPDATE SET requested_at=EXCLUDED.requested_at;
 ELSIF OLD.deleted_at IS NOT NULL THEN
  UPDATE user_withdrawal_history SET restored_at=(now() AT TIME ZONE 'Asia/Seoul') WHERE user_id=NEW.id AND withdrawn_at=OLD.deleted_at;
 END IF;
 RETURN NEW;
END; $$;

DROP TABLE user_retention_monthly_stat;
