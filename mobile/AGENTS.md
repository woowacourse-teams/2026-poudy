# Mobile 코드 규칙

구조와 경계는 `ARCHITECTURE.md` 에 있다.

- 컴포넌트 본문은 `useRef`, `useState`, 다른 훅, 핸들러 함수 순서로 선언한다. 모듈 상수는 컴포넌트 밖에 둔다.
- 코드만으로 알 수 없는 구현 근거는 코드 주석이 아니라 `docs/TECHNICAL_DECISIONS.md`에 기록한다.
