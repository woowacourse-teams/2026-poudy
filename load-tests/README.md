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

부하 중 staging EC2의 다음 값을 같은 시각 범위로 기록한다.

- CloudWatch Agent: CPU, 메모리, 디스크, 프로세스 지표
- EC2 기본 지표: CPU Credit Balance, Status Check
- staging Nginx access/error log
- `journalctl -u poudy-backend.service` 및 systemd 상태
- 테스트 전후 `/api/categories`의 `X-Poudy-Cache` 값과 본문 일치 여부

k6 결과 원본에는 총 요청·처리량·평균/최대/p90/p95/p99 응답시간, 오류율, HTTP 상태
코드 그룹, timeout·transport failure, check 성공률, 연결·TLS·대기·송수신 시간과
전송량이 저장된다. EC2 CPU·메모리·디스크·CPU Credit과 Nginx·journal·Grafana 값은
k6 결과와 별도로 같은 시간 범위에서 수집해 결과 보고서에 합친다.

운영은 staging 결과 확인 후 낮은 트래픽 시간에 다음 두 경로만 smoke test한다.

```bash
curl --fail --silent --show-error --max-time 10 https://poudy.site/categories >/dev/null
curl --fail --silent --show-error --max-time 10 https://poudy.site/api/categories >/dev/null
```

운영에 staging용 부하 시나리오를 실행하지 않는다. 현재 인프라는 프론트·백엔드 각각
단일 EC2이며 ALB, WAF, Auto Scaling, blue/green을 사용하지 않는다.
