# Mobile 코드 규칙

- React 컴포넌트는 `export default function ComponentName()` 형태로 작성한다.
- 하나의 파일에는 하나의 React 컴포넌트만 작성한다.
- 컴포넌트를 제외한 함수와 훅은 화살표 함수로 작성한다.
- 객체 형태는 `interface`로 선언한다.
- `type`은 union 또는 단순 값 별칭처럼 `interface`로 표현할 수 없는 경우에만 사용한다.
