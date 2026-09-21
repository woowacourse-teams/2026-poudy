# 큐레이션 게시 상태와 배너 노출 책임 분리 (#496)

## 범위와 결정

- 큐레이션 게시 상태는 `Curation`이 소유하며 공개 상세 조회 가능 여부를 결정한다.
- 배너는 게시 상태 대신 목록 노출 여부와 썸네일을 소유한다.
- 미게시 큐레이션은 배너에 노출할 수 없다.
- 썸네일이 없거나 공백이면 배너에 노출할 수 없다.
- 숨긴 배너는 썸네일이 없어도 허용한다.
- 목록은 게시 중이며 배너에 노출되는 큐레이션만, 상세는 게시 중인 큐레이션만 조회한다.
- 공개 API 요청·응답 스키마는 유지하고 게시 상태와 배너 노출 여부를 응답하지 않는다.
- 저장 JSON은 최상위 `status`, `banner.visible`, nullable `banner.thumbnail_image_url`,
  `detail.blocks`로 구성한다.
- 관리자 API와 client/mobile 변경은 포함하지 않는다.

## 구현 및 검증

- [x] 게시 상태와 교차 불변식을 `Curation`으로 이동
- [x] `CurationBanner`를 노출 여부와 nullable 썸네일 모델로 변경
- [x] `CurationDetail`에서 게시 상태 제거
- [x] 저장 JSON과 Repository 해석 변경
- [x] 도메인·저장소·서비스·HTTP 회귀 테스트 변경
- [x] OpenAPI와 공통 타입 생성 및 드리프트 검사
- [ ] 전체 검증 통과: 기존 검색어 저장소의 Windows 디렉터리 동기화 오류 7건

## 검증 결과

- 큐레이션 테스트 40개 통과.
- OpenAPI·공통 타입 생성, 생성물 드리프트 검사, Spotless·Checkstyle·아키텍처 검사 통과.
- 전체 961개 테스트 중 변경하지 않은 `KeywordSnapshotRepository.syncDirectory`의 Windows
  디렉터리 `FileChannel` 접근에서 발생하는 기존 오류 7개만 실패했다.

## 배포 주의

- 운영 `curations.json`의 `banner.status`, `detail.status`를 제거한다.
- 큐레이션 최상위 `status`에 `PUBLISHED` 또는 `UNPUBLISHED`를 넣고,
  `banner.visible`에 boolean 값을 넣는다.
- `banner.visible`이 `true`인 큐레이션은 게시 중이며 비어 있지 않은
  `banner.thumbnail_image_url`을 가져야 한다.
