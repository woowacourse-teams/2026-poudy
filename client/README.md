# client

Next.js 프론트엔드.

## 기술 스택

| 구분          | 선택 기술                           |
| ------------- | ----------------------------------- |
| 개발 언어     | TypeScript                          |
| 프레임워크    | Next.js 16.3.0 (App Router)         |
| UI 라이브러리 | React 19.2.8                        |
| 스타일링      | Tailwind CSS 4                      |
| 패키지 매니저 | pnpm 11.21.0                        |
| 코드 품질     | ESLint 9, Prettier 3                |
| 타입 검사     | TypeScript 5                        |
| 자동 검증     | Git hook (`pre-commit`, `pre-push`) |

## 요구 사항

Node.js 22 이상, pnpm 11.21.0.

저장소를 클론한 뒤 프로젝트 루트에서 `./setup-git.sh`를 한 번 실행합니다. Git hook과 커밋 메시지 템플릿을 등록합니다.

## 설치

```bash
pnpm install
```

## 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다. 이 파일이 없으면 API 목 서버가 켜지지 않아 화면에 데이터가 나오지 않습니다.

```bash
cp .env.example .env.local
```

| 변수                       | 설명                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_MOCKING`  | `enabled`일 때만 MSW 목 서버를 켭니다. 실제 API에 붙일 때는 비웁니다. |
| `NEXT_PUBLIC_API_BASE_URL` | API 서버 주소. 목을 쓰는 동안에는 비워 둡니다.                        |

## 실행

```bash
pnpm dev
```

개발 서버가 실행되면 [http://localhost:3000](http://localhost:3000)에서 확인합니다.

## API 목 서버

실제 API 서버 없이 화면을 개발할 수 있도록 [MSW](https://mswjs.io)로 응답을 가로챕니다. 브라우저 워커와 Node 서버를 함께 띄우므로 서버 렌더링 중의 요청도 목으로 처리합니다.

핸들러와 데이터는 `mocks/`에 있고, 데이터 값은 `design/v1.pen`의 화면에 적힌 것을 옮겼습니다.

`public/mockServiceWorker.js`는 MSW가 만드는 파일이라 직접 고치지 않습니다. MSW 버전을 올린 뒤에는 워커를 다시 만듭니다.

```bash
pnpm run msw:init
```

## 검사

각 검사를 따로 실행할 수 있습니다.

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck
```

커밋 전에 필요한 검사를 한 번에 실행하려면 `check`를 사용합니다.

```bash
pnpm run check
```

`check`는 ESLint, Prettier, TypeScript 검사와 production build를 순서대로 실행합니다.

파일을 수정한 뒤 포맷을 적용할 때는 다음 명령을 실행합니다.

```bash
pnpm run format
```

## Git hook

프로젝트 루트의 Git hook이 Client 변경을 검사합니다.

- `pre-commit`: Client의 staged 파일에 `lint-staged`를 실행합니다.
- `pre-push`: push 대상 커밋에 Client 변경이 있으면 `pnpm run check`를 실행합니다.

hook을 우회했거나 설치하지 않은 경우에도 push 전에 다음 명령으로 같은 검사를 실행합니다.

```bash
pnpm run check
```

## API 타입

`common/api.zod.ts`는 Server의 OpenAPI 문서에서 생성합니다. Client에서 API 타입이 필요할 때 생성된 타입을 그대로 import합니다.

```ts
import type { ProductResponse } from "@poudy/api/api.zod";
```

`@poudy/api/*`는 저장소 루트의 `common/`을 가리키는 경로 별칭입니다.

