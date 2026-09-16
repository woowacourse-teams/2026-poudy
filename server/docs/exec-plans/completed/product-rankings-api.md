# Product rankings API

## Goal

`GET /api/products/rankings`에서 선택한 카테고리의 현재 제품을 한국 날짜 기준 조회수로 정렬해 최대 6개 반환한다.

## Design

- `Products`가 카테고리 후보 선택, 조회수 정렬, 카탈로그 동점 순서와 최대 개수 제한을 소유한다.
- `ProductViewService`가 카탈로그와 메모리 조회수 집계 복사본을 요청당 한 번 조합한다.
- 전용 요청·응답 DTO가 반복 `categoryIds`, 양수 `days`, 공개 제품 필드를 정의한다.
- 저장소의 기존 복사-후-집계 경계를 재사용해 파일 I/O 없이 일관된 조회수 결과를 얻는다.

## Result

- 전체·단일·복수·부모·없는 카테고리를 지원하고 후보 필터링 뒤 최대 6개를 선정한다.
- 조회 기록이 없는 제품을 0회로 포함하고 동점이면 카탈로그 순서를 유지한다.
- `days` 미지정 시 전체 누적, 지정 시 한국 시간 오늘을 포함한 날짜 범위를 사용한다.
- 응답은 조회수를 노출하지 않고 `items[].product`에 랭킹 전용 제품 표현을 담는다.
- OpenAPI와 공통 TypeScript 생성물을 갱신했다.

## Verification

- `sh ./scripts/test.sh`
- `sh ./scripts/verify.sh`
