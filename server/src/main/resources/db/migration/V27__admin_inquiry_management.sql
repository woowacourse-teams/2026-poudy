ALTER TABLE feedback DROP CONSTRAINT ck_feedback_status;
ALTER TABLE feedback ADD CONSTRAINT ck_feedback_status CHECK (status IN ('RECEIVED','IN_PROGRESS','REVIEW_PLANNED','COMPLETED','REJECTED'));
ALTER TABLE feedback ADD COLUMN assigned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE feedback ADD COLUMN management_updated_at TIMESTAMP;
UPDATE feedback SET management_updated_at = GREATEST(created_at, status_changed_at);
ALTER TABLE feedback ALTER COLUMN management_updated_at SET NOT NULL;
ALTER TABLE feedback ALTER COLUMN management_updated_at SET DEFAULT (now() AT TIME ZONE 'Asia/Seoul');
ALTER TABLE product_correction_request DROP CONSTRAINT ck_product_correction_request_status;
ALTER TABLE product_correction_request ADD CONSTRAINT ck_product_correction_request_status CHECK (status IN ('RECEIVED','IN_PROGRESS','REVIEW_PLANNED','COMPLETED','REJECTED'));
ALTER TABLE product_correction_request ADD COLUMN assigned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE product_correction_request ADD COLUMN management_updated_at TIMESTAMP;
UPDATE product_correction_request SET management_updated_at = GREATEST(created_at, status_changed_at);
ALTER TABLE product_correction_request ALTER COLUMN management_updated_at SET NOT NULL;
ALTER TABLE product_correction_request ALTER COLUMN management_updated_at SET DEFAULT (now() AT TIME ZONE 'Asia/Seoul');
ALTER TABLE product_request DROP CONSTRAINT ck_product_request_status;
ALTER TABLE product_request ADD CONSTRAINT ck_product_request_status CHECK (status IN ('RECEIVED','IN_PROGRESS','REVIEW_PLANNED','COMPLETED','REJECTED'));
ALTER TABLE product_request ADD COLUMN assigned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE product_request ADD COLUMN management_updated_at TIMESTAMP;
UPDATE product_request SET management_updated_at = GREATEST(created_at, status_changed_at);
ALTER TABLE product_request ALTER COLUMN management_updated_at SET NOT NULL;
ALTER TABLE product_request ALTER COLUMN management_updated_at SET DEFAULT (now() AT TIME ZONE 'Asia/Seoul');
CREATE TABLE admin_inquiry_memo (
 id UUID PRIMARY KEY, feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
 correction_request_id UUID REFERENCES product_correction_request(id) ON DELETE CASCADE,
 product_request_id UUID REFERENCES product_request(id) ON DELETE CASCADE,
 CHECK (num_nonnulls(feedback_id,correction_request_id,product_request_id)=1), content VARCHAR(2000) NOT NULL CHECK (length(btrim(content))>0),
 created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')
);
CREATE TABLE admin_inquiry_event (
 id UUID PRIMARY KEY, feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
 correction_request_id UUID REFERENCES product_correction_request(id) ON DELETE CASCADE,
 product_request_id UUID REFERENCES product_request(id) ON DELETE CASCADE,
 CHECK (num_nonnulls(feedback_id,correction_request_id,product_request_id)=1),
 event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('STATUS_CHANGED','ASSIGNEE_CHANGED','MEMO_ADDED')),
 previous_value VARCHAR(30), current_value VARCHAR(30),
 memo_id UUID REFERENCES admin_inquiry_memo(id) ON DELETE CASCADE,
 occurred_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')
);
-- 기존 관리 API도 원본 갱신과 같은 트랜잭션에서 이력을 남긴다.
CREATE FUNCTION record_inquiry_management() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f UUID; c UUID; p UUID;
BEGIN
 IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.assigned IS NOT DISTINCT FROM NEW.assigned THEN RETURN NEW; END IF;
 NEW.management_updated_at := now() AT TIME ZONE 'Asia/Seoul';
 IF TG_TABLE_NAME='feedback' THEN f:=NEW.id;
 ELSIF TG_TABLE_NAME='product_correction_request' THEN c:=NEW.id;
 ELSE p:=NEW.id; END IF;
 IF OLD.status IS DISTINCT FROM NEW.status THEN
  INSERT INTO admin_inquiry_event(id,feedback_id,correction_request_id,product_request_id,event_type,previous_value,current_value)
  VALUES(gen_random_uuid(),f,c,p,'STATUS_CHANGED',OLD.status,NEW.status);
 END IF;
 IF OLD.assigned IS DISTINCT FROM NEW.assigned THEN
  INSERT INTO admin_inquiry_event(id,feedback_id,correction_request_id,product_request_id,event_type,previous_value,current_value)
  VALUES(gen_random_uuid(),f,c,p,'ASSIGNEE_CHANGED',OLD.assigned::text,NEW.assigned::text);
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER record_management BEFORE UPDATE OF status,assigned ON feedback FOR EACH ROW EXECUTE FUNCTION record_inquiry_management();
CREATE TRIGGER record_management BEFORE UPDATE OF status,assigned ON product_correction_request FOR EACH ROW EXECUTE FUNCTION record_inquiry_management();
CREATE TRIGGER record_management BEFORE UPDATE OF status,assigned ON product_request FOR EACH ROW EXECUTE FUNCTION record_inquiry_management();
CREATE INDEX ON admin_inquiry_memo(feedback_id,created_at,id) WHERE feedback_id IS NOT NULL;
CREATE INDEX ON admin_inquiry_memo(correction_request_id,created_at,id) WHERE correction_request_id IS NOT NULL;
CREATE INDEX ON admin_inquiry_memo(product_request_id,created_at,id) WHERE product_request_id IS NOT NULL;
CREATE INDEX ON admin_inquiry_event(feedback_id,occurred_at,id) WHERE feedback_id IS NOT NULL;
CREATE INDEX ON admin_inquiry_event(correction_request_id,occurred_at,id) WHERE correction_request_id IS NOT NULL;
CREATE INDEX ON admin_inquiry_event(product_request_id,occurred_at,id) WHERE product_request_id IS NOT NULL;
