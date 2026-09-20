# PostgreSQL 기존 적재 구조 확인 기록

검색 전환 [실행 계획](postgres-search-migration.md)의 1단계 확인 기록이다.
실제 데이터는 private 저장소에서 관리하며 이 문서에 원문이나 접속 비밀번호를 기록하지 않는다.
1단계는 구조 파악으로 완료한다. 기존 적재 스크립트 신규 작성이나 수정, 로컬 DB 설치와
초기 데이터 적재는 이 단계의 작업이 아니다.

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
트랜잭션이 롤백된다. 서버 검색 스키마를 구현할 때 기존 도구가 요구하는 검색 뷰 계약을
유지해야 한다. 이 차이는 구조 파악 결과이며 지금 초기 적재를 수행해야 한다는 뜻이 아니다.

## 이후 구현과 검증에서의 사용

- 코드 구현: 테이블, 컬럼, 외래 키와 검색 뷰 계약을 기준으로 진행한다.
- DB 통합 테스트: `poudy_test`에 저장소의 스키마와 테스트 데이터를 사용한다.
  검색 사례를 보강하고 테스트 데이터 삽입 후 뷰를 갱신한다. private 전체 적재는 필요 없다.
- 기존 도구는 빈 스키마 전용이며 적재와 뷰 갱신을 하나의 READ COMMITTED 트랜잭션으로
  실행한다. 이 계약만 참고하며 실제 데이터 적재와 검증은 이번 계획에서 제외한다.
- private 데이터와 생성된 `load.sql`은 공개 저장소에 추가하지 않는다.

## 사전 실행 확인 이력

- 원천과 스키마의 정적 비교: 완료.
- PostgreSQL: 서비스, 설치 등록, 표준 설치 디렉터리와 5432 리스너가 확인되지 않았다.
  `psql`도 PATH에서 찾을 수 없다. DB 실행 검증 시 환경 준비가 필요하다.
- Java: JDK 21이 설치되어 있고 `JAVA_HOME`은 해당 경로다. PATH의 `java`는 Oracle Java 8을
  가리켜 명령 간 버전이 다르다. Gradle은 기존 `JAVA_HOME`의 JDK 21로 실행됐다.
  Java PATH 변경은 코드 구현의 선행 조건이 아니다.
- DB 생성과 초기 적재는 수행하지 않았다. 현재 단계에서 요구하지 않는다.
- `verify.sh`: Java 21로 메인 및 테스트 소스 컴파일을 통과했다. OpenAPI 생성용 서버의
  `test` 프로필 기동이 `Connection to localhost:5432 refused`로 실패했다.
  DB 의존 테스트와 전체 빌드 통과는 확인하지 못했다. 환경 준비 후 같은 명령으로 재검증한다.
  이 실패는 DB 실행 검증이 남았다는 의미이며 구조 파악 완료와 구분한다.
