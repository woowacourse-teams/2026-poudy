ALTER TABLE member
    ADD COLUMN deleted_at           TIMESTAMP NULL, -- 탈퇴 시각. 행은 지우지 않고 복구·삭제는 관리자가 정한다
    ADD COLUMN restore_requested_at TIMESTAMP NULL, -- 탈퇴한 회원이 다시 로그인해 복구를 요청한 시각
    ADD CONSTRAINT ck_member_restore_request CHECK (restore_requested_at IS NULL OR deleted_at IS NOT NULL);
