# 피부 선택지 이름을 서버 한 곳에서 정한다 (#1110)

## 범위와 결정

- 응답에서만 쓰는 `SkinChoice`(`DRY`, `OILY`, `COMBINATION`, `SENSITIVE`)를 두고 표시 이름은 이 enum만 가진다.
  `SkinType`은 목록 쿼리·회원 프로필·루틴·파우치에서 그대로 쓰며 이름과 `SENSITIVE`를 갖지 않는다.
- `GET /api/skin-types`는 민감성을 포함한 네 선택지를 표시 순서대로 준다. 피부 이름의 유일한 출처다.
- `filterOptions`는 `skinTypes`와 `sensitiveSkin` 대신 `skinChoices` 하나로 피부 후보를 준다.
  후보 계산 범위(피부 타입과 민감성 조건을 함께 제외)는 바꾸지 않는다.
- 피부 선택지는 네 개로 고정되어 있어 `selectedFilters`에 이름을 싣지 않는다. 목록 응답이 없는
  성분 검색 화면의 조건 요약도 같은 이름을 써야 하므로, 이름은 `/api/skin-types`에서만 받는다.
- 쿼리(`skinType`, `sensitiveSkin`)와 후속 페이지 생략 규칙은 유지한다. 서버와 클라이언트를 함께 반영하고
  옛 필드의 별칭은 두지 않는다.
- 클라이언트는 `SKIN_TYPE_NAMES`를 지우고 `useSkinNames`로 이름을 받는다. 피부 조건을 고르지 않았으면
  요청하지 않으며, 이름을 받기 전에는 칩·요약을 개수로, 후보에 없는 선택 태그를 코드로 적는다.
- 회원 프로필의 피부 타입 선택지는 설명 문구와 아이콘을 가진 화면 문구라 범위에서 뺀다.

## 검증

- `/api/skin-types`의 네 선택지 순서와 이름, `filterOptions.skinChoices`의 민감성 포함 여부와 정렬,
  옛 필드 제거, 결과 0개와 후속 페이지 생략을 HTTP 테스트로 확인한다.
- `skinType=SENSITIVE` 쿼리와 프로필 `skinType: SENSITIVE`가 계속 400인지 기존 테스트로 확인한다.
- 생성 타입 재생성 후 서버 `verify.sh`와 클라이언트 `pnpm run check`를 실행한다.

## 결과

- 서버 `sh ./scripts/verify.sh` 통과(OpenAPI·TypeScript 생성물 드리프트, 전체 2,049개 테스트, 스타일, 빌드).
- 클라이언트 `pnpm run check`의 린트(오류 0개), 포맷, 타입 검사, 전체 2,135개 테스트, 프로덕션 빌드 통과.
