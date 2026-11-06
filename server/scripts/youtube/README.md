# 유튜버 시범 데이터 반입

`prepare_import.py`는 DB에 접속하지 않고 검증된 JSON을 `psql` 트랜잭션으로 만든다.
운영 제품을 생성하거나 이름을 바꾸지 않는다. ID뿐 아니라 현재 DB의 제품명·브랜드명까지 대조한다.

```sh
python3 server/scripts/youtube/prepare_import.py /secure/path/transfer.json \
  --expected-database poudy --output /secure/path/import.sql
# 대상 환경의 백업·migration 이력·SQL을 확인한 후 해당 환경에서 실행한다.
psql "$POUDY_DATABASE_URL" -X -f /secure/path/import.sql
python3 -m unittest discover -s server/scripts/youtube -p 'test_*.py'
```

JSON/SQL에는 실제 콘텐츠가 있으므로 Git에 넣지 않는다. 인증정보는 SQL에 넣지 않는다.
예상 DB 이름이 다르거나 제품 대조/제약이 실패하면 전체 적재를 롤백한다.
동일 묶음 재실행은 대상 영상의 매핑과 발언만 교체하며 다른 영상과 관리자 Order를 유지한다.
`visible`은 명시해야 하며, 확인 전 데이터에는 `false`를 사용한다.
API 조회 기간은 최근 1년이다. 오래된 영상도 저장되지만 이 화면의 집계에는 포함되지 않는다.

## 전송 계약: youtube-service-transfer/v1

- `schema_version`: 위 버전 문자열.
- `source_batch_hash`: 근거 원본 파일의 SHA-256 소문자 64자리.
- `channels[]`: `id`, `name`, `metadata_checked_at` 필수.
  `handle`, `subscriber_count`, `profile_image_url`, `banner_image_url`은 nullable.
- `videos[]`: `id`, `channel_id`, `title`, `description`, `duration_ms`, `published_at`,
  `visible`, `metadata_checked_at` 필수. `thumbnail_url`, `view_count`는 nullable.
- `products[]`: 이미 서비스에 있는 `id`, `name`, `brand_name`. 비교 전용이며 생성하지 않는다.
- `video_products[]`: `video_id`, `product_id`, `recommendation`.
  **영상 전체 평가**를 원본에서 확인해 전달한다. 화면에 표시할 구간만 보고 추론하지 않는다.
- `mentions[]`: `video_id`, `ordinal`, `product_id`, `spoken_name`, `start_ms`, `summary`,
  `recommendation` 필수. `end_ms`, `recommendation_condition`은 nullable.
  ordinal은 원본 영상 내 안정된 식별자이며 구간이 늘어나도 기존 번호를 바꾸지 않는다.

평가값: `recommended`, `not_recommended`, `mixed`, `neutral`, `uncertain`.
추천 영상에는 추천 근거가 있어야 하며 혼합·비추천·불확실 구간이 함께 있으면 거절한다.
같은 영상·제품의 반복 구간은 저장하되 추천은 1회만 집계한다.

입력 시간은 타임존이 있는 ISO 8601이다. DB에는 기존 서비스 규칙에 따라 Asia/Seoul의
`timestamp without time zone`으로 변환한다. API는 +09:00 오프셋을 붙여 반환한다.
`recommendation_condition`은 사용자가 읽을 사용 조건만 담는다. 오인식 후보, 추출 모델,
검수 상태 등의 내부 메모는 데이터허브에 남기고 이 필드로 전달하지 않는다.
제품명은 발언명에 덮어쓰지 않는다. 정식명과 이미지는 항상 서비스 카탈로그에서 조회한다.

## 2026-11-05 로컬 검증

운영과 분리된 `poudy_youtube_preview` DB에서 4채널·5영상·13제품·14발언을 확인했다.
동일 SQL 재실행 전후 전체 YouTube 데이터 해시가 같았고, COMMIT 직전 강제 실패를 넣어도
전체 데이터가 원복됐다. 다른 DB 이름으로 만든 SQL은 변경 없이 거절됐다.
로컬 카탈로그는 기존 서비스 공개 응답으로 별도 준비했으며 반입 도구의 기능이 아니다.
운영/스테이징 반입은 아직 수행하지 않았다. 원본 발언의 ±3초 검수가 모두 끝났다는 뜻도 아니다.

## 타임스탬프 한 줄 요약 지침 (2026-11-06)

서비스의 `summary`는 원문 전사가 아니라 타임스탬프 옆에 보여 줄 짧은 요약이다.

- 한 구간에 한 가지 핵심만 담고, 공백 포함 18~24자 안팎을 목표로 한다.
  390px 화면에서 한 줄로 읽히는지 확인한다. 글자 수는 의미를 지우는 강제 상한이 아니다.
- 피부 타입·사용 부위·병행 제품·빈도·자극 주의가 판단을 바꾼다면 요약 안에 남긴다.
  중요한 조건을 숨긴 보조 설명에만 두고 무조건 추천처럼 쓰지 않는다.
- 제품명은 이미지/제품 연결로 알 수 있으므로 불필요하게 반복하지 않는다.
  단, 함께 쓰는 다른 제품을 구별하는 데 필요한 이름은 남긴다.
- '소개하며 설명한다', '말한다', '상대적으로'처럼 핵심을 늘리지 않는 문구를 줄인다.
- 개인 사용감이나 화자의 추천을 임상 효과·치료 효과로 바꾸지 않는다.
  비추천·혼합 평가를 줄이는 과정에서 추천으로 바꾸지 않는다.
- 핵심 조건 때문에 한 줄을 넘기면 2줄을 허용한다. 말줄임표나 CSS 강제 잘라내기로
  조건·부정 표현을 감추지 않는다.
- `recommendation_condition`은 그대로 보관하되 소비자 화면의 작은 추가 설명 줄은 표시하지 않는다.
  추천/정보성 분류는 계속 표시한다. 원래 긴 요약과 수정 내역은 내부 검수 기록에 남긴다.

예시:

- '민감하고 트러블이 올라오던 시기에 오래 사용한 젤형 수분크림으로, 붉은기 진정이 필요할 때 추천한다.'
  → '붉은기 진정이 필요할 때 추천'
- '여름 건성 루틴의 첫 단계로 가벼운 토너를 권하며, 이후 세럼과 크림으로 보습을 보완하라고 설명한다.'
  → '여름 건성 토너, 세럼·크림 병행'
