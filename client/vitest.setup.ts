import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 테스트마다 렌더링한 DOM 을 지운다. 남겨 두면 다음 테스트의 조회가 여러 개를 찾는다.
afterEach(() => {
  cleanup();
});
