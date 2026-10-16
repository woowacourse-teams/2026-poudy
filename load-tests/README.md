# staging 부하테스트

`categories.js`는 로컬 PC에서 staging 공개 API에 읽기 전용 GET 요청만 보내는
k6 시나리오다. Spring Boot 코드나 애플리케이션 메모리 캐시를 변경하지 않으며,
`POST`, `PUT`, `DELETE`, feedback, product request, S3 변경 요청은 사용하지 않는다.

## 고정 테스트 조건

적용 전후에 같은 파일과 환경값을 사용한다.

| 단계 | 목표 처리량 | 시간 |
| --- | ---: | ---: |
| 시작 | 1 req/s | 30초 |
| ramp-up 1 | 3 req/s | 60초 |
| ramp-up 2 | 5 req/s | 60초 |
| 짧은 spike | 10 req/s | 30초 |
| recovery | 0 req/s | 30초 |

총 실행 시간은 3분 30초다. 이 값은 성능 통과 기준이 아니라, 단일 staging EC2를
멈추지 않도록 고정한 비교용 요청 패턴이다. 안정 처리량과 성능 판단 기준은 baseline
결과를 확인한 뒤 기록한다.

## 실행

k6가 로컬에 설치되어 있어야 한다.

```bash
mkdir -p load-tests/results
BASE_URL=https://staging.poudy.site \
RESULT_FILE=load-tests/results/baseline.json \
k6 run load-tests/categories.js
```

`#287`을 staging에 적용한 뒤에는 파일·URL·요청량·실행 시간을 바꾸지 않고 결과 파일만
바꿔 다시 실행한다.

```bash
BASE_URL=https://staging.poudy.site \
RESULT_FILE=load-tests/results/after-287.json \
k6 run load-tests/categories.js
```

이 스크립트의 `http_req_failed rate==0` threshold는 성능 합격 기준이 아니다. 5xx 또는
timeout이 발생하면 테스트를 중단하기 위한 안전장치다. 결과를 기다리지 않고도 5xx,
timeout, 메모리 급증, CPU Credit 급감이 보이면 즉시 `Ctrl-C`로 중단한다.

## 실행 전·후 확인

staging API의 공개 경로가 `staging.poudy.site`의 Nginx와 백엔드를 함께 통과하는지
확인한다. `/api/categories`의 응답 본문은 읽기만 하며 저장하지 않는다.

```bash
curl --fail --silent --show-error --max-time 10 \
  -D - -o /tmp/poudy-categories.json \
  https://staging.poudy.site/api/categories
```

프론트 페이지는 Vercel이 JavaScript를 실행하는지 별도로 브라우저에서 확인한다. 단순한
HTTP GET 결과만으로는 화면 렌더링이나 브라우저의 API 호출까지 확인할 수 없다.

부하 중 staging EC2의 다음 값을 같은 시각 범위로 기록한다. 현재 staging에는
CloudWatch Agent가 설치되어 있지 않으므로, CPU·메모리·디스크·프로세스 값은 SSM 셸에서
`uptime`, `free`, `vmstat`, `ps`를 실행해 수집한다.

- staging SSM: CPU, 메모리, 디스크, backend 프로세스 지표
- staging Nginx access/error log
- `journalctl -u poudy-backend.service` 및 systemd 상태
- 테스트 전후 `/api/categories`의 `X-Poudy-Cache` 값과 본문 일치 여부

CloudWatch Agent와 EC2 기본 지표(CPU, CPU Credit Balance, Status Check)는 운영
프론트·백엔드 EC2에 대해서만 확인한다. staging의 CloudWatch 값은 수집하지 않으며,
운영 smoke test 시 Grafana Public Probe와 함께 별도로 기록한다.

k6 결과 원본에는 총 요청·처리량·평균/최대/p90/p95/p99 응답시간, 오류율, HTTP 상태
코드 그룹, timeout·transport failure, check 성공률, 연결·TLS·대기·송수신 시간과
전송량이 저장된다. staging SSM, Nginx, journal 값과 운영 CloudWatch·Grafana 값은
k6 결과와 별도로 같은 시간 범위에서 수집해 결과 보고서에 합친다.

운영은 staging 결과 확인 후 낮은 트래픽 시간에 다음 두 경로만 smoke test한다.

```bash
curl --fail --silent --show-error --max-time 10 https://poudy.site/categories >/dev/null
curl --fail --silent --show-error --max-time 10 https://poudy.site/api/categories >/dev/null
```

운영에 staging용 부하 시나리오를 실행하지 않는다. 현재 인프라는 프론트·백엔드 각각
단일 EC2이며 ALB, WAF, Auto Scaling, blue/green을 사용하지 않는다.

## #679: 실제 화면 경로 혼합 부하

