# Issue #288 결과 보고서

대상 이슈: [#288](https://github.com/woowacourse-teams/2026-poudy/issues/288)  
선행 이슈: [#287](https://github.com/woowacourse-teams/2026-poudy/issues/287)

## 실행 상태

2026-08-28 13:15 KST에 #287 미적용 상태의 staging baseline을 완료했다. 이후
staging에 #287 설정을 적용하고 검증했으며, 동일 조건 재테스트 수치는 추가한다. 성능 통과 기준은 baseline을
먼저 측정한 뒤에도 임의로 확정하지 않고, 관측된 병목과 운영 요구사항을 근거로 정한다.

- 리전: `ap-northeast-2`
- 테스트 대상: `https://staging.poudy.site/api/categories`
- 요청: `GET` only
- 부하 생성기: 로컬 PC
- 테스트 스크립트: [`categories.js`](categories.js)
- 선행 설정: #287의 Nginx 캐시 및 systemd 자동 재시작(staging 적용·검증 완료)
- baseline 원본: [`results/baseline.json`](results/baseline.json)

## 적용 전후 비교

| 항목 | #287 적용 전 | #287 적용 후 | 변화 |
| --- | ---: | ---: | ---: |
| 최대 안정 처리량 | 10 req/s spike까지 오류 없음* | 미측정 | - |
| 총 요청 수 | 765 | 미측정 | - |
| 평균 처리량 | 3.64 req/s | 미측정 | - |
| 평균 응답시간 | 8.99 ms | 미측정 | - |
| p90 응답시간 | 10.81 ms | 미측정 | - |
| p95 응답시간 | 11.61 ms | 미측정 | - |
| p99 응답시간 | 15.51 ms | 미측정 | - |
| 오류율 | 0.00% (0/765) | 미측정 | - |
| HTTP 상태 코드 | 2xx 765, 4xx/5xx/기타 0 | 미측정 | - |
| timeout | 0 | 미측정 | - |
| transport failure | 0 | 미측정 | - |
| 최대 CPU 사용률 | 미측정 | 미측정 | - |
| 최대 메모리 사용률 | 미측정 | 미측정 | - |
| CPU Credit 변화 | 미측정 | 미측정 | - |
| `/api/categories` 캐시 동작 | `X-Poudy-Cache` 없음, 미적용 | MISS → HIT 확인 | - |
| 프로세스 자동 재시작 | 미검증 | 새 PID·health 복구 확인 | - |
| 테스트 종료 후 회복 | 공개 GET 200 확인 | 부하테스트 후 확인 예정 | - |

\* 고정 시나리오에서 도달한 최대 단계이며 staging의 절대 최대 처리량을 의미하지 않는다.
staging에는 CloudWatch Agent가 설치되어 있지 않으므로 staging CloudWatch 지표와 CPU
Credit은 `N/A`로 기록한다. staging EC2 자원 지표는 부하테스트와 같은 시간에 SSM에서
직접 수집한다. 운영 EC2의 CloudWatch/Grafana 지표는 운영 smoke test에 한해 별도로
기록한다.

## 현재 확인한 공개 smoke test

2026-08-28에 staging과 운영의 공개 `GET /api/categories`는 모두 HTTP 200으로
응답했다. baseline 직후 staging 응답은 200이었고, 당시 두 응답 모두 `Cache-Control`은 없었으며 staging 응답에는
`Vary: Origin`이 있었다. 허용된 staging Vercel origin은 CORS 응답을 받았고,
허용되지 않은 origin은 403이었다. 따라서 캐시 키에 `Origin`을 포함해야 한다.

baseline 보조 측정은 2026-08-28 13:25 KST에 로컬 PC에서 실행했다. 이 값은 단일
요청 smoke 값이며 k6 부하 결과와 섞지 않는다.

| 대상 | HTTP | 전체 시간 | 응답 크기 | 본문 SHA-256 | 관찰 |
| --- | ---: | ---: | ---: | --- | --- |
| staging `/api/categories` | 200 | 35.66 ms | 778 B | `1d536e58d64a195681ed8e5a4062f062c345b3b1d93d0a156949890d5970a9fe` | `Cache-Control`, `X-Poudy-Cache` 없음 |
| staging API + Vercel Origin | 200 | 31.31 ms | 778 B | 동일 | CORS 허용 origin 응답 |
| 운영 `/api/categories` | 200 | 79.31 ms | 779 B | `a3d50e8b231d02437b93d9f010bba11dfaaa5924f75eb1f75793fa9432e5232b` | `Cache-Control`, `X-Poudy-Cache` 없음 |
| staging Vercel `/` | 200 | 113.12 ms | 41,596 B | `05d01cc081205a3e72b91171bbf9a4ab0aec9d3d3f039014b2a04a7fc6517be8` | `server: Vercel`, `x-vercel-cache: HIT` |

Vercel 페이지 행은 HTTP 문서 응답만 기록한 것이며 JavaScript 실행과 API 호출 성공을
뜻하지 않는다. 본문 hash는 캐시 적용 후 응답 본문이 바뀌지 않았는지 비교할 때 사용한다.

## 서버 지표 수집 상태

현재 로컬 AWS principal은 `arn:aws:iam::211125632160:user/s3-user`다. 다음 읽기
요청이 모두 IAM `AccessDenied`로 거부되어, 아래 값은 아직 측정값으로 채울 수 없다.

| 항목 | 상태 | 필요한 권한/방법 |
| --- | --- | --- |
| staging CPU·메모리·디스크 | SSM으로 수집 예정 | staging CloudWatch Agent 없음; SSM `uptime/free/vmstat/ps` |
| staging CPU Credit·Status Check | N/A | staging에는 CloudWatch Agent가 없음; 운영 smoke에서만 확인 |
| staging Nginx access/error | 미수집 | SSM 접속 후 로그 조회 |
| backend journal | 미수집 | SSM 접속 후 `journalctl -u poudy-backend.service` |
| Grafana Public Probe | 운영 smoke에서 수집 | `poudy.site` 공개 Probe만 운영 지표로 사용 |
| systemd 자동 재시작 | 검증 완료 | staging에서 SIGKILL 후 새 PID·health 복구 확인 |

## staging 호스트 #287 적용 후 확인

2026-08-28 13:50~13:58 KST에 staging EC2의 SSM 셸에서 #287 설정 반영과 복구를 확인했다.

- 호스트: `ip-10-0-0-185.ap-northeast-2.compute.internal`
- Nginx·`poudy-backend.service`: `active`
- `80/443`: Nginx listen, `8080`: Java listen
- `GET http://127.0.0.1:8080/actuator/health`: `UP`
- `/etc/nginx/conf.d/poudy-staging-api.conf`: staging 전용 설정 파일 확인
- staging HTTPS `/api/categories`: `200`
- `nginx -t`: 성공
- backend systemd: `Restart=on-failure`, `RestartUSec=5s`,
  `StartLimitIntervalUSec=5min`, `StartLimitBurst=5`
- `nginx -t`: 성공
- 일반 API 요청: 첫 요청 `X-Poudy-Cache: MISS`, 두 번째 요청 `HIT`
- Vercel staging Origin 요청: 첫 요청 `MISS`, 두 번째 요청 `HIT`, CORS 허용
- 각 요청 쌍의 본문 SHA-256: 동일
- backend를 통제된 `SIGKILL`로 종료한 뒤 5초 후 systemd가 새 PID로 재시작
- 재시작 시도 후 약 24초 뒤 health 복구; 애플리케이션 기동 자체는 약 16.2초

staging 자원 지표는 CloudWatch가 아니라 부하테스트 시점의 SSM 샘플로 기록한다.
운영 CloudWatch 조회 권한이 현재 로컬 AWS principal(`s3-user`)에 없다는 사실은
staging 지표 부재와 별개의 문제다.

staging Vercel 페이지의 단순 HTTP GET은 Vercel 응답(`x-vercel-cache: HIT`)만 확인하며,
브라우저 JavaScript 실행과 API 호출 성공을 의미하지 않는다.

## 해석과 후속 조치

실행 결과에 따라 이 표를 갱신한다.

- 캐시 적용 후 API 응답시간·오류율이 baseline보다 개선되고 자원 여유가 있으면 현재
  프론트·백엔드 단일 EC2 구조를 유지한다.
- 캐시 적중에도 CPU·메모리·CPU Credit이 빠르게 감소하거나 timeout/5xx가 증가하면
  요청량을 중단하고 병목을 기록한다.
- systemd 재시작이 실패하거나 반복되면 서비스 파일의 시작 제한과 journal 원인을
  확인한다.
- 설정 조정으로 안정 처리량을 확보하지 못할 때만 ALB + 다중 EC2 또는 Auto Scaling을
  별도 이슈로 검토한다.
