import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { clearProductPages } from "./lib/storage/product-pages-cache";
import { clearSuggestionPages } from "./lib/storage/suggestion-pages-cache";
import { server } from "./mocks/server";

// jsdom 에 없다.
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// 테스트도 화면과 같은 목 서버를 쓴다. 핸들러가 한 벌이라 응답이 어긋나지 않는다.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  // 테스트마다 렌더링한 DOM 을 지운다. 남겨 두면 다음 테스트의 조회가 여러 개를 찾는다.
  cleanup();
  // 목록 캐시는 모듈에 있어 파일 안에서 이어진다. 남겨 두면 다음 테스트가 바꿔 둔
  // 목 응답 대신 앞 테스트의 결과를 되살린다.
  clearProductPages();
  clearSuggestionPages();
  // 개별 테스트가 덮어쓴 핸들러를 되돌린다.
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
