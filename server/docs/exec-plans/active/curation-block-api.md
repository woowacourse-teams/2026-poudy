# 큐레이션 공개 조회 계약 변경 (#452)

## 범위와 결정

- 노션에서 시작 전인 공개 목록·상세 API를 구현한다. 관리자 API는 보류한다.
- 공개 조회용 JSON은 목록·상세가 공유하는 제목과 설명을 최상위에 한 번만 담고, 배너 썸네일과 상세 블록을 나눠 담는다.
- 상세 블록은 IMAGE, PRODUCTS, PRODUCTS_BY_FILTER로 나누고 타입별 응답을 분리한다.
- 공개 조회 스냅샷의 블록은 모두 공개 대상으로 간주하며 블록별 게시 상태를 저장하지 않는다.
- PRODUCTS는 제품 ID만, PRODUCTS_BY_FILTER는 필터와 제품별 filterIds를 소유한다.
- curations 배열은 배너 순서, blocks/filters/products 배열은 각 표시 순서다.
  API에 order/position을 추가하지 않는다. 향후 DB에서는 position으로 배열을 복원한다.
- 제품 ID는 저장 시 유지하고 조회 시 현재 Products로 해석한다. 없는 제품과 빈 필터·제품 블록은
  공개 응답에서만 제외한다.
- client/mobile 검색에서 기존 큐레이션 호출부가 없다. 별도 /products API는 제거하고 상세로 통합한다.
  #450/#451 구현은 새 생성 타입을 사용한다.
- JSON은 공개 조회 스냅샷 형식으로 변경한다. 운영 데이터를 직접 바꾸거나 DB·관리자 쓰기 API를
  추가하지 않는다.
- 후속 #496에서 큐레이션 게시 상태와 배너 노출 여부를 분리했다. 상세는 큐레이션 게시 상태로,
  목록은 게시 상태와 배너 노출 여부를 함께 판단한다.

## 구현 및 검증

- [x] 배너·상세·블록 모델과 JSON 읽기 변경
- [x] 공개 조회 모델에서 블록별 게시 상태 제거
- [x] 공개 조회 DTO 및 제품 조회 통합
- [x] 일반 제품과 필터 기준 제품 블록 분리
- [x] fixture, 도메인·저장소·서비스·HTTP 회귀 테스트 변경
- [x] 공개 조회 JSON fixture와 Repository 계약
- [x] OpenAPI와 공통 타입 생성 및 드리프트 검사
- [ ] scripts/verify.sh 전체 통과: 기존 검색어 저장소의 Windows 디렉터리 동기화 오류 7건

## 검증 결과

- 큐레이션 테스트 36개 통과.
- OpenAPI·공통 타입 생성, 생성물 드리프트 검사, Spotless·Checkstyle·아키텍처 검사 통과.
- 전체 검증의 남은 7개 실패는 변경하지 않은 KeywordSnapshotRepository.syncDirectory에서
  Windows 디렉터리를 FileChannel로 열 때 발생한다.
- 사용자 요청에 따라 추가 Linux/Docker 검증은 중단한다. 검색어 저장소 수정이나 테스트 제외는
  이번 이슈에 포함하지 않는다.
