# 사이트맵 lastmod 자동화

## 범위와 결정

- 사이트맵 URL 마다 `lastmod` 를 싣는다. 값은 데이터가 바뀐 날과 화면 본문이 바뀐 날 중 늦은 쪽이다.
- 데이터 수정 시각
  - 제품: `ProductResponse.updatedAt` (`product.updated_at`).
  - 카테고리·브랜드·게시 큐레이션·제품에 쓰인 성분: 사이트맵 전용 `GET /api/sitemap`.
    카테고리·브랜드·큐레이션은 자기 행과 담긴 제품의 `updated_at` 중 가장 늦은 값이다.
  - 화면 응답(`CategoryResponse` 등)에 넣지 않는다. 집계는 사이트맵 요청에만 필요하고, 제품 수 집계
    도메인을 건드리지 않는다.
- 화면 기준일
  - 클라이언트 `SCREEN_UPDATED_AT` 에 화면 종류별(home, search, category, brand, curation, product,
    ingredient)로 둔다.
  - main 으로 가는 PR 에서 Client Lastmod 워크플로가 화면 파일이 바뀐 화면에 `lastmod:<화면>` 라벨을 붙이고,
    라벨이 있는 화면은 그날로, 없는 화면은 main 의 값으로 맞춰 PR 브랜치에 커밋한다. 손으로 고치지 않는다.
    본문이 그대로인 변경으로 붙은 라벨은 사람이 뗀다. 뗀 라벨은 다시 붙이지 않는다.
  - `GITHUB_TOKEN` 으로 올린 커밋의 PR 실행은 승인을 기다리며 멈춰 main 필수 체크(`Client checks`, `gate`)가
    비게 된다. 그래서 커밋 뒤 그 실행들을 승인 API 로 푼다. `workflow_dispatch` 로 돌린 실행은 PR 체크로
    세지 않아(v0.15.0 릴리스 PR 에서 확인) 쓰지 않는다.
  - 배포 시각은 쓰지 않는다. 본문이 그대로인 배포까지 날짜가 올라가면 검색 엔진이 lastmod 를 믿지 않는다.
- 사이트맵은 요청마다 만들어지므로(`force-dynamic`) 데이터 수정은 배포 없이 반영된다.

## 한계

- 카테고리·브랜드 목록의 조회수순 정렬 변화는 반영하지 않는다.
- 제품이 카테고리·브랜드·큐레이션에서 빠지면 최댓값이 그대로라 날짜가 오르지 않는다.
- `updated_at` 은 수정 때 자동으로 바뀌지 않는다. 데이터를 넣는 쪽이 바뀐 행만 올려야 한다.
- 라벨을 잊으면 화면이 바뀌어도 날짜가 오르지 않고, 라벨 단 날보다 늦게 머지하면 그만큼 이른 날로 남는다.

## 구현 및 검증

- [x] `ProductResponse.updatedAt` 과 제품 사이트맵 lastmod
- [x] `GET /api/sitemap` 과 SQL 집계 테스트(`SitemapQueryTest`)
- [x] 클라이언트 화면별 기준일과 페이지·성분 사이트맵 lastmod
- [x] `lastmod:<화면>` 라벨 워크플로(로컬 임시 원격으로 커밋·푸시·재실행·잘못된 라벨 확인)
- [ ] 첫 릴리스 PR 에서 워크플로 실제 실행 확인
