-- 기존 회원에게 프로필 재설정을 요구하지 않는다.
ALTER TABLE "user" ADD COLUMN profile_setup_completed BOOLEAN NOT NULL DEFAULT TRUE;

-- 이후 가입하는 회원만 프로필 확인을 완료해야 한다.
ALTER TABLE "user" ALTER COLUMN profile_setup_completed SET DEFAULT FALSE;
