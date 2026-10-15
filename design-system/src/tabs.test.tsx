/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TabNav, TabNavItem } from "./tab-nav";
import { Tab, TabList, TabPanel, Tabs } from "./tabs";

function SampleTabs({ variant = "underline" }: { readonly variant?: "underline" | "rail" }) {
  const [value, setValue] = useState("a");
  return (
    <Tabs value={value} onValueChange={setValue} variant={variant}>
      <TabList label="정보">
        <Tab value="a">성분</Tab>
        <Tab value="b">사용 후기</Tab>
        <Tab value="c">유사 제품</Tab>
      </TabList>
      <TabPanel value="a">성분 패널</TabPanel>
      <TabPanel value="b">후기 패널</TabPanel>
      <TabPanel value="c">유사 패널</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("tablist / tab + aria-selected 이고, 고른 탭의 패널만 tabpanel 로 이어 그린다", () => {
    render(<SampleTabs />);
    const tab = screen.getByRole("tab", { name: "성분" });

    expect(screen.getByRole("tablist", { name: "정보" })).toHaveAttribute("aria-orientation", "horizontal");
    expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: "성분" });
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(screen.queryByText("후기 패널")).not.toBeInTheDocument();
  });

  it("Tab 으로는 고른 탭에만 들어가고, ←→ 와 Home/End 로 옮기며 바로 고른다", () => {
    render(<SampleTabs />);
    const first = screen.getByRole("tab", { name: "성분" });

    expect(first).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "사용 후기" })).toHaveAttribute("tabindex", "-1");

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "사용 후기" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "사용 후기" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("후기 패널")).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("tab", { name: "유사 제품" })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "성분" })).toHaveAttribute("aria-selected", "true");
  });

  it("레일은 세로 tablist 이고 ↑↓ 로 옮긴다", () => {
    render(<SampleTabs variant="rail" />);
    const first = screen.getByRole("tab", { name: "성분" });

    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(screen.getByRole("tab", { name: "사용 후기" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "사용 후기" })).toHaveAttribute("aria-selected", "true");
  });

  it("asChild 로 넘긴 링크를 탭 요소로 쓰고, 방향키로 옮기면 그 링크를 누른다", () => {
    const clicked: string[] = [];
    render(
      <Tabs value="a" onValueChange={() => undefined} layout="scroll">
        <TabList label="구성품">
          {["a", "b"].map((value) => (
            <Tab key={value} value={value} asChild>
              <a
                href={`?part=${value}`}
                onClick={(event) => {
                  event.preventDefault();
                  clicked.push(value);
                }}
              >
                구성품 {value}
              </a>
            </Tab>
          ))}
        </TabList>
      </Tabs>,
    );
    const first = screen.getByRole("tab", { name: "구성품 a" });

    expect(first.tagName).toBe("A");
    expect(first).toHaveAttribute("href", "?part=a");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(clicked).toEqual(["b"]);
  });

  it("고를 때 탭 폭이 바뀌지 않게 굵은 글자 폭을 보이지 않는 사본으로 잡는다", () => {
    render(<SampleTabs />);
    const tab = screen.getByRole("tab", { name: "성분" });
    const copy = tab.querySelector('[aria-hidden="true"]');

    expect(copy).toHaveClass("invisible", "font-bold");
    expect(copy).toHaveTextContent("성분");
  });
});

describe("TabNav", () => {
  it("링크마다 Tab 으로 멈추고, 지금 화면의 링크는 aria-current='page' 다", () => {
    render(
      <TabNav aria-label="탐색 방식">
        <TabNavItem current>
          <a href="?mode=product">제품명 검색</a>
        </TabNavItem>
        <TabNavItem current={false}>
          <a href="?mode=ingredient">성분 필터링</a>
        </TabNavItem>
      </TabNav>,
    );

    expect(screen.getByRole("navigation", { name: "탐색 방식" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "제품명 검색" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "성분 필터링" })).not.toHaveAttribute("aria-current");
  });
});
