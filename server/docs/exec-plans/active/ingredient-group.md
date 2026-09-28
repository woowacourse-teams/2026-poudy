# 제외 성분군의 성분군 일반화

이슈 #572. `exclude_code`를 성분군으로 일반화하고 제품 상세 주요 성분을 성분군으로 묶는다.

## 결정

- 새 테이블을 만들지 않고 `exclude_code` → `ingredient_group`, `exclude_code_ingredient` →
  `ingredient_group_ingredient`로 이름을 바꾼다. 소속 테이블의 `exclude_code` 컬럼은 `group_code`가 된다.
- 제외 성분군은 서버 `ExcludeCode` enum으로 고정한다. enum 코드가 DB에 없거나 성분이 없으면 기동을
  실패시킨다.
- 주요 성분 묶음은 제외 성분군을 쓰지 않고, 2개 이상일 때만 묶는다. 여러 성분군에 속하면 더 많이
  묶는 성분군, 같으면 코드 순서가 앞선 성분군을 고른다.

## 배포 순서

테이블 이름 변경은 `V3__rename_exclude_code_to_ingredient_group.sql`이 서버 기동 시 적용한다. 배포 중에는
기존 서버도 같은 DB를 읽고, CodeDeploy `validate-database.sh`는 Flyway보다 먼저 옛 테이블 이름을 검사한다.
그래서 V3는 이름을 바꾼 뒤 옛 이름 `exclude_code`, `exclude_code_ingredient`를 새 테이블 위의 뷰로 남긴다.
단순 뷰라 옛 이름으로 적재해도 새 테이블에 들어간다.

옛 이름 뷰는 다음 배포에서 지운다. 그 배포에서 `validate-database.sh`의 필수 테이블을 새 이름으로 바꾸고
`DROP VIEW` 마이그레이션을 추가한다. 적재 스크립트가 옛 이름을 쓰지 않는지도 그 전에 확인한다.

PostgreSQL 18이 자동으로 붙인 NOT NULL 제약 이름(`exclude_code_*_not_null`)은 옛 이름으로 남는다.
빈 DB와 운영 DB 모두 V3를 거치므로 두 스키마는 같고, 동작에도 영향이 없다.

## 남은 일

- [ ] 세라마이드 계열 등 새 성분군의 목록과 소속 성분 적재
- [ ] 스테이징·운영 배포 후 V3 적용 확인
- [ ] 옛 이름 뷰 제거 배포
