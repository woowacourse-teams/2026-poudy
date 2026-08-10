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

## 실행

```bash
pnpm dev
```

개발 서버가 실행되면 [http://localhost:3000](http://localhost:3000)에서 확인합니다.

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

`common/api.d.ts`는 Server의 OpenAPI 문서에서 생성합니다. Client에서 API 타입이 필요할 때 생성된 타입을 그대로 import합니다.

API 타입 생성 방법은 [Server README](../server/README.md#api-타입-생성)를 참고하세요.

## 디렉터리 구조

| 경로     | 내용                         |
| -------- | ---------------------------- |
| `app`    | App Router 페이지와 레이아웃 |
| `public` | 정적 파일                    |

## 배포용 실행

먼저 production build를 생성한 뒤 서버를 실행합니다.

```bash
pnpm build
pnpm start
```
