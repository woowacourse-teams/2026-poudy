# 제품 조회수 책임 정리

## 변경 범위

- 컨트롤러 의존 객체는 `productViewService`, 증가 메서드는 `increaseViewCount`로 명명한다.
- `ProductViews`는 날짜를 받아 증가하고 기간별로 합산한다. 시계, 잠금과 저장 변경 번호를 제거한다.
- Service가 한국 시간 날짜를 결정한다.
- 메모리 Repository가 집계 객체를 소유하고 동시 접근, 복사와 저장 변경 번호를 관리한다.
- Writer는 주기 및 종료 시 저장 호출과 실패 로그를 담당한다.
- `ProductViewSnapshot`을 제거하고 합산은 `ProductViews`로 옮긴다.
- HTTP 경로, 응답과 JSON 파일 형식을 유지한다. OpenAPI operationId는 증가 메서드 이름에 맞춘다.

## 검증

- 기존 API, 파일 복원과 종료 테스트를 유지한다.
- 날짜 경계는 Service, 동시 증가와 저장 중 추가 조회는 Repository에서 검증한다.
- 도메인은 기간 합산과 입력 및 복사본의 독립성을 검증한다.
- 관련 테스트와 `sh ./scripts/verify.sh`를 통과시킨다.

## 완료 결과

- 2026-09-13 `sh ./scripts/verify.sh` 통과. 전체 717개 테스트, 실패·오류·건너뜀 0.
- `ProductViews`의 시계와 변경 번호를 제거하고 잠금은 Repository로 옮겼다.
- `ProductViewSnapshot`의 합산을 `ProductViews`로 옮기고 Snapshot 클래스를 제거했다.
- `dailyCounts()`는 파일 직렬화 경계에서만 사용하는 불변 복사본 접근자로 유지했다.
- 증가, 조회와 저장은 각각 독립된 복사본으로 검증했다. 기존 HTTP 응답과 파일 형식을 유지했다.
- `049bd80`: 명칭 수정과 API 생성물 갱신
- `1b76156`: 도메인과 저장소 책임 분리 및 테스트 이동
