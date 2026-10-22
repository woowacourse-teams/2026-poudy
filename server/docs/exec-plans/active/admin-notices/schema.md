# 데이터 구현 기준 / ERD 이관용 임시 기록

상태: V27·V28·V29 구현과 PostgreSQL 검증 완료. 외부 ERD Cloud는 아직 수정하지 않았다.
최종 원천은 `server/src/main/resources/db/migration/`과 각 기능의 JDBC Repository다.
기존 마이그레이션은 수정하지 않고 세 버전을 추가했다.

## 기존 데이터와 추가 범위

| 자원                                              | 현재                                  | 추가/변경                                    |
| ------------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| feedback                                          | 서비스 의견, 유형·경로·상태·접수 시각 | REVIEW_PLANNED 허용, assigned·관리 수정 시각 |
| product_correction_request                        | 제품 FK·정정 내용·상태·접수 시각      | 같은 관리 필드와 상태                        |
| product_request                                   | 제품명·브랜드명·상태·접수 시각        | 같은 관리 필드와 상태                        |
| feedback_image / product_correction_request_image | 첨부 ID·부모 FK·표시 순서             | 문의 첨부는 기존 구조/보유기간 유지          |
| user                                              | deleted_at, restore_requested_at      | 기존 컬럼 유지. 복구 회차·집계 기록만 추가   |
| notice / notice_image                             | 없음                                  | 공지와 이미지 귀속 신규 저장                 |

`assigned`는 boolean 기본 false다. 실제 담당자 ID/FK·관리자 테이블은 추가하지 않는다.
관리 수정 시각은 접수/상태/담당자/메모 변경을 반영한다. 기존 `updated_at` 유무와 의미를 확인해
`management_updated_at`을 추가했다. 기존 `status_changed_at`은 상태 변경 의미를 유지한다. 미배정 상태로 이관하며 기존 상태/접수일을 보존한다.

## 문의 메모와 이력

통합 목록은 세 원본의 UNION 조회다. 통합 큐 테이블에 내용·상태를 복제하지 않는다.
메모·이력은 각각 한 테이블에 두되 참조 무결성 없는 `(kind,id)`만 저장하지 않는다.

### admin_inquiry_memo (V34에서 삭제)

