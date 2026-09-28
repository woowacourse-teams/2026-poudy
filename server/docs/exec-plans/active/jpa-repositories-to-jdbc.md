# JPA Repository JDBC 전환

- 범위: DB 접근에 JPA를 쓰는 브랜드, 카테고리, 검색어 사전, 제품 등록 요청, 큐레이션, 의견 저장소.
- 목표: 해당 Repository에서 Spring Data JPA와 EntityManager 호출을 제거하고 Spring JDBC로 동일한 조회·쓰기 계약을 유지한다.
- 비범위: 이미 JDBC인 저장소.

## 순서

1. 브랜드·카테고리·검색어 사전의 읽기를 JDBC로 전환하고 각 저장소 테스트를 확인한다.
2. 제품 등록 요청의 저장·조회·조건부 상태 변경을 JDBC로 전환한다.
3. 큐레이션의 계층형 블록·필터·제품 순서를 JDBC 결과에서 재구성한다.
4. 의견의 두 유형, 이미지 소유권·잠금·커밋 확인·상태 변경·삭제를 JDBC로 전환한다.
5. JPA 전용 Repository 인터페이스를 제거한다.
6. 도메인의 JPA 매핑·기본 생성자·`@PostLoad`와 매핑 전용 필드를 걷어내고 필드를 생성자에서만 채운다.
7. 테스트의 EntityManager 사용을 없애고 `spring-boot-starter-data-jpa`를 `spring-boot-starter-jdbc`로 바꾼 뒤
   `ArchitectureTest`의 `jakarta.persistence` 예외를 지운다. `sh ./scripts/verify.sh`를 실행한다.

## 유지할 동작

- 공개 API, 도메인 검증, 정렬, 예외 의미와 트랜잭션 경계를 바꾸지 않는다.
- 검색어 사전·큐레이션의 일관된 읽기는 기존 REPEATABLE READ 경계를 유지한다.
- 의견 이미지의 중복 소유 방지와 저장 결과 확인을 유지한다.
