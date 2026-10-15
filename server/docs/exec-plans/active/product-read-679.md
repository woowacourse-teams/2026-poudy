# 상품 읽기 과조회·성분 필터 개선 (#679)

## 근거·범위

실사용 혼합 부하에서 공통 성분 조회의 반환 행 약211만 행을 관측했다. 자동완성과 목록 카드가
상세 로더를 재사용한다. 실제 SQL 대조에서는 빈 제외 검사 생략만 적용하면 포함 조건이 회귀해,
포함 상품 집합 선별을 함께 적용한다. API·facet 의미와 상세 로더는 보존한다.

## 진행

- [x] 변경 전 live 이미지 확인: 467705da. e638b89b 시도는 배포와 겹쳐 대조군에서 제외
- [x] 자동완성 표시 조회(2 SELECT)와 목록 카드(1 batch SELECT) 분리
- [x] 빈 제외 검사 생략·포함 상품 집합 선별
- [x] 회귀·SQL 횟수·전체 verify 검증 (PostgreSQL18, 1,160 tests, 실패0)
- staging 배포·동일 조건 재측정·완료 판정은 [#679 결과 댓글](https://github.com/woowacourse-teams/2026-poudy/issues/679#issuecomment-6184612538)에서 관리한다.

GitHub Server CI [38682905191](https://github.com/woowacourse-teams/2026-poudy/actions/runs/38682905191)도 성공했다.

## 검증·롤백

검색 순위·강조·정렬·facet·다중 구성품·중복 성분 ID·성분군 포함/제외와 상세 응답을 검증한다.
Java 조회문 변경으로 DB 객체·Flyway 변경은 없다. 문제 시 이전 staging 이미지로 복구한다.
실험은 #679의 중단 기준과 공유 DB/운영 API 관찰을 유지한다.
