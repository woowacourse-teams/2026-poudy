-- 처리 이력 기록을 중단하고 기존 관리 API의 최근 수정 시각 갱신은 유지한다.
CREATE OR REPLACE FUNCTION record_inquiry_management() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.assigned IS NOT DISTINCT FROM NEW.assigned THEN RETURN NEW; END IF;
 NEW.management_updated_at := GREATEST(clock_timestamp() AT TIME ZONE 'Asia/Seoul', OLD.management_updated_at + interval '1 microsecond');
 RETURN NEW;
END; $$;

-- 관리자 메모 기능을 없애므로 V34에서 이력으로 옮긴 메모도 함께 삭제한다.
DROP TABLE admin_inquiry_event;
