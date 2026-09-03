import type { ProductResponse } from "@poudy/api/api.zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearProductPages,
  readProductPages,
  rememberScrollPosition,
  writeProductPages,
} from "@/lib/storage/product-pages-cache";

const pages = (page: number, ids: readonly number[]) => ({
  page,
  items: ids.map((id) => ({ id }) as ProductResponse),
  brands: [],
  categories: [],
  total: ids.length,
  hasNext: false,
});

describe("제품 목록 캐시", () => {
  beforeEach(() => {
    clearProductPages();
  });

  it("이어 붙인 목록을 장 번호와 함께 그대로 돌려준다", () => {
    writeProductPages("a", pages(2, [1, 2, 3]));

    expect(readProductPages("a")).toMatchObject({ page: 2, total: 3 });
    expect(readProductPages("a")?.items.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("담은 적 없는 조건은 돌려줄 것이 없다", () => {
    expect(readProductPages("없는 조건")).toBeUndefined();
  });

  it("보던 자리는 목록을 다시 담아도 남는다", () => {
    writeProductPages("a", pages(0, [1]));
    rememberScrollPosition("a", () => ({ scrollY: 820, anchor: { id: 3, offset: 52 } }));
    writeProductPages("a", pages(1, [1, 2]));

    expect(readProductPages("a")?.position).toEqual({ scrollY: 820, anchor: { id: 3, offset: 52 } });
  });

  it("되살릴 목록이 없으면 자리를 재지도, 남기지도 않는다", () => {
    const read = vi.fn(() => ({ scrollY: 820 }));

    rememberScrollPosition("a", read);

    expect(read).not.toHaveBeenCalled();
    expect(readProductPages("a")).toBeUndefined();
  });

  it("조건이 다섯을 넘으면 가장 오래 쓰지 않은 것부터 버린다", () => {
    ["a", "b", "c", "d", "e", "f"].forEach((key) => writeProductPages(key, pages(0, [1])));

    expect(readProductPages("a")).toBeUndefined();
    expect(readProductPages("f")).toBeDefined();
  });

  it("다시 읽은 조건은 최근에 쓴 것으로 친다", () => {
    ["a", "b", "c", "d", "e"].forEach((key) => writeProductPages(key, pages(0, [1])));

    readProductPages("a");
    writeProductPages("f", pages(0, [1]));

    expect(readProductPages("a")).toBeDefined();
    expect(readProductPages("b")).toBeUndefined();
  });
});
