# webpack-sample

webpack 설정으로 실행하고 빌드하는 React와 TypeScript 구조입니다. 서비스 클라이언트(`client/`)는 Next.js로 운영하므로, 이 디렉터리는 서비스와 별개로 둡니다. `client/`와 `common/`을 묶은 pnpm 워크스페이스에도 포함하지 않았습니다.

2026-08-10에 커밋한 구성(`cbe86ef2`)을 그대로 옮기고, 빌드 직후 산출물을 검증하는 단계를 추가했습니다.

## 실행

```bash
cd webpack-sample
npm ci
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # webpack 빌드 후 산출물 검증
```

## 산출물 검증

`npm run build`는 webpack 빌드가 끝나면 [scripts/verify-dist.js](scripts/verify-dist.js)를 실행합니다. 다음 조건 중 하나라도 어긋나면 빌드가 실패합니다.

1. `index.html`이 참조하는 JS와 CSS 파일이 `dist/`에 있고, 비어 있지 않습니다.
2. 번들에 `sourceMappingURL`이 없습니다. 프로덕션 소스맵은 `hidden-source-map`으로 만듭니다.
3. 번들에 React Refresh와 `webpack-dev-server` 코드가 없습니다.

빌드가 성공해도 산출물이 기대와 다를 수 있습니다. 운영 서버에서는 `sharp` 바이너리가 산출물에서 빠져 이미지 최적화가 오류 없이 멈춘 적이 있습니다. ([#413](https://github.com/woowacourse-teams/2026-poudy/issues/413))

## 구성

| 역할 | 선택 |
| --- | --- |
| TS·TSX 변환 | `swc-loader` |
| 타입 검사 | `tsc --noEmit` (TypeScript 7) |
| CSS | webpack 5.109 네이티브 CSS |
| 이미지·폰트 | Asset Modules |
| 개발 서버 | `webpack-dev-server` 5 + React Refresh |
| 소스맵 | 개발 `eval-source-map`, 프로덕션 `hidden-source-map` |
