/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BrandNotFound from "@/app/brands/[brandId]/not-found";
import CategoryNotFound from "@/app/categories/[categoryId]/not-found";
import { markPop, markPush } from "@/lib/navigation/history-depth";

const back = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
}));

/* 테스트에는 앱 라우터가 없다. 기록을 바꿔 끼우는 링크인지 보도록 replace 를 앵커의 data 속성으로 옮긴다. */
vi.mock("next/link", () => ({
  default: ({ replace: swap, ...props }: ComponentProps<"a"> & { readonly replace?: boolean }) => (
    <a {...props} data-replace={swap ? "" : undefined} />
  ),
}));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  [1, 2, 3, 4, 5].forEach(() => markPop());
});

const topBar = () => within(screen.getByRole("banner"));

describe.each([
  { screenName: "없는 카테고리(S51g)", Page: CategoryNotFound, href: "/categories", label: "카테고리 전체" },
  { screenName: "없는 브랜드(S51f)", Page: BrandNotFound, href: "/brands", label: "브랜드 전체" },
])("$screenName 상단 바 뒤로 가기", ({ Page, href, label }) => {
  it("사이트 안에서 옮겨 온 뒤에는 이전 화면으로 돌아간다", async () => {
    markPush();
    render(<Page />);

    await userEvent.click(topBar().getByRole("button", { name: "이전 화면" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("주소로 바로 들어오면 정상 화면과 같은 디렉터리로 바꿔 끼우는 링크가 된다", () => {
    render(<Page />);

    const link = topBar().getByRole("link", { name: label });
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("data-replace");
  });
});
