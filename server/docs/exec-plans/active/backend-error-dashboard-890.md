# 백엔드 에러를 Grafana 대시보드에서 보기 (#890)

2026-10-22 작업 시작. 기준은 `origin/dev`의 `66f6c093`이고 작업 브랜치는 `feat/890-backend-error-dashboard`다.
이슈: https://github.com/woowacourse-teams/2026-poudy/issues/890

## 목표

서버는 살아 있는데 기능이 실패하는 경우를 Grafana 화면에서 바로 본다. 운영·staging 백엔드 대시보드에
ERROR 로그 수와 ERROR 로그 목록을 띄우고, 이를 위해 두 환경의 로그 필터를 같은 규칙으로 맞춘다.

## 결정

- 알림은 만들지 않는다. 대시보드에서 에러를 보는 것이 목표다(사용자 결정).
- 로그에는 회원 번호를 남기고, 처리방침에 "서버 오류 기록"을 추가한다(사용자 결정).
- Cloudflare Tunnel을 처리방침 위탁·국외 이전에 넣을지는 따로 판단한다(사용자 결정).
- Loki에는 각 로그의 첫 줄만 보낸다. Spring 로그 줄은 ISO 날짜로 시작하므로, 날짜로 시작하지 않는 줄(예외
  클래스·메시지, `Caused by:`, 스택 프레임, 여러 줄 메시지의 이어진 줄, 시작 배너)은 버린다. 예외 메시지와
  SQL 값 같은 요청 데이터는 둘째 줄부터 나오므로 단어 목록으로 막는 것보다 빠짐이 적다. 2026-10-21 Loki에서
  두 환경의 Spring 줄이 모두 날짜로 시작하고, staging에는 `... N common frames omitted` 줄 55개가 기존
  필터를 통과해 들어와 있던 것을 확인했다.
- 검색어 원문을 담는 로그는 `searchType=` 키로 고른다. 상품 검색 이벤트는 이미 `searchType=PRODUCT_SEARCH`가
  있고, 공유 텍스트로 제품을 못 찾은 로그(브랜드명·검색어)는 키가 없어 두 환경 모두 Loki에 들어가고 있었으므로
  `searchType=SHARE_TEXT`를 붙였다. 검색어 사전·순위 로그는 ID와 개수만 남겨 그대로 보낸다.
- 첫 줄 메시지에는 ID와 코드만 쓰고 예외 메시지나 사용자 입력은 넣지 않는다. 점검 결과 이 규칙을 어긴 곳은
  소셜 로그인 실패 로그 하나라, 제공자 설명 대신 OAuth 오류 코드만 남기게 고쳤다.

## 저장소 변경

| 영역 | 변경 |
| --- | --- |
| `deploy/monitoring/alloy` | `production-backend.alloy` 추가, `staging.alloy`의 로그 필터를 같은 규칙으로 교체 |
| `deploy/monitoring/grafana/dashboards` | 운영·staging 백엔드 대시보드에 "Error Logs (per 5m)" 그래프와 "Error Logs" 목록 추가 |
| `server` | 공유 텍스트 미확정 로그에 `searchType=SHARE_TEXT`, 소셜 로그인 실패 로그는 오류 코드만, 로그 규칙을 `ARCHITECTURE.md`에 기록 |
| `client` | 처리방침에 서버 오류 기록의 수집 항목·보유 기간·파기·확인 요청 추가, 법정 문서 README 갱신 |

`production-backend.alloy`는 2026-10-21 운영 서버의 `/etc/alloy/config.alloy`를 SSM으로 읽어 옮겼다. 지표와
journal 수집은 그대로 두고 `loki.process`의 필터만 바꿨다. 2026-10-22 두 파일을 서버에서 `alloy fmt`로 맞추고 주석과
빈 줄을 뺀 뒤 비교해, `loki.process` 필터 말고는 같다는 것을 확인했다(남은 차이는 공백 한 줄).

`staging.alloy`는 저장소에서 10/1에 Docker 로그용 `SYSLOG_IDENTIFIER=poudy-backend` 수집을 더했지만 서버에는 반영되지
않았다. 2026-10-22 확인해 보니 staging 백엔드는 `exec docker run`으로 컨테이너를 붙여 실행해 서비스 유닛 journal에 모든
줄이 남고, Docker의 journald 드라이버(`tag=poudy-backend`)가 같은 줄을 한 번 더 남긴다. 둘 다 읽으면 Loki에 줄이 두 번
들어가므로 서비스 유닛만 읽도록 되돌렸다.

