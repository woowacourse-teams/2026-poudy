CREATE TABLE nickname_sequence (
    adjective   VARCHAR(10) NOT NULL,
    noun        VARCHAR(10) NOT NULL,
    last_number INTEGER     NOT NULL,
    CONSTRAINT pk_nickname_sequence PRIMARY KEY (adjective, noun),
    CONSTRAINT ck_nickname_sequence_last_number CHECK (last_number BETWEEN 1000 AND 999999)
);

ALTER TABLE "user" ADD COLUMN nickname VARCHAR(20);

WITH words AS (
    SELECT ARRAY[
        '포근한', '상냥한', '다정한', '산뜻한', '싱그러운', '씩씩한', '용감한', '느긋한', '부지런한', '즐거운',
        '행복한', '수줍은', '엉뚱한', '든든한', '따뜻한', '시원한', '향긋한', '달콤한', '상큼한', '귀여운',
        '깜찍한', '똑똑한', '슬기로운', '차분한', '활기찬', '명랑한', '의젓한', '당당한', '너그러운', '소중한',
        '꼼꼼한', '성실한', '반가운', '단단한', '기특한', '사랑스러운', '고마운', '상쾌한', '친절한', '순수한',
        '신비로운', '늠름한', '듬직한', '아늑한', '평화로운', '정다운', '유쾌한', '발랄한', '온화한', '겸손한'
    ] AS adjectives,
    ARRAY[
        '다람쥐', '청설모', '고양이', '강아지', '토끼', '햄스터', '수달', '판다', '펭귄', '코알라',
        '여우', '너구리', '고슴도치', '오리', '병아리', '참새', '부엉이', '돌고래', '해달', '알파카',
        '기린', '코끼리', '사슴', '물개', '거북이', '호랑이', '고래', '나비', '꿀벌', '반딧불이',
        '북극곰', '사자', '얼룩말', '캥거루', '미어캣', '친칠라', '앵무새', '두더지', '하마', '양',
        '망아지', '송아지', '고라니', '해마', '비버', '카피바라', '레서판다', '쿼카', '낙타', '담비'
    ] AS nouns
), picked AS MATERIALIZED (
    SELECT u.id,
           w.adjectives[1 + floor(random() * cardinality(w.adjectives))::int] AS adjective,
           w.nouns[1 + floor(random() * cardinality(w.nouns))::int] AS noun
    FROM "user" u CROSS JOIN words w
), numbered AS (
    SELECT id, adjective, noun, 999 + row_number() OVER (PARTITION BY adjective, noun ORDER BY id) AS number
    FROM picked
), named AS (
    UPDATE "user" u
    SET nickname = n.adjective || ' ' || n.noun || ' ' || n.number
    FROM numbered n
    WHERE u.id = n.id
    RETURNING n.adjective, n.noun, n.number
)
INSERT INTO nickname_sequence (adjective, noun, last_number)
SELECT adjective, noun, max(number) FROM named GROUP BY adjective, noun;

ALTER TABLE "user" ALTER COLUMN nickname SET NOT NULL;
ALTER TABLE "user" ADD CONSTRAINT ux_user_nickname UNIQUE (nickname);
ALTER TABLE "user" ADD CONSTRAINT ck_user_nickname_not_blank CHECK (nickname !~ '^\s*$');

ALTER TABLE "user" ADD COLUMN profile_image_id UUID NULL;

ALTER TABLE pending_image DROP CONSTRAINT ck_pending_image_purpose;
ALTER TABLE pending_image ADD CONSTRAINT ck_pending_image_purpose CHECK (purpose IN ('FEEDBACK', 'PROFILE'));
