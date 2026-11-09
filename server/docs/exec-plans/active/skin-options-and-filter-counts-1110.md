# 피부 선택지 통일과 선택한 0개 필터 유지 (#1110, #1078)

## 상태와 결정

- 최신 `origin/dev`의 #1161 구현을 병합한다. 홈·칩·조건 요약의 서버 이름 소비를 유지한다.
- 2026-11-09 합의: `GET /api/skin-options`와 `filterOptions.skinOptions`로 공개 이름을 통일한다.
  이전 `/api/skin-types`와 `filterOptions.skinChoices` 별칭은 두지 않으며 서버·클라이언트를 함께 전환한다.
- `SkinType`은 DRY/OILY/COMBINATION 세 값만 유지한다. 민감성은 요청·프로필의 별도 boolean이다.
  응답 전용 `SkinChoice`만 SENSITIVE를 포함하고 코드와 표시 이름을 소유한다.
- `selectedFilters`를 제거하고 기존 선택 이름을 `filterOptions`에 0개 후보로 유지한다.
  선택 여부는 URL과 편집 초안이 소유하며 `selected`·`available`은 추가하지 않는다.

## 최종 응답 계약

`GET /api/skin-options`는 검색 조건과 무관한 전체 표시 정의이며 개수는 포함하지 않는다.

```json
{
  "items": [
    { "code": "DRY", "name": "건성" },
    { "code": "OILY", "name": "지성" },
    { "code": "COMBINATION", "name": "복합성" },
    { "code": "SENSITIVE", "name": "민감성" }
  ]
}
```

제품 첫 페이지의 `filterOptions`는 양수 후보와 실제로 존재하는 선택의 합집합이다.
선택한 값은 다른 조건으로 후보가 없어져도 이름과 `productCount: 0`을 제공한다.
선택하지 않은 0개 값 전체는 제공하지 않는다. 구조에 필요한 카테고리 부모는 예외다.

| 필드 | 포함 기준 | 개수 계산에서 제외하는 조건 |
| --- | --- | --- |
| `brands` | 기존 브랜드 정보 + productCount. 양수 또는 실제로 존재하는 선택 | brandIds 전체 |
| `categories` | 기존 트리와 개수. 양수·선택·구조에 필요한 부모 | categoryIds 전체 |
| `skinOptions` | code/name/productCount. 양수 또는 선택. 건성·지성·복합성·민감성 순서 | skinType과 sensitiveSkin 모두 |
| `markGroups` | 기존 그룹·옵션·개수. 양수 또는 선택, 빈 그룹 제외 | 자기 마크 그룹만 |

- 필터 후보의 민감성은 별도 nullable 객체 대신 skinOptions의 SENSITIVE 항목이다.
  목록·상세 제품의 sensitiveSkin boolean과 검색 요청 필드는 바꾸지 않는다.
- 피부 그룹 안 OR·다른 그룹 사이 AND, 기존 검색·성분·감각·마크 판정과 집계 SQL은 유지한다.
  피부 타입별 수와 민감성 수는 중복될 수 있으므로 전체 개수로 합산하지 않는다.
- 브랜드 이름순·카테고리 ID순과 마크 순서를 유지한다.
- 선택한 0개 소분류는 부모와 함께 제공한다. 부모는 실제 집계값을 유지하며,
  부모만 선택했다고 제품 없는 자식을 모두 포함하지 않는다.
- 없는 브랜드·카테고리 ID는 생략한다. 400으로 바꾸거나 요청에서 자동 제거하지 않는다.
  같은 그룹의 정상 ID와 섞으면 정상 ID의 결과를 유지한다.
  첫 페이지 응답에도 없는 ID에만 기존 대체 문구와 개별 해제를 유지한다.
- 후속 페이지는 filterOptions 계산·정의 조회·필드를 생략한다. 빈 배열은 첫 페이지 캐시를
  갱신하고 후속 페이지 생략은 보관한 값을 유지한다. 추가 제품 목록 요청은 만들지 않는다.

## 구현 경계

- Repository.Facets는 기존 개수 Map과 요청 선택으로 후보를 조립한다. 추가 SQL은 없다.
- 브랜드는 BrandProductCount, 피부는 순수 조회 결과 SkinOptionProductCount를 사용한다.
  목록 전용 DTO에만 개수를 추가하고 전체 정의·카드·상세 공용 DTO는 유지한다.
- 이름은 SkinChoice에서만 정의하고 전체 정의와 조건별 목록 응답이 함께 사용한다.
- OpenAPI와 common/api.zod 생성물은 Gradle로 재생성하며 직접 편집하지 않는다.
- 클라이언트 홈 API·useSkinNames·후보 목록·목·캐시·계약 테스트를 함께 전환한다.
  선택한 0개 항목의 이름 표시·해제와 없는 ID의 대체 처리를 검증한다.
- Nginx 공개 API 캐시 허용 경로와 HTTP/HTTPS 템플릿의 600초 TTL 경로를 함께 전환한다.
- DB/Flyway 변경은 없다. 첫 페이지 5회·후속 페이지 3회·빈 후속 페이지 1회 조회를 유지한다.

## 검증

- 서버 HTTP: 전체 네 정의의 순서·이름·개수 없음, 필수 옵션 개수, 선택한 0개 값·없는 ID,
  카테고리 부모·자식, 피부 그룹 OR와 자기 조건 제외, 후속 페이지 생략, 기존 요청 허용값 유지.
- OpenAPI: 새 경로·skinOptions 필드, 이전 필드 제거, SkinType 세 값과 응답 SkinChoice 네 값 구분.
- 클라이언트: Zod 목 계약·이름 조회·홈·필터·칩·캐시·지연 응답·선택 해제 회귀.
- 최종 병합 코드에서 server/scripts/verify.sh 및 client 전체 check를 실행한다.
- 이전 분리 계약은 서버 2,051개·클라이언트 2,133개 테스트가 통과했으나,
  이 결과를 최종 통합 코드의 검증 결과로 대신하지 않는다. 최종 결과는 아래에 기록한다.

## 최종 검증 결과

- 클라이언트 경로 타입 생성·타입 검사와 실제 로컬 API에 연결한 프로덕션 빌드 통과.
- 선택한 0개 브랜드 이름·해제 회귀와 민감성 선택 해제·적용 회귀 통과.
- 독립 리뷰: No actionable findings, correct, confidence 0.93.
- Nginx 세 설정의 새 경로·600초 TTL 테스트 기대값과 Python 구문 검증 통과.
  Docker가 없어 실제 Nginx 통합 실행은 하지 못했다.
- 전체 서버 verify와 푸시 훅의 client check 결과는 PR의 검증 항목에 기록한다.
  실행 로그는 작업용 issue1110 임시 디렉터리에 보관한다.
