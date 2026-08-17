# Backend Product Context

## Status

첨부된 서비스 기획에서 백엔드 작업에 필요한 현재 맥락만 보존한다. 구현된 API 계약은
`ARCHITECTURE.md`, Controller, DTO와 생성된 OpenAPI 문서를 기준으로 한다.

## Service goal

제조사 공식 전성분을 기준으로 포함·제외 조건에 맞는 화장품을 찾고 상세 근거를
확인할 수 있게 한다.

## Known backend rules

- 포함 성분은 모두 있어야 한다.
- 제외 성분이나 선택한 제외 그룹 성분이 하나라도 있으면 제외한다.
- 서로 다른 필터 종류는 AND로 결합한다.
- count와 목록은 같은 판정 규칙을 사용한다.
- 전성분 순서는 함량이나 효능을 뜻하지 않는다.
- 제품 유수분 레벨은 [관능평가 프로토콜](sensory-assessment-protocol.md)에 정의된 도포
  5분 후 사용감이며, 임상 보습 효능과 분리한다.
- 첫 운영 estimator의 계산 범위와 의도적으로 남긴 한계는
  [감각 추론 v0 기준과 한계](sensory-inference-v0.md)를 따른다.
- 원천 제품 JSON에는 완성된 유수분 레벨을 넣지 않는다. 서버가 기동할 때 category와 순서가
  보존된 전성분으로 한 번 계산하며 목록·상세·filter·count가 같은 값을 사용한다.
- `없음`은 등록된 공식 전성분에서 찾지 못했다는 뜻이다.
- 저장 제품과 최근 탐색은 브라우저 상태이며 백엔드 저장 대상이 아니다.

## Data direction

- 첨부 Excel은 DB 구조를 파악하기 위한 참고 자료이며 구현 계약이 아니다.
- 런타임에서는 Excel을 읽지 않고, 오프라인에서 변환한 JSON을 메모리에 적재한다.
- 감각 근거의 원문과 normalized observation은
  [감각 원천 데이터 계약](sensory-source-data-contract.md)에 따라 런타임 classpath와
  저장소 밖에서 수집·검수하고, 서버에는 검증된 파생 참조 데이터만 전달한다.
- 현재 외부 카탈로그의 구조·태그 커버리지와 원천 계약 공백은
  [감각 준비도 보고서](catalog-sensory-readiness-report.md)를 기준으로 한다. 이 보고서에는
  원본이나 제품별 추론값 대신 현재 v0의 전체·category별 레벨과 confidence 집계만 커밋한다.
- 데이터 접근 경계는 이후 DB 저장 방식으로 교체할 수 있어야 한다.

## Deferred decisions

- 실제 catalog 원천 형식과 갱신 책임
- canonical JSON과 공개 ID 형식
- 빠른 제외 그룹과 피부 작용 태그 데이터의 갱신 책임 및 검수 기준
