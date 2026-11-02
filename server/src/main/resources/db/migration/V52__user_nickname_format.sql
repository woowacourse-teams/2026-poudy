-- 자동 생성 닉네임의 단어 사이 공백을 지우고, 닉네임을 공백·특수문자 없는 한글·영문·숫자 2~15자로 제한한다. 형용사·명사를 붙여도 다른 조합과 겹치지 않는다.
UPDATE "user" SET nickname = regexp_replace(nickname, '\s', '', 'g') WHERE nickname ~ '\s';

ALTER TABLE "user" ALTER COLUMN nickname TYPE VARCHAR(15);
ALTER TABLE "user" DROP CONSTRAINT ck_user_nickname_not_blank;
ALTER TABLE "user" ADD CONSTRAINT ck_user_nickname_format CHECK (nickname ~ '^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]{2,15}$');
