# 큐레이션 이미지 블록 텍스트 (#598)

## 설계

- `curation_block` 한 테이블을 유지한다. 새 Flyway V5로 `alt_text VARCHAR(500) NULL`,
  `body_text TEXT NULL`을 추가하고, IMAGE 외 타입은 두 컬럼 모두 NULL로 제한한다.
- 기존 V1~V4는 수정하지 않는다. 기존 데이터의 두 컬럼은 NULL로 유지한다.
- `altText`의 NULL은 미입력, 빈 문자열은 장식용으로 구분한다. 최대 500자를 허용한다.
  `bodyText`는 줄바꿈과 공백을 변환하지 않고 저장된 문자열 그대로 전달한다.
- alt 길이는 PostgreSQL과 같은 유니코드 코드 포인트 수로 검증한다. 응답 스키마에는
  최대 길이를 설명으로 명시한다. 생성기의 Zod `max`가 UTF-16 코드 단위로 길이를 세므로
  유효한 이모지 alt를 거부하지 않도록 응답의 `maxLength` 제약은 사용하지 않는다.
- Repository 조회·매핑 → `CurationImageBlock` → `CurationBlockContent.Image` → 상세 응답까지
  `altText`, `bodyText`를 전달한다. 상세 API의 IMAGE 블록에만 두 nullable 필드를 제공한다.
- 기존 큐레이션 공개 여부, 블록 순서와 이미지 URL 계약을 유지한다.
- 범위는 DB 저장 컬럼과 공개 조회 계약이다. 관리자 쓰기 API와 클라이언트 렌더링은 후속 작업이다.

## 구현 및 검증

- [x] V5 마이그레이션과 스키마 테스트 갱신: 타입 제약·NULL·빈 alt·500자 경계 확인.
- [x] 이미지 블록 도메인·조회 매핑·응답 변경: 기존 NULL과 본문 줄바꿈 전달 확인.
- [x] 상세 API 통합 테스트: 입력된 텍스트, 기존 NULL, 장식용 빈 alt, 다른 블록의 필드 부재 확인.
- [x] OpenAPI와 공통 TypeScript/Zod 생성물 갱신 및 `server/scripts/verify.sh` 통과.

## 완료

- 2026-10-05, 한글 로케일의 임시 PostgreSQL 18.0에서 큐레이션·스키마 테스트 56개 통과.
- `server/scripts/verify.sh`가 생성물 드리프트 없이 전체 빌드와 846개 테스트를 통과했다.
  실패·오류·건너뛴 테스트는 없다.
- 별도 임시 DB에 V1~V4와 기존 이미지 행을 적재한 뒤 V5를 적용해 이미지 URL·여백 보존과
  새 텍스트 컬럼의 NULL을 확인했다.
- 생성된 Zod 스키마의 NULL·빈 alt·이모지 500자·본문 공백과 줄바꿈·필수 필드를 확인했다.
- 검증에 사용한 임시 DB 프로세스와 파일은 정리한다. 스테이징·운영 배포는 후속 단계다.

## 배포

스테이징 DB를 가리키는 서버에 먼저 배포해 Flyway 이력과 상세 API를 확인한다.
같은 변경을 운영에 배포하고 운영 DB의 별도 Flyway 이력을 확인한다.
