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
| inquiry_image (V35, 기존 feedback_image / product_correction_request_image) | 첨부 ID·부모 FK·표시 순서 | 문의 첨부는 기존 구조/보유기간 유지 |
| user                                              | deleted_at, restore_requested_at      | 기존 컬럼 유지. 회원 행에 최근 복구 정보 저장   |
| notice / notice_image                             | 없음                                  | 공지와 이미지 귀속 신규 저장                 |

`assigned`는 boolean 기본 false다. 실제 담당자 ID/FK·관리자 테이블은 추가하지 않는다.
관리 수정 시각은 접수/상태/담당자 변경을 반영한다. 기존 `updated_at` 유무와 의미를 확인해
`management_updated_at`을 추가했다. 기존 `status_changed_at`은 상태 변경 의미를 유지한다. 미배정 상태로 이관하며 기존 상태/접수일을 보존한다.

## 문의 통합 목록

통합 목록은 세 원본의 UNION 조회다. 통합 큐 테이블에 내용·상태를 복제하지 않는다.

### V37 처리 이력 제거

처리 이력·관리자 메모의 조회·저장과 `admin_inquiry_event` 테이블을 제거한다. 이미 적용된 V27·V30·V34는
변경하지 않고 V37에서 트리거 함수를 교체한 뒤 이력 테이블을 삭제한다. V34에서 이력으로 옮긴 메모도 함께 삭제되며,
메모 테이블은 다시 만들지 않는다.
이력 테이블을 읽거나 메모 이력을 쓰는 구버전 서버와는 함께 운용할 수 없으므로,
배포 시 구버전 서버를 중지하고 새 서버가 V37을 적용하도록 한다.

상태/담당자 변경 트리거는 원본의 최근 수정 시각만 갱신한다. 기존 관리 API에도 적용된다.
상태/담당자 변경은 행 잠금 아래 실제 DB 시각과 직전 관리 시각+1μs 중 큰 값을 사용해 최근 수정 시각의 역전을 막는다.
동일 상태/담당자 변경은 no-op이다. 일괄 처리 잠금은 `(kind,id)` 정렬로 획득한다.

## 회원 복구 상태 (V39)

회원 복구 상태는 `user` 행 하나가 소유한다. 복구·파기 월별 집계는 V38에서 제거하고,
`user_withdrawal_history` 회차 테이블과 기록 트리거·함수는 V39에서 제거한다.

- `deleted_at`, `restore_requested_at`: 현재 탈퇴·복구 요청 시각. 기존 필드를 재사용한다.
- `restored_at`: 최근 복구 완료 시각(TIMESTAMP, nullable).
- `restored_withdrawn_at`, `restored_requested_at`: 최근 복구가 처리한 탈퇴·요청 시각(TIMESTAMP, nullable).
- 복구하면 같은 UPDATE에서 현재 탈퇴·요청 시각을 복구 정보로 옮기고 현재 필드는 null로 비운다.
- 다시 탈퇴하면 이전 복구 정보 세 필드와 현재 복구 요청 시각을 초기화한다. 새 요청이 있어야 다시 복구할 수 있다.
- 활성 회원의 최근 30일 복구 정보만 복구 완료 목록에서 보여 준다. 여러 과거 회차를 누적 보관하지 않는다.
- V39는 기존 이력에서 활성 회원별 가장 최근 완료 회차만 이관한다. 현재 탈퇴 중인 회원은
  현재 탈퇴·요청 시각을 유지하고 과거 복구를 현재 상태로 가져오지 않는다.
- 회원을 파기하면 복구 정보도 같은 행과 함께 삭제된다. 별도 이력 CASCADE나 기록 트리거는 없다.
- 현재 복구 가능 수·7일 이내 삭제 예정 수는 회원 데이터를 조회한다. summary는 `available,expiring`만 반환한다.

복구는 삭제 기한 전인지 확인하고 회원 행 잠금 아래에서 처리한다. 삭제 배치와 복구가 경합하면
한쪽만 상태 변경에 성공해야 한다. 보유기간은 설정값을 재사용한다. 실제 복구 UPDATE가 복구 정보의
저장 책임도 함께 가지며 도메인·외부 응답 계약에 저장 필드를 불필요하게 노출하지 않는다.

V28·V38은 이미 적용됐을 수 있으므로 변경하지 않는다. 구버전 서버를 종료한 뒤 V39를 적용하며,
이력 테이블을 참조하는 구버전 서버로 그대로 롤백할 수 없다.

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

- 추가한 버전: V27 문의 관리·메모/이력 트리거, V28 탈퇴 회차·월별 통계 트리거, V29 공지·이미지, V30 문의 이력 시각 보정, V37 문의 처리 이력 제거, V38 회원 복구·파기 월별 집계 제거, V39 회원 행으로 복구 정보 이관.
  병합 전에 dev의 최신 버전과 번호 충돌을 다시 확인한다.
- 상태 제약 변경은 기존 4개 상태를 모두 허용한 채 REVIEW_PLANNED를 추가한다.
- 기존 DB에서 새 스키마로 이관, 빈 DB 생성, FK/CHECK 위반, 원본 삭제 CASCADE를 PostgreSQL에서 검증한다.
- 구버전 서버는 새 enum을 읽지 못하므로 확장 스키마 배포만으로 완전 호환된다고 보지 않는다.
  기존 서버가 모두 교체된 뒤 새 상태 쓰기를 활성화한다. 새 상태가 저장된 뒤 구버전 롤백은
  데이터 변환 또는 호환 버전 배포가 필요함을 PR/배포 절차에 명시한다.
- ERD Cloud에는 실제 최종 Flyway SQL과 FK/인덱스/삭제 규칙을 기준으로 옮긴다.
  이 초안을 그대로 최종 스키마라고 복사하지 않는다.

트리거는 기존 API를 통한 변경도 같은 트랜잭션에 기록하기 위한 구현 선택이다.
V37부터 status/assigned가 실제로 달라졌을 때 원본 수정 시각만 갱신한다.
V39부터 탈퇴·요청·복구 정보는 회원 행에만 저장하고, 파기 시 같은 행과 함께 지운다. 월별 합계와 과거 회차 테이블은 남기지 않는다.
