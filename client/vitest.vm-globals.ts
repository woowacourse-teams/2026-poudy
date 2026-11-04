// vm 풀은 Node 전역 일부를 넘겨주지 않는다.
import * as webStreams from "node:stream/web";

if (!("TransformStream" in globalThis)) Object.assign(globalThis, webStreams);

// vm 풀의 jsdom performance 에는 탐색 기록 조회가 없다.
if (typeof performance !== "undefined" && typeof performance.getEntriesByType !== "function") {
  Object.defineProperty(performance, "getEntriesByType", { configurable: true, writable: true, value: () => [] });
}
