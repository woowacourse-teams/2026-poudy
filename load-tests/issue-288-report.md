# Issue #288 결과 보고서

대상 이슈: [#288](https://github.com/woowacourse-teams/2026-poudy/issues/288)  
선행 이슈: [#287](https://github.com/woowacourse-teams/2026-poudy/issues/287)

## 실행 상태

2026-08-28 12:46 KST에 #287 미적용 상태의 staging baseline을 완료했다. #287 적용 후
동일 조건 재테스트 수치는 staging 반영 뒤 추가한다. 성능 통과 기준은 baseline을
먼저 측정한 뒤에도 임의로 확정하지 않고, 관측된 병목과 운영 요구사항을 근거로 정한다.

- 리전: `ap-northeast-2`
- 테스트 대상: `https://staging.poudy.site/api/categories`
- 요청: `GET` only
- 부하 생성기: 로컬 PC
- 테스트 스크립트: [`categories.js`](categories.js)
- 선행 설정: #287의 Nginx 캐시 및 systemd 자동 재시작(적용 예정)
- baseline 원본: [`results/baseline.json`](results/baseline.json)

## 적용 전후 비교

| 항목 | #287 적용 전 | #287 적용 후 | 변화 |
| --- | ---: | ---: | ---: |
| 최대 안정 처리량 | 10 req/s spike까지 오류 없음* | 미측정 | - |
| 총 요청 수 | 764 | 미측정 | - |
| 평균 응답시간 | 8.87 ms | 미측정 | - |
| p95 응답시간 | 11.55 ms | 미측정 | - |
| p99 응답시간 | 18.35 ms | 미측정 | - |
| 오류율 | 0.00% (0/764) | 미측정 | - |
| 최대 CPU 사용률 | 미측정 | 미측정 | - |
| 최대 메모리 사용률 | 미측정 | 미측정 | - |
| CPU Credit 변화 | 미측정 | 미측정 | - |
| `/api/categories` 캐시 동작 | `X-Poudy-Cache` 없음, 미적용 | 미측정 | - |
| 프로세스 자동 재시작 | 미검증 | 미검증 | - |
| 테스트 종료 후 회복 | 공개 GET 200 확인 | 미검증 | - |

\* 고정 시나리오에서 도달한 최대 단계이며 staging의 절대 최대 처리량을 의미하지 않는다.
CPU·메모리·CPU Credit은 현재 세션의 AWS principal(`s3-user`)에 EC2/CloudWatch 조회
권한이 없어 수집하지 못했다.

## 현재 확인한 공개 smoke test

2026-08-28에 staging과 운영의 공개 `GET /api/categories`는 모두 HTTP 200으로
응답했다. baseline 직후 staging 응답은 200이었고, 당시 두 응답 모두 `Cache-Control`은 없었으며 staging 응답에는
`Vary: Origin`이 있었다. 허용된 staging Vercel origin은 CORS 응답을 받았고,
허용되지 않은 origin은 403이었다. 따라서 캐시 키에 `Origin`을 포함해야 한다.

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