API 타입 생성 방법은 [Server README](../server/README.md#api-타입-생성)를 참고하세요.

## 디렉터리 구조

| 경로     | 내용                         |
| -------- | ---------------------------- |
| `app`    | App Router 페이지와 레이아웃 |
| `lib`    | API 요청과 도메인 로직       |
| `mocks`  | MSW 핸들러와 목 데이터       |
| `design` | 디자인 파일 (추적하지 않음)  |
| `docs`   | 실행 계획 문서               |
| `public` | 정적 파일                    |

## 배포용 실행

먼저 production build를 생성한 뒤 서버를 실행합니다.

```bash
pnpm build
pnpm start
```

## 오류 추적 소스맵

`productionBrowserSourceMaps` 를 켜 운영 빌드에서 브라우저 소스맵을 만듭니다. 소스맵이
없으면 PostHog 에 남는 스택 추적이 `chunks/794-4b03.js:1:28471` 처럼 minify 된 자리만
가리켜 원인을 찾는 데 쓸 수 없습니다.

소스맵은 배포하지 않습니다. 두 배포 경로가 모두 `deploy/scripts/upload-sourcemaps.sh` 로
PostHog 에 올린 뒤 산출물에서 지웁니다.

| 배포            | 빌드                                           | 올리는 곳               |
| --------------- | ---------------------------------------------- | ----------------------- |
| 운영(EC2)       | `buildspec.yml`                                | `.next/static`          |
| staging(Vercel) | `.github/workflows/client-staging-deploy.yaml` | `.vercel/output/static` |

릴리스는 커밋 SHA 로 구분합니다. PostHog 의 Error tracking → Configuration → Symbol sets
에서 올라간 심볼셋을 확인합니다.

`POSTHOG_CLI_API_KEY` 와 `POSTHOG_CLI_PROJECT_ID` 가 없으면 업로드만 건너뛰고 배포는
그대로 진행합니다. 이때도 소스맵은 산출물에서 지우므로 원본 코드가 공개되지 않습니다.
운영 쪽 설정은 [deploy/README.md](../deploy/README.md#브라우저-소스맵) 를 참고하세요.

## 법정 문서

`/privacy` 개인정보 처리방침과 `/terms` 이용약관을 정적 페이지로 둡니다. Play Console 앱 콘텐츠에
등록하는 개인정보 처리방침 URL 은 로그인 없이 열리는 공개 주소여야 하고, 앱이 웹뷰라 이 두 페이지가
스토어와 앱 양쪽을 함께 맡습니다.

운영 주체와 보호책임자, 시행일은 `components/legal/operator.ts` 한 곳에 있습니다. 문서 본문은
`app/privacy/page.tsx` 와 `app/terms/page.tsx` 입니다.

### 수집 항목을 바꿀 때

처리방침에 적은 내용과 실제 수집이 어긋나면 개인정보보호법 위반이고, Play Console 데이터 보안
설문과도 어긋나 게시가 막힙니다. 다음을 바꾸는 작업은 처리방침 제2조·제3조를 함께 고칩니다.

- `lib/analytics/track.ts` 의 PostHog 설정, 특히 마스킹 대상과 세션 녹화
- `lib/analytics/events.ts` 의 이벤트 속성
- 서버로 새로 보내는 값

### 저장함을 서버에 저장하게 되면

지금 저장함은 `lib/storage/saved-products.ts` 가 브라우저에만 두고, 처리방침 제2조가 이를 명시하고
있습니다. 서버 저장으로 바꾸면 다음을 함께 고쳐야 합니다.

- 제2조 — 저장함 항목을 자동 수집 목록에 넣고, 브라우저에만 둔다는 문단을 지운다
- 제3조 — 보유 기간과 근거를 추가한다
- 제8조 — 삭제 요구 방법을 저장함 화면에서 직접 지우는 방법과 함께 적는다
- 사람을 구분해 저장하려면 식별자가 생긴다. 그 식별자를 제2조에 적고, 제10조 안전성 확보 조치를
  다시 쓴다
- Play Console 데이터 보안 설문의 수집 항목을 다시 제출한다
- `operator.ts` 의 최종 개정일을 올리고 제13조 개정 이력에 한 줄 넣는다. 시행 7일 전에 공지한다

### Play Console 데이터 보안 설문

현재 코드 기준 답변입니다. 위 항목이 바뀌면 이 표와 설문을 함께 고칩니다.

| 질문                                           | 답변                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| 데이터를 수집하거나 공유하는가                 | 예                                                                              |
| 앱 활동 — 앱 내 검색어                         | 수집함. 분석 목적. 필수 아님                                                    |
| 앱 활동 — 기타 사용자 생성 콘텐츠(공유 텍스트) | 수집함. 앱 기능 목적                                                            |
| 앱 정보 및 성능 — 비정상 종료 로그, 진단       | 수집함. 분석 목적                                                               |
| 기기 또는 기타 ID                              | 수집함. 분석 목적                                                               |
| 위치                                           | 수집 안 함. IP 로 추정한 국가·도시는 PostHog 가 저장하므로 대략적 위치로 답한다 |
| 개인 정보(이름, 이메일, 주소)                  | 수집 안 함                                                                      |
| 금융 정보                                      | 수집 안 함                                                                      |
| 전송 중 데이터 암호화                          | 예(HTTPS)                                                                       |
| 데이터 삭제 요청 방법 제공                     | 예. `/privacy` 에 적은 이메일                                                   |

### 거부 방법

처리방침 제9조는 브라우저 쿠키 차단과 추적 안 함 설정을 거부 방법으로 안내합니다. 카카오·토스를
비롯한 국내 서비스와 2025.4 작성지침이 잡는 기준이 이 형태이고, 별도 거부 수단은 맞춤형 광고를 할
때 둡니다. Poudy 는 맞춤형 광고를 하지 않아 서비스 안에 수집 거부 토글을 두지 않습니다.

다만 `/ingest` 프록시가 추적 차단기를 우회하므로, 안내가 빈말이 되지 않도록 `track.ts` 에서
`respect_dnt` 를 켜 브라우저가 보낸 거부 신호를 직접 지킵니다. 프록시를 유지하는 한 이 설정도
함께 유지해야 합니다.

맞춤형 광고를 시작하면 이 판단이 바뀝니다. 그때는 거부 수단을 따로 만들고 제9조를 다시 씁니다.

### 후속 과제

- PostHog 프로젝트의 이벤트 보관 기간을 1년, 세션 녹화 보관 기간을 30일 이내로 맞춘다.
  처리방침 제3조가 이 값을 적고 있다
- nginx 접속 로그 보관 주기를 3개월 이내로 맞춘다
- 세션 녹화에서 검색창 마스킹이 풀려 있어 이용자가 친 검색어가 녹화에 남는다. 국내 서비스에서
  흔한 형태가 아니라 거부 수단 없이 두기에는 침해 정도가 크다. 마스킹을 되돌릴지 정한다
- 공유 텍스트를 쿼리 스트링으로 보내고 있어 접속 로그에 본문이 남는다. 본문으로 옮기는 편이 낫다