V27에서는 메모를 별도 테이블에 두고 처리 이력이 `memo_id`로 참조했다. 메모를 추가할 때마다
`MEMO_ADDED` 이력도 함께 남겨 같은 메모가 두 테이블에 나뉘었으므로, V34에서 메모 내용을 처리 이력의
`memo` 열로 옮기고 이 테이블을 삭제했다(#917). 메모 목록은 `MEMO_ADDED` 이력만 골라 오래된 순으로 읽는다.

### admin_inquiry_event

- id: UUID PK; 위와 같은 세 FK·CHECK·삭제 규칙
- event_type: STATUS_CHANGED / ASSIGNEE_CHANGED / MEMO_ADDED
- 이전/이후 상태, 이전/이후 assigned: 이벤트 유형에 맞는 nullable 필드
- memo: 메모 내용 varchar(2000). `MEMO_ADDED`일 때만 채우고 공백만 있는 값은 거절한다(V34)
- actor 컬럼 없음(서버 상수), occurred_at: 시각
- 부모별 `(부모 FK, occurred_at, id)` 인덱스
- 접수 이벤트는 기존 created_at에서 표시할 수 있다. 존재하지 않는 과거 상태/분류 변경을 역산해 만들지 않는다.

메모·원본 관리 수정 시각·이력은 한 트랜잭션에서 기록한다. 원본 상태 변경도 동일하다.
기존 관리 API와 새 관리 API가 서로 다른 기록 경로를 사용하지 않게 한다. 동시에 수정할 때 원본 행을
잠그고 실제 이전 값으로 이력을 남긴다. 일괄 처리 잠금은 `(kind,id)` 정렬로 획득해 교착 위험을 줄인다.
원본에 이미 있는 보유기간 삭제가 메모·이력도 함께 지우도록 CASCADE를 적용한다.
기능 사이 의존은 서비스에서 조합하며 Domain·Repository의 순환 의존을 만들지 않는다.

### V30 이력 시각 보정

트랜잭션 시작 시각인 `now()`는 늦게 실행된 변경을 이전 시각으로 기록할 수 있다.
V30는 기존 트리거 함수만 교체하고 테이블·기존 마이그레이션을 바꾸지 않는다.
상태/담당 변경과 메모는 행 잠금 아래 실제 DB 시각과 직전 관리 시각+1μs 중 큰 값을 사용한다.
따라서 이력의 변경 순서와 최근 수정 시각이 역전되지 않는다. 메모·메모 이력은 같은 시각을 공유한다.
기존 도메인이 전달하는 `status_changed_at` 계약은 유지한다.

## 회원 복구 회차와 운영 집계

현재 복구는 `user.deleted_at`, `restore_requested_at`를 null로 덮어써 과거 요청·복구 이력이 남지 않는다.
파기하면 회원 행이 없어지므로 현재 테이블 count만으로 이달 영구 삭제 수를 계산할 수 없다.

### user_withdrawal_history

- id: UUID PK
- user_id: user FK, ON DELETE CASCADE
- withdrawn_at: 해당 탈퇴 시각
- requested_at: nullable, 해당 회차의 기존 복구 요청 시각
- restored_at: nullable, 실제 복구 시각
- restored_by 컬럼 없음. 개별 관리자 계정을 두지 않으므로 별도 저장하지 않음
- UNIQUE(user_id, withdrawn_at), 회원별 시각 인덱스
- 이메일·피부 정보·선반 내용은 복사하지 않는다. 모달 개수는 현재 보존 중인 실제 테이블에서 읽는다.

현재 탈퇴 회원의 deleted_at/requested_at은 마이그레이션에서 실제 값으로만 이관한다.
이전 복구일은 알 수 없으므로 만들어 넣지 않는다. 탈퇴·요청·복구 시 같은 회차를 원자적으로 갱신한다.
반복 탈퇴는 새 회차로 생성하며 과거 요청 시각을 새 탈퇴에 연결하지 않는다.
복구 완료 행은 최근 30일 이력에서 조회하되 현재 탈퇴 회차와 혼동하지 않는다.

### user_retention_monthly_stat

- month: 서울 기준 월 첫날 DATE PK
- admin_restore_count: bigint >= 0
- purged_count: bigint >= 0
- tracking_started_at: TIMESTAMP, 최초 마이그레이션 시각을 min 집계해 API에서 제공

복구 성공과 복구 카운트 증가를 같은 DB 트랜잭션으로 처리한다. 파기는 실제 삭제한 행 수로만
집계를 늘리고 삭제와 집계 갱신을 한 트랜잭션으로 처리한다. 재시도·여러 서버 실행에 중복 집계하지 않는다.
통계에는 userId·이메일을 남기지 않아 회원 파기를 지연하거나 개인정보를 재보관하지 않는다.
월별 통계만으로는 복구 완료 목록을 만들 수 없으므로 회차 이력과 역할을 나눈다.

복구는 삭제 기한 전인지 조건을 확인하고 회원 행 잠금 아래에서 처리한다. 삭제 배치와 복구가 경합하면
한쪽만 상태 변경에 성공해야 한다. 현재 보유기간을 고정 30일로 SQL에 복사하지 않고 설정값으로 계산한다.

## 공지

### notice

- id: UUID PK
- title: varchar(40), 공백 제외 필수
- content: varchar(2000), 공백 제외 필수
- status: varchar, PRIVATE / PUBLISHED CHECK, 기본 PRIVATE
- banner_enabled: boolean, 기본 false
- banner_text: varchar(24), nullable. banner_enabled이면 공백 제외 필수 CHECK
- first_published_at: nullable TIMESTAMP. PUBLISHED이면 non-null CHECK
- view_count: bigint >= 0, 기본 0
- created_at / updated_at: TIMESTAMP
- 작성자는 `관리자` 상수로 반환한다. 개별 작성자 FK·이름 저장은 추가하지 않는다.
- `(status, first_published_at DESC, id DESC)` 인덱스와 공개·띠 활성 부분 인덱스를 조회 계획에 맞춰 검토한다.

공개 전환에서 최초 공개일이 없을 때만 설정한다. 비공개 전환 시 지우지 않는다.
조회수는 `status='PUBLISHED'` 조건부 원자 증가로 lost update를 막는다. 내용 수정에서 조회수를
이전 DTO 값으로 덮어쓰지 않는다. 공지 삭제는 PRIVATE 조건으로 수행해 공개 전환 경합을 막는다.

### notice_image

- image_id: UUID PK, 한 공지에만 귀속
- notice_id: nullable notice FK ON DELETE SET NULL. null이면 pending/고아 이미지
- display_order: nullable, 0~4 CHECK, UNIQUE(notice_id, display_order) DEFERRABLE INITIALLY DEFERRED
- object_key: varchar(1000) UNIQUE, content_type: varchar(30), 둘 다 필수
- expires_at / created_at: TIMESTAMP 필수. pending 기본 보관 24시간
- notice_id가 null인 expires_at 부분 인덱스

기존 이미지 처리기·검증 규격을 재사용한다. 공지는 별도 private 버킷과 notice 전용 prefix를 쓴다.
객체 키는 업로드 뒤 바꾸지 않는다. DB pending 기록을 먼저 커밋한 뒤 S3에 쓴다.
DB 기록 실패 시 S3를 호출하지 않으며, 업로드 실패 시 보상 삭제한다. 보상 삭제도 실패하면
pending 기록을 유지해 24시간 만료 후 기존 정리 작업이 재시도한다. DB 소유권만 원자적으로 연결하므로 복사/outbox는 없다.
서버는 만료되지 않은 pending 또는 자기 공지의 기존 ID만 허용하며 ID 순서로 잠근 뒤 배열 순서대로 연결한다.
이미지 제거/공지 삭제 시 소유권을 해제하고 원래 expires_at이 지난 고아 객체를 매시간 최대100건 정리한다.
DB 행은 S3 삭제 성공 후 지우며, SKIP LOCKED로 여러 서버의 정리와 귀속 갱신 충돌을 줄인다.
미설정 버킷은 업로드를 거절한다. 실제 AWS 정리는 staging에서 별도 확인해야 한다.

이미지 영구 경로는 공개 버킷 URL로 노출하지 않는다. 공개 이미지는 공지 공개 상태와 귀속을 검사하는
서버 경로로 제공하고, 비공개는 관리자 전용 경로로만 제공한다. 비공개 전환 후 공개 캐시가 계속
서빙하지 않도록 응답·프록시 캐시 정책도 함께 검사한다.

## 이관과 마이그레이션 검증

- 추가한 버전: V27 문의 관리·메모/이력 트리거, V28 탈퇴 회차·월별 통계 트리거, V29 공지·이미지, V30 문의 이력 시각 보정.
  병합 전에 dev의 최신 버전과 번호 충돌을 다시 확인한다.
- 상태 제약 변경은 기존 4개 상태를 모두 허용한 채 REVIEW_PLANNED를 추가한다.
- 기존 DB에서 새 스키마로 이관, 빈 DB 생성, FK/CHECK 위반, 원본 삭제 CASCADE를 PostgreSQL에서 검증한다.
- 구버전 서버는 새 enum을 읽지 못하므로 확장 스키마 배포만으로 완전 호환된다고 보지 않는다.
  기존 서버가 모두 교체된 뒤 새 상태 쓰기를 활성화한다. 새 상태가 저장된 뒤 구버전 롤백은
  데이터 변환 또는 호환 버전 배포가 필요함을 PR/배포 절차에 명시한다.
- ERD Cloud에는 실제 최종 Flyway SQL과 FK/인덱스/삭제 규칙을 기준으로 옮긴다.
  이 초안을 그대로 최종 스키마라고 복사하지 않는다.

트리거는 기존 API를 통한 변경도 같은 트랜잭션에 기록하기 위한 구현 선택이다.
V27은 status/assigned가 실제로 달라졌을 때만 이력을 남기고, 메모는 서비스 트랜잭션으로 원본 수정 시각·이력을 같이 갱신한다.
V28은 기존 user의 탈퇴/요청/복구/삭제에서 집계를 원자 갱신한다. 회원 파기 후 회차는 CASCADE로 지우고 비식별 월별 합계만 남긴다.
