# 새 기능 분석

저장 전환을 성과 지표로 쓰지 않는다. 루틴 생성·구성·가져오기, 유사템 결과에서의 제품 탐색,
유튜버 콘텐츠에서의 제품 탐색·재생 요청, 마크 필터의 적용과 미리보기를 측정한다.

기존 `analytics_schema_version=4` 계약을 유지한다. 새 기능의 이동은 `feature_flow_id`로,
실제로 선택한 제품은 제품 ID와 구성품 ID로 연결한다. 표준 링크 주소는 그대로 두며 같은
탭의 이동 문맥만 세션 저장소에 보관한다. 기능 흐름은 1시간, 제품 유입 문맥은 30분 후 만료된다.
사용자가 다른 출처에서 같은 제품을 선택하면 이전 문맥을 교체한다.

화면·결과 이벤트는 성공한 데이터를 표시한 뒤 기록하고, 재렌더링으로 중복 전송하지 않는다.
실패를 결과 0건으로 처리하지 않는다. 생성·가져오기·편집 완료는 API 성공 뒤 기록한다.
루틴 이름·메모·댓글·닉네임·프로필 사진 주소는 이벤트 속성에 넣지 않는다.

루틴은 `routine_create_started` → `routine_created` → 제품이 생긴 `routine_products_updated`로
빈 루틴 생성과 실제 구성을 나눈다. 공개 상세의 `routine_import_started` → `routine_imported`는
원본 `source_routine_id`와 새 `routine_id`를 함께 보낸다. 직접 생성과 가져오기는 합치지 않는다.
조회는 `routine_list_viewed`·`routine_viewed`, 참여는 `routine_like_changed`·`routine_comment_submitted`,
공개 전환은 `routine_visibility_changed`로 측정한다. 같은 상태를 다시 저장한 것은 제품 편집으로 세지 않는다.
