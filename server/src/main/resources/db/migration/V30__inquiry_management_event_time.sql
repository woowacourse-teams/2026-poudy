-- 트랜잭션이 잠금을 기다리거나 늦게 실행되어도 원본 변경과 이력 시각이 역전되지 않게 한다.
CREATE OR REPLACE FUNCTION record_inquiry_management() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f UUID; c UUID; p UUID;
BEGIN
 IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.assigned IS NOT DISTINCT FROM NEW.assigned THEN RETURN NEW; END IF;
 NEW.management_updated_at := GREATEST(clock_timestamp() AT TIME ZONE 'Asia/Seoul', OLD.management_updated_at + interval '1 microsecond');
 IF TG_TABLE_NAME='feedback' THEN f:=NEW.id;
 ELSIF TG_TABLE_NAME='product_correction_request' THEN c:=NEW.id;
 ELSE p:=NEW.id; END IF;
 IF OLD.status IS DISTINCT FROM NEW.status THEN
  INSERT INTO admin_inquiry_event(id,feedback_id,correction_request_id,product_request_id,event_type,previous_value,current_value,occurred_at)
  VALUES(gen_random_uuid(),f,c,p,'STATUS_CHANGED',OLD.status,NEW.status,NEW.management_updated_at);
 END IF;
 IF OLD.assigned IS DISTINCT FROM NEW.assigned THEN
  INSERT INTO admin_inquiry_event(id,feedback_id,correction_request_id,product_request_id,event_type,previous_value,current_value,occurred_at)
  VALUES(gen_random_uuid(),f,c,p,'ASSIGNEE_CHANGED',OLD.assigned::text,NEW.assigned::text,NEW.management_updated_at);
 END IF;
 RETURN NEW;
END; $$;
