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

`client`와 `common`은 저장소 루트의 pnpm 워크스페이스로 묶여 있습니다. `client`에서 설치해도 워크스페이스 전체가 설치되며, 락파일과 `node_modules`는 저장소 루트에 생깁니다.

## 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다. 이 파일이 없으면 API 목 서버가 켜지지 않아 화면에 데이터가 나오지 않습니다.

```bash
cp .env.example .env.local
```

| 변수                            | 설명                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_MOCKING`       | `enabled`일 때만 MSW 목 서버를 켭니다. 실제 API에 붙일 때는 비웁니다.                 |
| `NEXT_PUBLIC_API_BASE_URL`      | 브라우저 API 주소. 목을 쓰는 동안에는 비워 둡니다.                                    |
| `POUDY_SERVER_API_BASE_URL`     | 서버 컴포넌트·런타임 sitemap 전용 주소. 운영 systemd는 `127.0.0.1:8081`을 주입합니다. |
| `NEXT_PUBLIC_ENVIRONMENT`       | `production`에서만 검색 노출과 Google Analytics를 켭니다.                             |
| `NEXT_PUBLIC_POSTHOG_KEY`       | PostHog 프로젝트 키. 비우면 PostHog 이벤트를 보내지 않습니다.                         |
| `NEXT_PUBLIC_POSTHOG_HOST`      | PostHog 수집 주소. 비우면 같은 출처의 `/ingest` 프록시를 사용합니다.                  |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 웹 데이터 스트림의 `G-` 측정 ID. 비우면 Google 태그를 불러오지 않습니다.          |

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

`check`는 ESLint, Prettier, TypeScript 검사, 테스트와 production build를 순서대로 실행합니다.

Vitest의 `domain` 프로젝트는 순수 함수를 별도 초기화 없이 검사합니다.
HTTP 목을 검증하는 `mock-*` 테스트와 나머지 테스트는 `application` 프로젝트에서 MSW와 캐시 정리를 유지합니다.
React DOM 검사 도구는 jsdom 테스트에서만 불러옵니다.

### PR 검사 범위

- dev 대상 PR에서 `client/`, `design-system/` 바로 아래 Markdown과 `docs/`의 Markdown만 바뀌면 포맷과 로컬 링크 대상을 검사합니다.
- 코드, 설정, 생성 파일, 의존성, CI 스크립트 변경은 전체 검사를 실행합니다. main 대상 PR도 항상 전체 검사합니다.
- `Client checks` 안에서 코드 검사와 문서 검사 결과를 모읍니다. 문서 검사에 추가 러너를 만들지 않습니다. 실패 또는 취소된 검사는 통과시키지 않습니다.
- 문서 링크 검사는 Markdown 링크, 이미지, 참조 링크의 로컬 파일 존재를 확인합니다. 외부 주소, 제목 앵커와 HTML 링크는 검사하지 않습니다.

테스트별 실행 결과는 CI의 `client-ci-results` artifact에 `vitest-report.json`으로 보관합니다.
문서 전용 PR은 Preview 배포와 Lighthouse를 실행하지 않습니다. 검사가 끝나면 PR의
`Client checks` 결과를 확인하고, 실패 시 `Check documentation` 로그에서 원인을 확인합니다.

파일을 수정한 뒤 포맷을 적용할 때는 다음 명령을 실행합니다.

```bash
pnpm run format
```

## Git hook

프로젝트 루트의 Git hook이 Client 변경을 검사합니다.

- `pre-commit`: Client의 staged 파일에 `lint-staged`를 실행합니다.
- `pre-push`: push 대상 커밋에 Client 변경이나 루트의 워크스페이스 설정(`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json`) 변경이 있으면 `pnpm run check`를 실행합니다.

hook을 우회했거나 설치하지 않은 경우에도 push 전에 다음 명령으로 같은 검사를 실행합니다.

```bash
pnpm run check
```

## API 타입

`common/api.zod.ts`는 Server의 OpenAPI 문서에서 생성합니다. Client에서 API 타입이 필요할 때 생성된 타입을 그대로 import합니다.

```ts
import type { ProductResponse } from "@poudy/api/api.zod";
```

`@poudy/api`는 저장소 루트의 `common/`을 워크스페이스 패키지로 등록한 것입니다. `client/package.json`에 `workspace:*`로 선언되어 있어서, 설치하면 `common/`에 연결됩니다.

같은 파일에는 응답 타입과 이름이 같은 Zod 스키마도 들어 있습니다. API를 호출할 때는 이 스키마를 `apiGet`, `apiPostForm`에 넘겨 응답을 런타임에 검증합니다. 기준과 이유는 [AGENTS.md](AGENTS.md)의 「TypeScript 기준」을 참고하세요.

```ts
import { BrandOverviewResponse } from "@poudy/api/api.zod";