## 서버 반영 순서

각 단계는 사용자 확인을 받고 진행한다. 서버 파일을 바꾸기 전에는 늘 기존 파일을 날짜를 붙여 백업한다.

1. **staging 백엔드 Alloy** (`i-00b689c66dc629d79`): 2026-10-22 04:02 UTC 반영 완료. `/etc/alloy/config.alloy.bak.20261022040158`로
   백업한 뒤 저장소 파일을 배치했다. `alloy validate` 통과, 서버 파일 해시가 저장소 파일과 같고, 재시작 뒤 `active`이며
   경고 로그가 없다. 재시작 뒤 백엔드가 남긴 5줄(04:10 검색어 사전 갱신)을 Alloy가 5줄 읽어 Loki로 5줄 보냈고, Loki에서도
   5줄 모두 날짜로 시작하는 첫 줄로 조회됐다. 중복 수집과 전송 실패는 없었다.
2. **staging 대시보드**: 모니터링 EC2의 `/opt/poudy-monitoring/data/grafana/dashboards/poudy/poudy-backend-staging.json`을
   백업하고 교체한다. provider가 30초마다 읽는다. 반영 완료. 교체 전 서버 파일을 정렬해 비교하니 이번 변경 말고는 Hikari
   대기 패널 설명이 저장소보다 예전 것이었을 뿐 서버에만 있는 변경은 없었다. 기존 파일은 프로비저닝 경로 밖
   `/opt/poudy-monitoring/backup/dashboard-890-20261022080607/`에 백업했다. Grafana가 패널 24개와 두 새 패널을 읽어 들였고,
   에러 수 그래프에는 반영 전에 난 staging ERROR가 잡혔다. 그 ERROR 줄은 예전 필터가 버려 목록 패널은 아직 비어 있다.
3. **staging 확인**: Loki에 새 줄이 계속 들어오는지, 첫 줄이 아닌 줄과 검색 이벤트가 빠지는지, 두 패널이 그려지는지
   본다. Alloy는 서비스 유닛 journal만 읽으므로 시험 줄을 따로 넣을 수 없다. ERROR 목록은 실제 ERROR가 날 때 확인한다.
4. **운영 백엔드 Alloy** (`i-0192ed4a2f51748fe`): 서버 파일과 `production-backend.alloy`를 비교한 뒤 1단계와 같은
   순서로 반영한다. 재시작하는 동안 지표와 로그가 잠깐 빈다.
5. **운영 대시보드**: 운영 대시보드(UID `ad2z7mm`)는 파일 프로비저닝이 아니라 Grafana에서 관리하는 대시보드다.
   기존 방식대로 저장소 JSON을 같은 UID로 가져와 덮어쓴다.
6. **서버·클라이언트 배포**: 로그 메시지 변경은 서버 배포로, 처리방침은 클라이언트 배포로 나간다. Loki에 회원 번호가
   담긴 첫 줄이 들어가기 시작하는 4단계 전에 처리방침이 공개돼 있어야 한다.

## 열린 질문

1. 처리방침 시행일(`client/components/legal/operator.ts`)은 2026년 10월 22일이다. 이번 개정 이력은 이 값을 쓰므로,
   배포일에 맞게 시행일을 정해야 한다.
2. 처리방침의 위탁·국외 이전 목록에 Cloudflare가 없다. 로그와 지표가 Cloudflare Tunnel을 거치므로 따로 판단한다.

## 하지 않는 것

- 에러 알림(Discord 등)
- `SearchKeywordDictionaryRepository`의 WARN이 많은 원인 정리
- Prometheus 보관 기간(3일) 연장

## 검증

- 필터 규칙: 실제 로그 줄 모양의 표본 12개로 남길 줄과 버릴 줄을 시험했다(Python 정규식, RE2와 같은 문법만 사용).
- 대시보드 쿼리: Grafana에서 두 쿼리를 읽기 전용으로 실행했다. 에러 수 쿼리는 staging의 지난 3일 ERROR 1건을 잡았고,
  목록 쿼리는 같은 형식으로 INFO 줄을 걸러 형식이 맞는 것을 확인했다.
- 서버: 공유 텍스트 미확정 로그와 소셜 로그인 실패 로그의 테스트를 추가했다.
- 클라이언트: 법정 문서 테스트에 서버 오류 기록 안내를 추가했다.
- 서버 반영 단계의 확인 결과는 진행하면서 이 문서에 적는다.
