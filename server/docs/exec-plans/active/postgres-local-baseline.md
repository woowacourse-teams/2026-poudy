# PostgreSQL 로컬 기준 상태

검색 전환 [실행 계획](postgres-search-migration.md)의 1단계 확인 기록이다.
실제 데이터는 private 저장소에서 관리하며 이 문서에 원문이나 접속 비밀번호를 기록하지 않는다.

## 적재 원천

- 저장소: `Seonwu-K/poudy-private`
- 브랜치: `db-script`
- 확인 커밋: `b2f4360303b8eba7f8891d7278fa17f21d73f098`
- 실행 지침: `db-load/README.md`
- 생성기: `db-load/generate_load_sql.py`
- 입력: `db-load/source/*.json`, `db-load/sensory.csv`

2026-09-20에 원격 브랜치를 가져와 확인했다. 기존 private 저장소의 `main` 체크아웃과
추적되지 않는 `.idea/`는 그대로 유지했다.

| 입력 | 건수 |
| --- | ---: |
| 브랜드 | 23 |
| 카테고리 | 65 |
| 태그 | 98 |
| 성분 | 22,013 |
| 제외 성분군 | 6 |
| 상품 | 472 |
| 인기 검색어 사전 | 599 |
| 큐레이션 | 0 |
| 수분감과 유분감 CSV | 472 |

상품 ID 기준으로 CSV 누락은 없다. 포함된 CSV를 사용하면 과거 JSON 서버를 다시 실행해
`fetch_sensory.py`를 호출할 필요가 없다. 값의 의미와 정확성은 별도 검증 대상이다.
현재 상품 원천과 생성기에는 피부타입 적재가 없으므로 `product_skin_type`은 비어 있게 된다.
이 데이터셋만으로 피부타입 필터 검증을 완료했다고 판단하지 않는다.

## 스키마 호환성

서버 기준 커밋 `c1afc87`의 `src/main/resources/db/schema.sql`은 506줄이다.
첨부 `poudy-full-schema.sql`의 처음 506줄은 첫 줄의 적용 명령 주석을 제외하고 동일하다.
첨부 파일은 뒤에 검색 구조를 추가한 총 1,129줄의 SQL이다.

생성기의 COPY 대상 테이블은 모두 기존 서버 스키마에 존재한다. 다만 생성된 적재 SQL은
아래 검색 뷰를 반드시 갱신한다. 현재 서버 스키마에는 이 뷰가 없다.

```sql
REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW ingredient_search_term;
REFRESH MATERIALIZED VIEW search_vocabulary;
```

따라서 현재 서버 스키마만 적용한 DB에 원본 적재 SQL을 실행하면 마지막 갱신에서 실패하고
트랜잭션이 롤백된다. 1단계의 개발 DB 재현에는 첨부 전체 스키마를 사용해야 한다.
이는 검색 함수의 정확성이나 성능 검증 완료를 뜻하지 않는다. 검증 및 저장소 스키마 통합은
3단계에서 수행한다. 테스트 DB는 현재 저장소의 스키마와 테스트 SQL을 그대로 사용한다.

## 적재 실행 순서

환경 준비 후 private 저장소의 `db-script` 작업 디렉터리에서 실행한다.
아래 절차는 비어 있는 신규 개발 DB 전용이다. 기존 DB를 삭제하거나 재생성하지 않는다.

1. PostgreSQL 15 이상, UTF8과 한글 및 자모 트라이그램을 지원하는 로케일을 확인한다.
   Windows 로케일 이름을 Linux의 `ko_KR.UTF-8`로 가정하지 않고 실제 생성과 검사를 수행한다.
2. 개발용 `poudy`와 테스트용 `poudy_test`를 분리한다. 테스트는 스키마를 초기화하므로
   `POUDY_TEST_DB_URL`을 개발 또는 운영 DB로 지정하지 않는다.
3. 첨부 전체 스키마를 개발 DB에 적용한다.
4. `db-load`에서 `python generate_load_sql.py --sensory sensory.csv --out load.sql`을 실행한다.
5. `psql -X -v ON_ERROR_STOP=1 -d poudy -f load.sql`로 적재한다.
   생성 SQL 자체가 `BEGIN ISOLATION LEVEL READ COMMITTED`와 `COMMIT`을 포함한다.
6. 원천 대비 DB 건수와 검색 뷰 건수를 확인한다.
7. 서버 접속 정보는 커밋하지 않는 `server/.env`나 환경 변수로 설정한다.
   기본 프로필은 `dev`다. 테스트는 `test` 프로필과 `POUDY_TEST_DB_URL`을 사용한다.
8. `server`에서 `sh ./scripts/test.sh`, `sh ./scripts/verify.sh`를 실행하고,
   개발 DB로 서버를 실행해 헬스 체크와 대표 조회 API를 확인한다.

생성된 `load.sql`과 private 원천 데이터를 공개 저장소에 추가하지 않는다.

## 실행 상태

- 원천과 스키마의 정적 비교: 완료.
- PostgreSQL: 서비스, 설치 등록, 표준 설치 디렉터리와 5432 리스너가 확인되지 않았다.
  `psql`도 PATH에서 찾을 수 없다. 설치 적용 여부를 사용자에게 요청했다.
- Java: JDK 21이 설치되어 있고 `JAVA_HOME`은 해당 경로다. PATH의 `java`는 Oracle Java 8을
  가리켜 명령 간 버전이 다르다. JDK 21 우선으로 PATH 정리를 제안했다.
- DB 생성, 스키마 적용, 초기 적재, 서버 기동과 테스트: 환경 준비 후 수행 예정.
- `verify.sh`: Java 21로 메인 및 테스트 소스 컴파일을 통과했다. OpenAPI 생성용 서버의
  `test` 프로필 기동이 `Connection to localhost:5432 refused`로 실패했다.
  DB 의존 테스트와 전체 빌드 통과는 확인하지 못했다. 환경 준비 후 같은 명령으로 재검증한다.
  이 기록은 1단계 완료 보고가 아니다.
