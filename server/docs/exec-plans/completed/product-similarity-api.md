# 저장된 구성품 유사도 조회

- 기준: origin/dev c3d8dd1c
- 브랜치: feat/component-similarity-api
- 범위: Flyway V6, 읽기 전용 조회 API, 테스트, API 생성물, 수동 계산 연결 문서.
- 제외: 제품 적재, 알고리즘 변경, 외부 계산 실행, 프론트엔드 구현, 운영 배포.

## 결정

- 제품 단위 ERD를 구성품 단위로 적용한다. API 용어는 기존 상세의 partId를 유지한다.
- 최종 점수 0.25 이상이며 판매 중인 서로 다른 제품 최대 3개를 제공한다.
- 미계산과 계산 완료/후보 없음을 구분한다. 주의 여부는 선택된 대상 구성품만 본다.
- 외부 스크립트가 같은 DB의 결과를 갱신한다. 서버에서는 계산하지 않는다.

## 진행

- [x] 기존 상세·DB 조회·제외 성분군 구조 확인
- [x] Flyway와 Repository/Service/Controller/DTO 구현
- [x] 경계 점수·중복·판매 상태·구성품별 주의·빈 결과·404 테스트 작성
- [x] 테스트 DB 연결 후 실제 PostgreSQL에서 통합 테스트 8개 통과
- [x] OpenAPI/TypeScript 생성물 갱신 및 verify.sh 통과

## 완료 검증

`POUDY_TEST_DB_URL=jdbc:postgresql://127.0.0.1:55439/poudy_similarity_api_ko_test`,
`POUDY_DB_USERNAME=similarity_test` 환경에서 `sh ./scripts/verify.sh` 통과.
전체 테스트 854개, 실패 0개. 기존 스키마 계약 테스트에도 새 테이블의 칼럼과 복합 PK를 반영했다.
OpenAPI와 TypeScript 생성물은 공식 태스크로 갱신했고 재검증에서 드리프트가 없었다.
커밋·푸시·운영 배포와 외부 스크립트 실행은 하지 않았다.

## 검증 환경

로컬 5432 PostgreSQL은 비밀번호 인증이 필요하며 이 worktree에 연결 설정이 없다.
사용자 승인 후 격리 PostgreSQL 55439에 `poudy_similarity_api_ko_test`를 만들었다.
V2 검색 마이그레이션의 한글 트라이그램 검사를 만족하도록 template0, UTF8,
libc `Korean_Korea.utf8` 로케일을 명시했다. ICU locale만 지정하면 LC_CTYPE=C가 유지돼
검사에 실패하므로 Windows LC_CTYPE을 직접 지정했다. 검증을 우회하지 않았다.
운영 DB는 사용하지 않는다. 컴파일·Checkstyle·아키텍처 테스트 5개도 통과했다.