결과와 재현 방법은 아래 기록을 기준으로 봅니다. 초기 시험과 보완 시나리오는 요청
구성이 다르므로 서로의 수치로 개선율을 계산하지 않습니다.

| 기록 | 내용 |
|---|---|
| [7~56 req/s 단계 시험](results/user-paths-2026-10-15/README.md) | 1차 개선 후 실제 화면 경로로 보완한 부하 |
| [성분 필터 SQL 진단](results/search-facets-diagnostic-2026-10-15/README.md) | 실제 실행계획과 결과 동등성 |
| [최종 7/44 req/s 비교](results/product-read-679-2026-10-15/README.md) | 2차 개선 전후, CI와 원본 링크 |

### 재실행

`user-paths-679.js`는 당시 시나리오 그대로이며 SHA256은
`3a08625ed24d3d63e7ebf921c5c4ee9341b3343d19e6b6bb3175b2c2680d3bd0`입니다.
검색/자동완성/피부/카테고리/성분/상세/큐레이션/순위를
20/20/15/15/10/10/5/5%로 섞습니다. 비율은 실측 빈도가 아닌 가정입니다.
고정 ID와 데이터가 달라지면 응답 내용 검사가 실패할 수 있으므로 먼저 대조합니다.

Python 3, curl, k6가 필요합니다. 기록 당시 로컬 k6는 2.2.0, AWS는 2.3.0입니다.
아래 명령은 **실제 부하를 발생**시키므로 팀이 승인한 시험 시간에만 실행합니다.
이 문서 정리 작업에서는 다시 실행하지 않았습니다.

```sh
python3 load-tests/run-user-paths-679.py 7 10m \
  --output-dir load-tests/results/new-run-7 --label 7rps
```

출력 디렉터리는 새 경로를 사용합니다. 기존 결과 덮어쓰기는 거부합니다.
기록 당시 wrapper는 날짜와 임시 경로가 고정돼 있었고, 이번 버전은 출력 경로를
인자로 받도록 정리했습니다. k6 시나리오와 응답 검증 조건은 바꾸지 않았습니다.

wrapper는 약 15초마다 운영과 스테이징의 상품 상세 GET을 확인하고, 실패하면 k6를
중단합니다. 이 probe는 부하 요청 수와 별도입니다. **DB CPU·메모리 중단 기준은
자동화하지 않았으므로 별도 관측자가 확인하고 멈춰야 합니다.** #679의 90%·2분은
안전한 운영 기준이 아닌 당시 합의한 실험 중단선입니다.

44 req/s를 재현할 때는 승인된 두 출발지에서 각각 22 req/s씩 5분 실행합니다.
단일 IP에서 44를 보내면 기존 IP당 30 req/s 제한에 걸려 다른 시험이 됩니다.
보안 제한은 변경하지 않으며, 두 발생기의 분위수를 합산하지 않습니다.

### 원본 재계산

전체 SQL 계획과 큰 JSONL은 기록의 이슈 첨부에 있습니다. 압축 파일 안의 빈 Grafana
캡처는 제외하고, 수치는 k6와 자원 표본을 사용합니다. 압축 파일은 신뢰할 수 있는
작업 폴더에 풀고 내용을 확인한 뒤 아래 경로를 지정합니다. ZIP 자체는 Git에 복제하지
않았습니다. 원본 파일과 출력이 섞이지 않도록 재계산에는 복사본을 사용합니다.

```sh
python3 load-tests/analyze-679.py /path/to/copied-evidence
python3 load-tests/analyze-679-backend.py /path/to/copied-evidence
python3 load-tests/analyze-679-sql.py /path/to/copied-evidence
```

순서대로 `summary.json`과 SQL 증가분 파일을 다시 만듭니다. SQL 비교는 44 구간만
사용합니다. 개선 후 7 구간 통계에는 후속 단독 호출이 섞여 비교에서 제외했습니다.
기존 JSON은 측정 결과이며 이번 작업의 실행 결과가 아닙니다.

### 이미지 성능 기록

- [10/1 운영 이미지와 HTTP/2 기준선](../docs/performance/image-optimization-baseline.md)
- [10/2 홈 Lighthouse 기준선](../docs/performance/image-delivery/2026-10-02/README.md)
- [10/3 동일 빌드 CDN 대조](../docs/performance/image-delivery/2026-10-03/issue-615/README.md)
- [10/3~4 Vercel 상품 목록 관측](../docs/performance/image-delivery/2026-10-03/products-list/README.md)

Lighthouse 전체 원본 대신 실행별 지표, 설정, 원본 SHA256을 `run-summary.json`으로
보존했습니다. HTML과 요청 로그 등이 포함된 전체 원본은 로컬 보관 대상으로 남겼습니다.
이 기록은 당시 환경의 관측이며 현재 배포 상태를 뜻하지 않습니다.
