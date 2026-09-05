# Poudy Backend

## Start here

- Architecture: `ARCHITECTURE.md`
- Product context: `docs/product/overview.md`
- Active plans: `docs/exec-plans/active/`

## Commands

`server/`에서 실행한다.

```bash
sh ./scripts/test.sh
sh ./scripts/verify.sh
```

`verify.sh`는 OpenAPI와 TypeScript 생성물을 재생성해 드리프트가 없는지 확인한 뒤 전체
빌드를 실행한다. 생성물이 낡았다면 갱신본을 남기고 실패하므로 생성물을 확인한 뒤 다시
실행한다.

## Rules

- `server/` 밖은 수정하지 않는다. 단, `./gradlew generateApiArtifacts`가 갱신하는
  `common/api.zod.ts`와 `common/api.zod.types.d.ts`는 서버가 소유하는 생성물이므로 예외로 한다.
- 변경 전에 관련 문서와 기존 구현을 확인한다.
- 동작을 바꾸면 테스트를 추가한다.
- 완료 전에 `sh ./scripts/verify.sh`를 통과시킨다.
- 실패한 검증을 우회하거나 약화하지 않는다.
- Excel은 런타임에서 읽지 않는다.

## Planning

작은 변경은 바로 수행한다. 여러 경계에 걸치거나 설계 결정이 필요한 작업만
`docs/exec-plans/active/`에 계획을 작성한다.
