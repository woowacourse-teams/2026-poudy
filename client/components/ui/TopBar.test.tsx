/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TopBar } from "./TopBar";

import { markPop, markPush } from "@/lib/navigation/history-depth";

const back = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
}));

const setReferrer = (value: string) => {
  Object.defineProperty(document, "referrer", { configurable: true, value });
};

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  setReferrer("");
  [1, 2, 3, 4, 5].forEach(() => markPop());
});

describe("TopBar 뒤로 가기", () => {
  it("사이트 안에서 옮겨 온 뒤에는 이전 화면으로 돌아간다", async () => {
    markPush();
    render(<TopBar title="제품 상세" variant="sub" />);

    await userEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("메신저나 검색에서 바로 들어오면 메인으로 간다", async () => {
    render(<TopBar title="제품 상세" variant="sub" />);

    await userEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(replace).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });
});

describe("TopBar 제목", () => {
  it("로고가 첫 글자를 대신해도 제목 전체를 Poudy로 읽는다", () => {
    render(<TopBar title="oudy" variant="root" showLogo />);

    expect(screen.getByRole("heading", { name: "Poudy" })).toBeInTheDocument();
  });

  it("로고 영역을 선택하거나 이미지로 끌 수 없다", () => {
    const { container } = render(<TopBar title="oudy" variant="root" showLogo />);

    expect(screen.getByRole("heading", { name: "Poudy" })).toHaveClass("cursor-default", "select-none");
    expect(container.querySelector("img")).toHaveAttribute("draggable", "false");
    expect(container.querySelector("img")).toHaveClass("select-none");
  });

  // 성분·브랜드·카테고리는 이름을 그대로 넘긴다. 긴 이름이 좌우 버튼을 밀면 안 된다.
  it.each(["root", "sub"] as const)("%s 형태의 긴 제목은 넘치는 만큼 줄인다", (variant) => {
    render(<TopBar title="사이클로펜타실록세인" variant={variant} />);

    expect(screen.getByRole("heading", { name: "사이클로펜타실록세인" })).toHaveClass("min-w-0", "truncate");
  });
});

describe("TopBar 뒤로 가기 출처", () => {
  it("우리 화면에서 넘어온 문서면 이전 화면으로 돌아간다", async () => {
    setReferrer("http://localhost:3000/categories/11");
    render(<TopBar title="제품 상세" variant="sub" />);

    await userEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(back).toHaveBeenCalledOnce();
  });

  it("다른 사이트에서 넘어온 문서면 메인으로 간다", async () => {
    setReferrer("https://www.google.com/search?q=poudy");
    render(<TopBar title="제품 상세" variant="sub" />);

    await userEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(replace).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });
});
