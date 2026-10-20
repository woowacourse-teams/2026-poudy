CREATE TABLE user_withdrawal_history (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 withdrawn_at TIMESTAMP NOT NULL, requested_at TIMESTAMP, restored_at TIMESTAMP,
 UNIQUE(user_id,withdrawn_at)
);
INSERT INTO user_withdrawal_history(user_id,withdrawn_at,requested_at)
 SELECT id,deleted_at,restore_requested_at FROM "user" WHERE deleted_at IS NOT NULL;
CREATE INDEX ON user_withdrawal_history(restored_at,user_id);
CREATE TABLE user_retention_monthly_stat (
 month DATE PRIMARY KEY, admin_restore_count BIGINT NOT NULL DEFAULT 0 CHECK(admin_restore_count>=0),
 purged_count BIGINT NOT NULL DEFAULT 0 CHECK(purged_count>=0),
 tracking_started_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')
);
INSERT INTO user_retention_monthly_stat(month) VALUES(date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date);
CREATE FUNCTION record_user_recovery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.deleted_at IS NOT NULL THEN
   INSERT INTO user_retention_monthly_stat(month,purged_count)
    VALUES(date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date,1)
    ON CONFLICT(month) DO UPDATE SET purged_count=user_retention_monthly_stat.purged_count+1;
  END IF;
  RETURN OLD;
 END IF;
 IF NEW.deleted_at IS NOT NULL THEN
  INSERT INTO user_withdrawal_history(user_id,withdrawn_at,requested_at) VALUES(NEW.id,NEW.deleted_at,NEW.restore_requested_at)
   ON CONFLICT(user_id,withdrawn_at) DO UPDATE SET requested_at=EXCLUDED.requested_at;
 ELSIF OLD.deleted_at IS NOT NULL THEN
  UPDATE user_withdrawal_history SET restored_at=(now() AT TIME ZONE 'Asia/Seoul') WHERE user_id=NEW.id AND withdrawn_at=OLD.deleted_at;
  INSERT INTO user_retention_monthly_stat(month,admin_restore_count)
   VALUES(date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date,1)
   ON CONFLICT(month) DO UPDATE SET admin_restore_count=user_retention_monthly_stat.admin_restore_count+1;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER record_recovery AFTER UPDATE OF deleted_at,restore_requested_at ON "user" FOR EACH ROW EXECUTE FUNCTION record_user_recovery();
CREATE TRIGGER record_purge BEFORE DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION record_user_recovery();
