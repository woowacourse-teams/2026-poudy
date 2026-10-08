<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TypeScript 기준

클라이언트 코드를 작성할 때 다음 기준을 따른다. 대부분은 코드에 이미 자리 잡은 관례를 옮겨 적은 것이며, 항목마다 그렇게 정한 이유를 함께 적는다.

## 타입은 `type`으로 선언한다

`interface`는 전역 `Window`처럼 이미 있는 타입을 확장해야 할 때만 쓴다(`lib/types/app-info.ts`).

- 이유: 선언을 합쳐야 하는 경우가 아니면 두 문법의 차이가 없다. 하나로 통일하면 파일마다 어느 쪽을 썼는지 따지지 않아도 된다. 지금 코드의 타입 선언도 거의 모두 `type`이다.

## `any`를 쓰지 않는다

타입을 모르는 값은 `unknown`으로 받고, 검사해서 타입을 좁힌 뒤에 쓴다.

- 이유: `any`는 그 값에 대한 타입 검사를 모두 끈다. `unknown`은 검사하기 전에는 쓸 수 없게 막아 준다.

## 받은 값은 `readonly`로 선언한다

컴포넌트의 Props와 함수가 받는 데이터는 `readonly`로 선언한다. 도메인 계층(`lib/domain`)은 ESLint의 불변성 규칙이 이를 강제한다.

- 이유: 받은 값을 고치지 않는다는 의도를 타입으로 드러낸다. 여러 화면이 같은 응답 객체를 함께 쓰므로, 한 곳에서 값을 고치면 다른 화면이 예상하지 못한 값을 보게 된다.

## API 타입은 직접 정의하지 않는다

API의 요청과 응답 타입은 서버 OpenAPI 문서에서 생성한 `@poudy/api/api.zod`에서 가져온다. 생성 파일(`common/api.zod.ts`)은 손으로 고치지 않는다. 계약이 바뀌면 서버에서 다시 생성한다.

- 이유: 백엔드 DTO와 같은 모양의 타입을 프론트엔드가 따로 만들면, 계약이 바뀔 때마다 두 곳을 함께 고쳐야 하고 한 곳을 놓치면 불일치가 생긴다.

## 외부에서 들어오는 값은 경계에서 런타임에 검증한다

타입은 빌드가 끝나면 사라진다. 그래서 외부에서 들어오는 값은 타입이 맞다고 가정하지 않고, 값이 들어오는 경계에서 검증한다.

| 들어오는 값       | 검증하는 곳                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| API 응답          | `apiGet`, `apiPostForm`에 응답 타입과 같은 이름의 Zod 스키마를 넘긴다. 예: `apiGet("/api/brands", BrandOverviewResponse)` |
| `localStorage` 값 | `createLocalStore`의 `isValid` 타입 가드로 검증하고, 통과하지 못하면 버린다.                                              |

- API 응답이 스키마와 맞지 않으면, production이 아닌 환경에서는 `ApiError`(`INVALID_RESPONSE`)로 실패한다. production에서는 받은 값을 그대로 쓰고, 어긋난 필드만 로그와 `error_occurred`로 남긴다. staging에서 먼저 불일치를 드러내되, 사용자 화면은 막지 않기 위해서다.
- 우리 코드 안에서 만들어 넘기는 값은 런타임에 다시 검증하지 않는다. 컴파일 타임의 타입 검사로 충분하다.
- 외부 값에 `as`로 타입을 붙이는 것으로 검증을 대신하지 않는다.

## 기준을 확인하는 곳

- `tsconfig.json`의 `strict: true`
- ESLint(`eslint-config-next/typescript`, 도메인 계층의 불변성 규칙)
- `dev`로 가는 PR마다 실행되는 Client CI의 `tsc --noEmit`과 ESLint
