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

## Rules

- `server/` 밖은 수정하지 않는다.
- 변경 전에 관련 문서와 기존 구현을 확인한다.
- 동작을 바꾸면 테스트를 추가한다.
- 완료 전에 `sh ./scripts/verify.sh`를 통과시킨다.
- 실패한 검증을 우회하거나 약화하지 않는다.
- Excel은 런타임에서 읽지 않는다.
- 하네스 파일을 변경하면 `$audit-backend-harness`로 독립 감사한다.

## Planning

작은 변경은 바로 수행한다. 여러 경계에 걸치거나 설계 결정이 필요한 작업만
`docs/exec-plans/active/`에 계획을 작성한다.
