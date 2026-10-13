CREATE TABLE member (
    id                BIGINT       GENERATED ALWAYS AS IDENTITY,
    oauth_provider    VARCHAR(20)  NOT NULL,
    oauth_provider_id VARCHAR(255) NOT NULL,
    email             VARCHAR(320) NOT NULL, -- 가입 시점에 제공자가 인증한 이메일. 중복 가입 차단용이며 회원 식별에는 쓰지 않는다
    age_range         VARCHAR(20)  NULL,
    gender            VARCHAR(10)  NULL,
    skin_type         VARCHAR(20)  NULL,     -- UNKNOWN 은 회원 전용 값이라 제품 필터 선택지인 skin_type 테이블을 참조하지 않는다
    created_at        TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at        TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_member PRIMARY KEY (id),
    CONSTRAINT ux_member_oauth UNIQUE (oauth_provider, oauth_provider_id),
    CONSTRAINT ux_member_email UNIQUE (email),
    CONSTRAINT ck_member_oauth_provider CHECK (oauth_provider IN ('GOOGLE', 'KAKAO')),
    CONSTRAINT ck_member_oauth_provider_id_not_blank CHECK (oauth_provider_id !~ '^\s*$'),
    CONSTRAINT ck_member_email_normalized CHECK (email !~ '^\s*$' AND email = lower(email)),
    CONSTRAINT ck_member_age_range CHECK (
        age_range IS NULL OR age_range IN ('TEENS', 'TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES', 'SIXTIES_OR_OLDER')
    ),
    CONSTRAINT ck_member_gender CHECK (gender IS NULL OR gender IN ('FEMALE', 'MALE')),
    CONSTRAINT ck_member_skin_type CHECK (
        skin_type IS NULL OR skin_type IN ('DRY', 'OILY', 'SENSITIVE', 'COMBINATION', 'UNKNOWN')
    )
);