apiGet("/api/brands", BrandOverviewResponse);
```

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
- `components/analytics/GoogleAnalyticsTag.tsx` 의 Google Analytics 설정
- 서버로 새로 보내는 값
- 서버가 검색어, 제품 조회처럼 이용 행동을 별도 파일이나 로그에 집계하는 값과 보유 기간

### 회원 정보와 서버 저장함

카카오·Google 소셜 로그인은 제공자와 소셜 계정 식별자, 인증된 이메일을 서버에 저장합니다.
회원 프로필은 성별·나이대·피부 타입이며, 회원 저장함은 회원 번호·제품 번호·저장 시각을 서버에
보관합니다. 최근 검색어와 필터 조건은 브라우저에 남습니다. 로그아웃이나 사이트 데이터 삭제는
서버 저장함 삭제와 다릅니다.

탈퇴하면 세션을 종료하고 회원 기능을 중지합니다. 계정·프로필·저장함은 복구 요청 처리를 위해
30일 보관하고 운영 환경의 `MemberRetentionService`가 매일 한국 시간 03:40에 삭제합니다.
회원 행 삭제 시 저장함도 `ON DELETE CASCADE`로 삭제됩니다. 복구 요청 자체는 보관 기간을
연장하지 않으며, 운영자가 파기 전에 복구를 완료해야 합니다.

수집 항목·보유 기간·탈퇴와 복구 동작을 바꾸면 처리방침 제1조부터 제3조, 제7조부터 제10조와 이용약관 제2조부터 제4조,
Play Console 데이터 보안 설문을 함께 확인합니다. 문서별 시행일은 `operator.ts`, 개정 이력은
각 페이지에서 관리합니다. 개인정보 처리방침 시행일은 2026년 10월 12일이며, 개정 이용약관은
2026년 11월 11일 시행 예정으로 표시합니다. 약관의 7일·30일 사전 안내 기준에 맞춰 이번 개정은
30일의 안내 기간을 확보합니다. 11월 11일은 10월 12일 공개 안내 시작을 전제로 한 날짜이며,
실제 공지가 늦어지면 공지 시작일로부터 최소 30일 뒤로 `operator.ts`의 약관 시행일을 조정해야 합니다.
`/terms`는 `components/legal/CurrentTerms.tsx`의 10월 4일 적용본을 기본으로 보여 주고,
`ScheduledTerms.tsx`의 개정 예정본은 닫힌 `details`에서 펼쳐볼 수 있도록 제공합니다.
10월 4일 적용본은 Git 커밋 `2f3bb50b`의 본문을 보존했으며, 과거 본문의 시행일과 운영자 정보는
현재 설정 변경의 영향을 받지 않도록 고정했습니다. 시행 시 `terms/page.tsx`의 기본 본문을
개정본으로 전환하고 사전 안내와 시행 예정 표기를 실제 시행 상태로 갱신합니다. 이 저장소 변경만으로 공지가 완료된 것으로 보지 않습니다.

2026년 10월 12일 점검에서는 프로필 입력 시 하나 이상 선택하는 화면 조건과 마이페이지의 직접 수정,
위시리스트 명칭, 로그아웃·탈퇴·소셜 연결 해제의 차이를 반영했습니다. 웹 세션(1일 미사용·7일 절대 만료),
앱 세션(60일 미사용), 가입·중복 가입 안내·복구용 임시 세션(10분 미사용), 운영 서버의 세션 파일 보관과
재시작 유예(5분), 마지막 로그인 제공자의 로컬 저장도 실제 구현과 대조했습니다.
DB 백업은 [DB 운영 문서](../deploy/postgresql-ec2.md)의 S3 객체 생성 후 30일 만료 설정을 반영했습니다.
만료 후 실제 삭제는 비동기로 이루어지므로 정확히 30일째 삭제가 완료된다고 안내하지 않습니다.
운영 DB 삭제 후 백업에 남는 기간은 탈퇴 계정 복구를 위한 30일과 별개이며, 백업 보관으로 계정 복구 기간이
연장되지는 않습니다. 서버의 임시 덤프는 업로드 성공 시 삭제되지만 실패하면 남을 수 있고 S3 만료 규칙도
적용되지 않습니다.

2026년 10월 12일 운영자가 전달한 DB EC2 SSM 조회 결과에서도 백업 스크립트는 검사·업로드 성공 뒤에만
임시 덤프를 삭제하며, 실패하면 `set -e`로 종료되는 것을 확인했습니다. 조회 당시 `/var/backups/poudy`에는
파일이 없었습니다. `/etc/cron.daily`, `/etc/tmpfiles.d`, `/etc/systemd/system`에서 `poudy` 또는
`/var/backups`를 검색한 결과 백업 서비스·타이머만 발견됐고, `/etc/cron.d`는 존재하지 않았습니다.
이 확인 범위에서는 실패한 임시 덤프의 자동 삭제 설정을 찾지 못했습니다. 임시 덤프의 삭제 기한과
장애 복원 시 이미 삭제한 개인정보를 다시 제거하는 절차는 별도 운영 조치가 필요하며, 구현된 것으로
처리방침에 기재하지 않았습니다.

이번 점검은 [korean-privacy-terms의 privacy-kr 스킬](https://github.com/kimlawtech/korean-privacy-terms/blob/d8934d79a258e1427f1a6ad0247c100c01f3b3b8/skills/privacy-kr/SKILL.md)의
항목별 기준을 사용했습니다. 한국어 이용약관 템플릿이 비어 있어 기존 약관과 해당 스킬의
`ftc-standard-terms.md`를 대조했고, 무료 정보 서비스에 맞게 결제·배송 조항은 추가하지 않았습니다.
기존 TSX 문서와 디자인을 유지하며 [개인정보위의 2026.4 작성지침 개정 안내](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=&nttId=12021)도 확인했습니다.

### 인기 검색어와 인기 제품 집계

인기 검색어는 상품 검색 결과가 있는 정규화 검색어를 UTC 10분 구간별로 합산합니다. 최근 완결된
7일을 순위에 사용하고 직전 구간과 비교하므로 각 제출 기록은 계산에 최대 7일 20분 사용합니다.
기간을 벗어난 구간은 다음 상태 저장에 성공하면 집계 파일에서 제거됩니다. 모든 제품 검색은 별도
서버 검색 기록에도 남으며, 이 기록은 journald의 14일·200MB 한도 가운데 먼저 도달하는 기준에 따라
오래된 순서로 삭제됩니다.

제품 상세 화면이 표시되면 `ProductViewRecorder`가 제품 번호를 서버로 보냅니다. 서버는 제품 번호,
한국 날짜와 조회 횟수만 집계 파일에 두고 이용자·세션·IP 주소 식별자를 함께 저장하지 않습니다.
새로고침과 재방문은 각각 집계하며, 이 통계는 인기 제품 제공을 위해 서비스 운영 기간 동안 보관하고
서비스가 종료되거나 집계를 폐기할 때 파일을 삭제합니다. 제품 조회 요청의 주소와 IP 주소는 별도의
접속 기록 보유 기준을 따릅니다.

두 집계의 항목이나 기간을 바꿀 때에는 처리방침 제1조부터 제3조, 제7조부터 제9조, 이용약관의 순위
기준과 한계, 아래 Play Console 데이터 보안 표를 함께 고칩니다. 실제 Play Console 설문 변경은 배포
전에 수동으로 제출합니다. 인기 검색어 수집 호출을 클라이언트에 연결할 때에는 변경된 처리방침의
시행일 이후에 배포합니다.

### Google Analytics 운영 설정

`GoogleAnalyticsTag`는 `production` 환경에 측정 ID가 있을 때만 Google 태그를 불러옵니다. 브라우저의
Do Not Track 값이 `1` 또는 `yes`이면 태그 자체를 불러오지 않습니다. 페이지 조회는 GA4 Enhanced
Measurement가 브라우저 방문 기록 변경을 감지해 자동으로 수집합니다. 수동 `page_view`를 함께 보내면
중복되므로 추가하지 않습니다.

`trackGoogleAnalytics`는 유입 채널이 가치 있는 방문을 만들었는지 판단할 핵심 도달점만 GA4에도
전송합니다. 검색어 원문은 URL 매개변수 삭제를 우회해 GA4에 남지 않도록 제외합니다. 사용자의 제품 내
행동을 이어 붙이는 고유한 `discovery_id`도 GA4에는 보내지 않습니다.

| 책임                | Poudy 이벤트       | GA4 이벤트         | GA4 전송 항목                                  |
| ------------------- | ------------------ | ------------------ | ---------------------------------------------- |
| 유효한 검색 완료    | `search_submitted` | `search_submitted` | 검색 방식, 결과·성분 조건 수, 낮은 범주의 경로 |
| 제품 상세 도달      | `product_viewed`   | `view_item`        | 제품 ID·카테고리, 진입 경로                    |
| 제품 보관 가치 행동 | `product_saved`    | `add_to_wishlist`  | 제품 ID, 저장 화면과 상세 진입 경로            |
| 방문·랜딩·유입 문맥 | 해당 없음          | 자동 `page_view`   | 화면 주소·제목·이전 주소, 획득 채널            |

다음 이벤트는 제품 경험을 진단하기 위한 것이므로 PostHog에만 남깁니다.

- 홈 노출과 선택 — `home_section_viewed`, `curation_slide_viewed`, `service_guide_opened`, `home_search_selected`,
  `popular_keyword_used`, `popular_keywords_expanded`, `skin_type_selected`, `ranking_category_changed`,
  `home_product_selected`
- 검색 과정 — `search_started`, `search_used`, `search_results_viewed`, `search_suggestion_selected`
- 목록과 조건 조작 — `product_list_viewed`, `filter_applied`, `filter_reset`, `sort_applied`,
  `product_list_scrolled`, `empty_result_shown`, `filter_conflict_shown`
- 제품 진단 — `product_unsaved`, `ingredient_viewed`, `ingredient_condition_toggled`, `error_occurred`, 세션 녹화
- 상세 탐색 시간 — `detail_active_time_recorded`
- 웹에서 앱 설치 유입 — `app_install_clicked`, `app_install_landed`, `app_store_redirected`

앱 설치 유입은 [웹 → 앱 설치 유입 및 Google Play 이동](https://us.posthog.com/project/562550/insights/gpX6nbg5)에서
최근 30일 횟수를 경로별로 확인합니다. 운영 환경·`poudy.site` 조건과 프로젝트 테스트 계정 제외를 적용합니다.

| 이벤트                 | 의미                          | `source`                                           |
| ---------------------- | ----------------------------- | -------------------------------------------------- |
| `app_install_clicked`  | QR 링크 또는 상단 배너를 누름 | `qr_click`, `install_banner`                       |
| `app_install_landed`   | QR 주소가 브라우저에 도착함   | `qr_scan`, `qr_click`, `unknown`                   |
| `app_store_redirected` | Google Play로 보내기 직전     | `qr_scan`, `qr_click`, `install_banner`, `unknown` |

QR 그림에는 `/open-app?source=qr_scan`, 클릭 링크에는 `/open-app?source=qr_click`을 담습니다.
Android intent는 앱이 없을 때 `/open-app?source=…&store=google_play`를 거친 뒤 스토어로 보냅니다.
그래서 클릭 자체를 스토어 이동으로 세지 않으며, 스토어 fallback에서는 QR 도착을 다시 세지 않습니다.
표시가 없는 기존 QR·직접 방문은 `unknown`으로 남기고 QR 스캔으로 추정하지 않습니다.

이벤트는 외부 이동 전에 비콘으로 전송합니다. 초기 SDK 준비를 최대 1초 기다리되, 로딩 실패나 지연이
이동을 막지는 않습니다. 추적 거부·전송 실패는 집계에서 빠질 수 있습니다. 앱이 이미 설치되어 App Links가
바로 앱을 여는 QR 스캔은 웹 집계에 포함되지 않습니다. 다른 기기로 찍은 QR은 웹 방문자와 같은 사람으로
연결하지 않습니다. 스토어 이동은 Google Play의 로딩 완료나 설치 완료를 뜻하지 않으며 배포 이후부터만 수집합니다.

`detail_active_time_recorded`는 제품 상세와 성분 상세에서 사용자가 실제로 화면을 본 시간을 기록합니다.
탭이 보이고 창에 포커스가 있으며 마지막 입력 후 60초가 지나지 않은 동안에만 시간을 누적합니다.
`$prev_pageview_duration`은 숨은 탭과 자리를 비운 시간까지 포함하므로 활성 체류시간 지표로 쓰지 않습니다.
30초마다, 그리고 탭이 가려지거나 경로가 바뀌거나 화면을 떠날 때 직전 전송 이후에 늘어난 시간만
`active_seconds`로 보냅니다. 따라서 여러 이벤트의 `active_seconds`를 더해도 같은 시간이 두 번 집계되지 않습니다.

큐레이션 캐러셀은 `home_section_viewed.section = curation`으로 실제 섹션 노출을 기록하고,
`curation_slide_viewed`로 가운데 카드가 바뀐 시점과 `transition = manual | autoplay`를 남깁니다.
[큐레이션 노출→수동 넘김 퍼널](https://us.posthog.com/project/562550/insights/7FSy0f6p)은 직접 조작만
집계합니다. 큐레이션 상세 화면이 생기기 전에는 `curation_opened`를 보내지 않습니다.

캐러셀 첫 장의 서비스 가이드는 큐레이션이 아니므로 `curation_slide_viewed`와 `curation_opened`를 보내지
않고, 두 이벤트의 `position`도 가이드를 뺀 큐레이션 목록 안에서 셉니다. 가이드를 누르면
`service_guide_opened`를 남기고, 서비스 소개(`/about`)는 `page_viewed.page = about`으로 집계합니다.

운영 측정 ID를 배포하기 전에 GA4 관리 화면에서 다음 설정을 확인합니다.

- 웹 데이터 스트림의 Enhanced Measurement에서 페이지 조회와 브라우저 방문 기록 기반 페이지 변경을 켭니다.
- 데이터 수정의 데이터 삭제에서 이메일 주소 삭제를 켭니다.
- URL 쿼리 매개변수 삭제 목록에 `keyword`, `q`, `query`, `search`를 추가합니다. 제품 검색어와 이전
  사이트의 검색어가 `page_location`과 `page_referrer`에 남지 않는지 미리보기로 확인합니다.
- 연령대·성별·관심사는 코드에서 직접 수집하거나 이벤트 속성으로 보내지 않습니다. 참고용 집계 보고서가
  필요하면 이용자 동의 절차와 처리방침을 먼저 반영한 뒤 Google Signals를 켭니다. 값은 일부 동의 사용자의
  집계이며 `unknown`과 데이터 임계치가 생길 수 있으므로 전체 방문자의 정확한 구성으로 해석하지 않습니다.
- Google Signals를 켜더라도 광고 개인 최적화와 리마케팅에는 사용하지 않습니다.
- 이벤트 데이터 보관 기간을 14개월 이내로 설정합니다.
- `add_to_wishlist`를 핵심 이벤트로 지정합니다.
- `search_mode`, `entry_point`, `save_source`, `discovery_method`, `origin_surface`를 이벤트 범위 맞춤
  측정기준으로 등록합니다. `discovery_id`는 GA4에 전송하지 않습니다.
- `result_count`를 이벤트 범위 맞춤 측정항목으로 등록합니다.
- DebugView와 실시간 보고서에서 최초 진입과 클라이언트 라우트 이동마다 `page_view`가 한 번씩만 오는지
  확인하고, 검색·제품 조회·저장 이벤트가 각각 한 번씩 오는지 확인합니다.

### Play Console 데이터 보안 설문

현재 코드 기준 답변입니다. 위 항목이 바뀌면 이 표와 설문을 함께 고칩니다.

| 질문                                           | 답변                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| 데이터를 수집하거나 공유하는가                 | 예                                                                               |
| 앱 활동 — 앱 내 검색어                         | 수집함. 분석 목적. 필수 아님                                                     |
| 앱 활동 — 앱 상호작용(제품 상세 조회)          | 수집함. 앱 기능(인기 제품 산정)과 분석 목적. 제품 상세 화면을 열면 자동 전송     |
| 앱 활동 — 기타 사용자 생성 콘텐츠(공유 텍스트) | 수집함. 앱 기능 목적                                                             |
| 앱 정보 및 성능 — 비정상 종료 로그, 진단       | 수집함. 분석 목적                                                                |
| 기기 또는 기타 ID                              | 수집함. 분석 목적                                                                |
| 위치                                           | 수집 안 함. PostHog와 Google Analytics가 IP로 추정한 지역은 대략적 위치로 답한다 |
| 개인 정보 — 이메일, 사용자 ID                  | 수집함. 소셜 가입·회원 관리 목적. 화면 녹화에 표시된 이메일이 포함될 수 있음     |
| 개인 정보 — 성별·나이대, 기타 정보(피부 타입)  | 수집함. 회원 프로필 제공 목적. 스토어 항목 분류는 제출 시 확인                   |
| 금융 정보                                      | 수집 안 함                                                                       |
| 전송 중 데이터 암호화                          | 예(HTTPS)                                                                        |
| 데이터 삭제 요청 방법 제공                     | 예. `/privacy` 에 적은 이메일                                                    |

### 거부 방법

처리방침 제9조는 로그인 쿠키와 분석용 저장소를 구분합니다. 쿠키·사이트 데이터 차단은
식별자 저장을 제한하지만 분석 요청 자체의 중단을 보장하지 않습니다. 분석 수집 중단 방법은
추적 안 함 설정 또는 이메일 처리정지 요청이며, 앱 웹뷰에는 브라우저 설정 화면이 없습니다.

다만 `/ingest` 프록시가 추적 차단기를 우회하므로, 안내가 빈말이 되지 않도록 `track.ts` 에서
`respect_dnt` 를 켜 브라우저가 보낸 거부 신호를 직접 지킵니다. 프록시를 유지하는 한 이 설정도
함께 유지해야 합니다. Google Analytics는 `GoogleAnalyticsTag`가 같은 신호를 확인하고 태그 로드를
막습니다.

추적 안 함 설정은 PostHog와 Google Analytics에만 적용됩니다. 서비스 요청, 접속 기록, 서버 검색
기록과 인기 검색어·제품 조회수 집계는 이 설정으로 중단되지 않습니다. 집계 파일에는 이용자 식별자를
함께 저장하지 않으므로 이미 합산된 특정 이용자의 기여분을 찾아 분리할 수도 없습니다.

맞춤형 광고를 시작하면 이 판단이 바뀝니다. 그때는 거부 수단을 따로 만들고 제9조를 다시 씁니다.

### 후속 과제

- PostHog 프로젝트의 이벤트 보관 기간을 1년, 세션 녹화 보관 기간을 30일 이내로 맞춘다.
  처리방침 제3조가 이 값을 적고 있다
- nginx 접속 로그 보관 주기를 3개월 이내로 맞춘다
- 세션 녹화에서 검색창 마스킹이 풀려 있어 이용자가 친 검색어가 녹화에 남는다. 국내 서비스에서
  흔한 형태가 아니라 거부 수단 없이 두기에는 침해 정도가 크다. 마스킹을 되돌릴지 정한다
- 마이페이지 이메일에는 `data-private` 표시가 없어 PostHog 화면 녹화에 포함될 수 있다.
  개인정보처리방침에는 실제 가능성을 반영했으며, 녹화 마스킹은 별도 구현 과제다
- nginx는 `$uri`를 기록하며 쿼리 문자열·쿠키·인증 헤더는 기록하지 않는다. 이 설정을 유지한다
- 분석과 국외 이전의 적법 근거, 위탁 계약과 실제 서비스 설정은 코드만으로 확인할 수 없다.
  PostHog·Google Analytics에 필요한 별도 동의를 처리방침 열람이나 약관 동의로 갈음하지 않는다.
  국외 이전 근거를 계약 이행으로 적용하려면 실제 필요성 요건을 확인해야 한다
- 성별·나이대·피부 타입 입력을 모두 요구하는 프로필 흐름은 항목별 필요성과 피부 타입의
  민감정보 해당 여부·동의 방식을 검토한다. 처리방침에 적었다는 이유로 별도 동의를 받은 것으로 보지 않는다
