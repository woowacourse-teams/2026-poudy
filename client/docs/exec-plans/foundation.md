# 클라이언트 기반 설정

> 상위 문서: [MVP 화면 구현 계획](./mvp-screen-plan.md) · PR 2 / `feat/client-foundation`

## Goal

화면을 만들기 전에 필요한 기반을 놓는다. 공유 API 타입 연결, 디자인 토큰, API 목 서버다.

## Decisions

### `common` 은 tsconfig path 로 연결한다

`common/api.zod.ts` 는 OpenAPI 생성 산출물이고 파일 두 개뿐이다. 빌드 스텝도 의존성도 없어서 pnpm workspace 패키지로 만들 이유가 없다. 패키지로 만들면 `package.json` · workspace 등록 · `transpilePackages` 설정이 붙는데 얻는 것이 없다.

```json
// client/tsconfig.json
"paths": {
  "@/*": ["./*"],
  "@poudy/api/*": ["../common/*"]
}
```

`client/` 밖을 참조하므로 `next.config.ts` 에 `outputFileTracingRoot` 를 저장소 루트로 올린다. 그러지 않으면 배포 산출물에서 `common` 이 빠진다.

`api.zod.ts` 에 `@ts-nocheck` 가 걸려 있고 타입을 `.js` 확장자로 import 한다. 번들러가 이를 처리하는지 확인이 필요하다.

나중에 서버가 같은 타입을 쓰거나 `common` 에 로직이 생기면 그때 workspace 패키지로 올린다.

### 디자인 토큰은 Tailwind v4 `@theme` 로 옮긴다

`v1.pen` 의 변수 34 개를 `app/globals.css` 에 넣는다. 주요 값이다.

| 토큰 | 값 | 쓰임 |
| --- | --- | --- |
| `ui-brand` | `#F46A8D` | 강조 |
| `ui-text-primary` | `#202124` | 본문 |
| `ui-text-secondary` | `#72747A` | 보조 |
| `ui-border` | `#E8E9EC` | 구분선 |
| `ui-surface` | `#F7F7F8` | 카드 배경 |
| `droplet-moisture` | `#24779D` | 수분 물방울 |
| `droplet-oil` | `#854C2C` | 유분 물방울 |

폰트를 **Geist 에서 Noto Sans KR 로 바꾼다**(`ui-font`). 현재 `layout.tsx` 는 `create-next-app` 기본값인 Geist 라서 그대로 두면 모든 화면이 어긋난다. 수치 표기용 `Geist Mono`(`font-data`)는 유지한다.

`mobile-*` 계열은 `ui-*` 를 가리키는 별칭이다. 별칭까지 옮기지 않고 `ui-*` 만 정의한다.

### MSW 로 시작한다

API 서버 주소와 프록시 여부를 지금 정하지 않아도 화면 작업을 시작할 수 있다.

- **브라우저 worker 와 Node server 를 모두 띄운다.** Next.js 는 서버에서도 fetch 하므로 SSR·ISR 중의 호출은 브라우저 worker 가 잡지 못한다. Node 쪽은 `instrumentation.ts` 에서 `setupServer` 로 띄운다.
- **프로덕션 번들에 넣지 않는다.** `NEXT_PUBLIC_API_MOCKING=enabled` 일 때만 동적 import 한다.
- 핸들러는 GET 11 개를 모두 만든다.

픽스처는 디자인의 실제 값을 쓴다. 화면과 바로 대조된다.

| 제품 | 가격 | 용량 |
| --- | --- | --- |
| 라운드랩 1025 독도 토너 | 18,000원 | 200ml |
| 아누아 어성초 77 수딩 토너 | 25,000원 | 250ml |
| 토리든 다이브인 저분자 히알루론산 토너 | 23,000원 | 300ml |

## Work

- [ ] `tsconfig.json` 에 `@poudy/api/*` path 추가
- [ ] `next.config.ts` 에 `outputFileTracingRoot` 설정
- [ ] `common` import 가 빌드·타입체크를 통과하는지 확인
- [ ] 디자인 토큰 34 개를 `globals.css` 의 `@theme` 로 이식
- [ ] `layout.tsx` 폰트를 Noto Sans KR 로 교체
- [ ] MSW 브라우저 worker 설정
- [ ] MSW Node server 설정(`instrumentation.ts`)
- [ ] 핸들러 11 개와 픽스처 작성
- [ ] `create-next-app` 기본 `page.tsx` 정리

## Verification

- `pnpm run check`(lint · format · typecheck · build)
- MSW 가 브라우저와 서버 컴포넌트 양쪽에서 응답하는지 확인
- 프로덕션 빌드 산출물에 MSW 가 포함되지 않는지 확인
