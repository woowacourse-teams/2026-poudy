import { describe, expect, it } from "vitest";

import { pageOf } from "./AnalyticsProvider";

describe("pageOf", () => {
  /* 경로에서 화면 이름을 정하므로, 새 화면이 빠지면 page_viewed 가 조용히 남지 않는다. */
  it("큐레이션 상세를 화면 이름으로 가른다", () => {
    expect(pageOf("/curations/1")).toBe("curation_detail");
  });

  it("큐레이션 상세 아래의 경로는 큐레이션 상세로 세지 않는다", () => {
    expect(pageOf("/curations/1/opengraph-image")).toBeUndefined();
  });
});
