# Issue #288 결과 보고서

대상 이슈: [#288](https://github.com/woowacourse-teams/2026-poudy/issues/288)
선행 이슈: [#287](https://github.com/woowacourse-teams/2026-poudy/issues/287)

## 실행 상태

2026-08-30에 #287 미적용 상태의 staging baseline을 SSM 동시 수집과 함께 재측정했다.
이후 staging에 #287 설정을 적용하고 검증한 뒤, CodeDeploy가 진행 중이지 않은 상태에서
동일 조건 after를 재측정했다. 성능 통과 기준은 임의로 확정하지 않고 관측된 결과와
운영 요구사항을 근거로 해석한다.

- 리전: `ap-northeast-2`
- 테스트 대상: `https://staging.poudy.site/api/categories`
- 요청: `GET` only
- 부하 생성기: 로컬 PC
- 테스트 스크립트: [`categories.js`](categories.js)
- 선행 설정: #287의 Nginx 캐시 및 systemd 자동 재시작(staging 적용·검증 완료)
- baseline 원본: [`results/baseline.json`](results/baseline.json)
- after 원본: [`results/after-287.json`](results/after-287.json)
- 배포 간섭 결과: [`results/after-287-deployment-interrupted.json`](results/after-287-deployment-interrupted.json)

## 적용 전후 비교

| 항목 | #287 적용 전 | #287 적용 후 | 변화 |
| --- | ---: | ---: | ---: |
| 고정 시나리오 최고 단계 | 10 req/s, 오류 없음* | 10 req/s, 오류 없음* | 동일 |
| 총 요청 수 | 765 | 764 | -1건 |
| 평균 처리량 | 3.6426 req/s | 3.6381 req/s | 거의 동일 |
| 평균 응답시간 | 10.8749 ms | 13.7290 ms | 26.2% 악화 |
| median 응답시간 | 10.1680 ms | 8.9610 ms | 11.9% 개선 |
| p90 응답시간 | 12.7762 ms | 26.4638 ms | 107.1% 악화 |
| p95 응답시간 | 14.3908 ms | 33.3231 ms | 131.6% 악화 |
| p99 응답시간 | 24.7062 ms | 46.1921 ms | 87.0% 악화 |
| 최대 응답시간 | 67.2670 ms | 268.4590 ms | 299.1% 악화 |
| 오류율 | 0.00% (0/765) | 0.00% (0/764) | 동일 |
| HTTP 상태 코드 | 2xx 765, 4xx/5xx/기타 0 | 2xx 764, 4xx/5xx/기타 0 | 오류 없음 |
| timeout | 0 | 0 | 동일 |
| transport failure | 0 | 0 | 동일 |
| check 성공률 | 100% (1530/1530) | 100% (1528/1528) | 동일 |
| `/api/categories` 캐시 동작 | 미적용, `X-Poudy-Cache` 없음 | MISS → HIT 확인 | 기능 정상 |
| backend PID | `242457` 유지 | `247862` 유지 | 재시작 없음 |

\* 고정 시나리오에서 도달한 최대 단계이며 staging의 절대 최대 처리량을 의미하지 않는다.
after가 1건 적은 것은 k6 arrival-rate 실행의 요청 스케줄링 차이로 기록하며 처리량은
사실상 동일하다. staging에는 CloudWatch Agent가 없으므로 CPU Credit과 EC2 Status Check는
`N/A`다. 운영 EC2의 CloudWatch/Grafana 지표는 staging 비교에 사용하지 않는다.

이번 after에서는 median이 개선됐지만 평균과 p90·p95·p99가 악화됐다. 따라서 이번
고정 저부하 시나리오에서 캐시의 end-to-end 응답시간 개선은 확인하지 못했다.

## 현재 확인한 공개 smoke test

baseline 보조 측정은 2026-08-28 13:25 KST에 로컬 PC에서 실행했고, 운영 smoke는
2026-08-30에 실행했다. 이 값들은 단일 요청 smoke 값이며 k6 부하 결과와 섞지 않는다.
staging 응답에는 `Vary: Origin`이 있었고 staging Vercel origin은 CORS 응답을 받았으므로,
캐시 key에 `Origin`을 포함했다.

| 대상 | HTTP | 전체 시간 | 응답 크기 | 본문 SHA-256 | 관찰 |
| --- | ---: | ---: | ---: | --- | --- |
| staging `/api/categories` (baseline 전) | 200 | 35.66 ms | 778 B | `1d536e58d64a195681ed8e5a4062f062c345b3b1d93d0a156949890d5970a9fe` | `Cache-Control`, `X-Poudy-Cache` 없음 |
| staging API + Vercel Origin | 200 | 31.31 ms | 778 B | 동일 | CORS 허용 origin 응답 |
| 운영 `/categories` (최종 smoke) | 200 | 143.969 ms | 29,749 B | `3278df39a4a73e1dd8bd13b8a7f1f093dd6fcfbf5b50b615e5aa557d7a218a17` | `Server: nginx/1.30.4`, no-cache |
| 운영 `/api/categories` (최종 smoke) | 200 | 33.117 ms | 779 B | `a3d50e8b231d02437b93d9f010bba11dfaaa5924f75eb1f75793fa9432e5232b` | `Server: nginx/1.30.4`, `Vary: Origin` |
| staging Vercel `/` | 200 | 113.12 ms | 41,596 B | `05d01cc081205a3e72b91171bbf9a4ab0aec9d3d3f039014b2a04a7fc6517be8` | `server: Vercel`, `x-vercel-cache: HIT` |

Vercel 페이지 행은 HTTP 문서 응답만 기록한 것이며 JavaScript 실행과 API 호출 성공을
뜻하지 않는다. 본문 hash는 캐시 적용 후 응답 본문이 바뀌지 않았는지 비교할 때 사용한다.

## 서버 지표 수집 상태

staging에는 CloudWatch Agent와 Grafana Probe가 없으므로 호스트 지표는 SSM에서 직접
수집했다. CPU Credit과 EC2 Status Check는 staging 비교에서 `N/A`다. 운영 CloudWatch와
Grafana는 staging 전후 비교에 사용하지 않았다.

| 항목 | 상태 | 수집 방법 |
| --- | --- | --- |
| staging CPU·load | 수집 완료 | SSM `uptime`, `vmstat`, `ps` |
| staging 메모리·backend RSS | 수집 완료 | SSM `free`, `ps` |
| staging 디스크·swap | 수집 완료 | SSM `df`, `free` |
| staging CPU Credit·Status Check | N/A | staging 모니터링 구성에 없음 |
| staging Nginx access/error | 수집 완료 | SSM 로그 확인 |
| backend journal | 수집 완료 | SSM `journalctl` 확인 |
| Grafana Public Probe | 운영 smoke만 해당 | `poudy.site` 공개 경로 |
| systemd 자동 재시작 | 검증 완료 | staging에서 SIGKILL 후 새 PID·health 확인 |

## staging 호스트 및 배포 검증

2026-08-30 staging EC2의 SSM 셸에서 baseline과 after 자원 지표를 수집하고 #287 설정을
검증했다.

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
- 최종 after 부하 중 k6 요청 `764건` 모두 `200`
- 최종 after 부하 중 backend journal에 추가 재시작·오류 없음

### SSM 샘플 요약

| 지표 | baseline | 최종 after | 해석 |
| --- | --- | --- | --- |
| load average | 최대 `0.02` | 최대 `0.16` | 낮은 수준 |
| host CPU | `vmstat` idle 100% | idle 94~100%, busy 최대 6% | CPU 포화 없음 |
| 메모리 사용 | `692~705MB / 1841MB` | `751~756MB / 1841MB` | swap 없이 가용 메모리 유지 |
| 가용 메모리 | `987~999MB` | `935~943MB` | after가 낮지만 압박 증거 없음 |
| backend RSS | `344172~356640KB` | `348744~349284KB` | 급격한 증가 없음 |
| backend process `%CPU` | `0.5%` | `0.7%` | `ps` 누적 기준 값 |
| 디스크 | `/` 18% | `/` 18% | 변화 없음 |
| Swap | 0 | 0 | swap 사용 없음 |

after의 SSM sample 5는 세션 출력에 포함되지 않았으므로, 위 after 범위는 실제 확인된
sample 1~4를 기준으로 한다.

## 캐시 적용 효과

staging `/api/categories`에는 `GET/HEAD`만 30초 동안 캐시하고, Authorization·Cookie가
있는 요청은 bypass/no-cache하는 정책을 적용했다. 캐시 key에는 `$http_origin`을 포함했다.

최종 after 테스트 후 고유 query로 확인한 결과는 다음과 같다.

| 요청 | 응답 | 캐시 |
| --- | ---: | --- |
| 첫 번째 | 200 | `MISS` |
| 동일 두 번째 | 200 | `HIT` |

두 응답의 본문 SHA-256은 모두
`1d536e58d64a195681ed8e5a4062f062c345b3b1d93d0a156949890d5970a9fe`로 동일했다.
Nginx access log에 upstream cache status를 남기는 설정은 없으므로 부하 전체의 정확한
cache hit ratio는 측정하지 않았다.

이번 고정 저부하 시나리오에서는 median만 개선되고 평균·p90·p95·p99는 악화됐다.
따라서 캐시 기능은 정상이나 end-to-end 응답시간 개선 효과는 확인하지 못했다.

## systemd 자동 재시작 검증

2026-08-28 staging에서 backend PID `137539`를 통제된 `SIGKILL`로 종료했다.

- systemd가 약 5초 뒤 재시작을 예약했다.
- 새 PID `137880`으로 기동했다.
- health는 약 24초 후 `UP`이 됐다.
- 애플리케이션 기동 자체에는 약 16.2초가 걸렸다.

따라서 `Restart=on-failure`, `RestartSec=5s`, `StartLimitIntervalSec=300`,
`StartLimitBurst=5` 정책과 자동 복구는 검증됐다. 최종 after 테스트에서는 PID `247862`가
유지됐고 `NRestarts=0`, `Result=success`였다.

## CodeDeploy 간섭 기록

첫 번째 after 실행 중에는 다음 backend 배포가 발생했다.

- `d-724AT71JK`: `08:14:20` 시작
- backend graceful stop/start: `08:14:20~08:14:43`
- `d-PQHZXY1JK`: `08:18:27` 시작
- kernel OOM 없음
- backend `NRestarts=0`, `Result=success`

이 실행은 부하 중 배포가 섞였으므로 최종 비교에서 제외하고
`after-287-deployment-interrupted.json`으로 보존했다. 이후 배포 hook 프로세스가 없는
상태를 확인한 뒤 after를 다시 실행했으며, 그 결과를 최종 비교에 사용했다.

staging Vercel 페이지의 단순 HTTP GET은 Vercel 응답(`x-vercel-cache: HIT`)만 확인하며,
브라우저 JavaScript 실행과 API 호출 성공을 의미하지 않는다.

## 해석과 후속 조치

- 이번 시나리오에서는 5xx·timeout·CPU 포화·swap·디스크 부족이 없고 최종 after 중
  backend 재시작도 없었다. 현재 프론트·백엔드 단일 EC2 구조를 유지한다.
- 캐시는 정상 작동했지만 응답시간 개선은 관측되지 않았다. 더 높은 트래픽에서 효과를
  판단하려면 Nginx access log에 `$upstream_cache_status`를 추가해 hit ratio를 측정한다.
- staging에는 CloudWatch Agent와 Grafana Probe가 없으므로 CPU Credit, EC2 Status Check,
  staging Grafana 지표는 `N/A`다. 운영 CloudWatch/Grafana는 staging 비교에 사용하지
  않았다.
- 더 높은 요청량에서 지속적인 CPU 포화, 가용 메모리 감소, CPU Credit 감소,
  timeout/5xx 증가 또는 반복적인 재시작이 관찰되면 요청 제한·캐시 정책을 먼저
  재검토한다.
- 설정 조정만으로 안정성을 확보하지 못할 때 ALB·다중 EC2·Auto Scaling을 별도 이슈로
  검토한다.
