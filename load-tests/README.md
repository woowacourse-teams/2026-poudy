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

## 고정 부하 용량 확인

기존 `categories.js`는 #288 전후 비교를 위한 ramp-up 시나리오이므로 변경하지 않는다.
최대 처리량을 확인할 때는 `categories-capacity.js`를 사용한다. 이 파일은 한 번 실행할 때
하나의 처리량을 일정하게 유지한다. 기존 시나리오의 `10 req/s`는 10 req/s를 30초 동안
유지한 값이 아니므로, 이 테스트 결과로 대체해서 해석하지 않는다.

staging에서 1·3·5·10·20 req/s를 각각 60초씩 실행한다. 각 단계가 끝난 뒤 결과와 staging
자원을 확인하고, 5xx·timeout·transport failure·`dropped_iterations`·메모리 급증이
없을 때만 다음 단계로 넘어간다. 아래 명령은 한 번에 하나씩 실행한다.

```bash
mkdir -p load-tests/results/capacity

BASE_URL=https://staging.poudy.site \
RATE=1 DURATION=60s \
RESULT_FILE=load-tests/results/capacity/after-287-1rps.json \
k6 run load-tests/categories-capacity.js
```

안정적으로 끝났다면 같은 명령에서 `RATE`와 결과 파일만 `3`, `5`, `10`, `20`으로 바꿔
반복한다. 한 단계에서 문제가 발생하면 반복을 중단하고 staging을 회복시킨다.

이 시나리오는 동일한 공개 API 경로를 반복하므로, 캐시가 적용된 현재 staging의 공개
진입점 용량을 측정한다. 캐시 적중 상태의 결과만으로 Spring Boot 백엔드의 최대 처리량을
의미한다고 해석하지 않으며, 백엔드 자체의 용량이 필요하면 별도의 캐시 미적중 테스트를
계획한다.

백엔드 처리 경로를 확인할 때는 `CACHE_MODE=cold`를 사용한다. 현재 staging Nginx는
Cookie가 있는 요청을 `proxy_cache_bypass`·`proxy_no_cache` 처리하므로 테스트용 쿠키가
있는 모든 요청이 캐시를 읽거나 쓰지 않는다. 실행 전에 다음 응답이 `X-Poudy-Cache:
BYPASS`인지 확인한다.

```bash
curl --insecure --fail --silent --show-error \
  -H 'Cookie: poudy-capacity-bypass=1' \
  -D - -o /dev/null \
  https://staging.poudy.site/api/categories \
  | grep -iE 'HTTP/|X-Poudy-Cache'
```

`BYPASS`가 확인된 경우에만 고정 부하 테스트를 실행한다. `CACHE_MODE=cold` 결과는
캐시 예열 공개 경로 결과와 분리해서 기록하며, 캐시 미적중 조건의 Nginx·backend 처리
용량으로 해석한다. #288 검증에서는 10·20·30 req/s를 각각 60초씩 실행했다.

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
