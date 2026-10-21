/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopStrip } from "./top-strip";

const strip = (text: string, onClose = vi.fn()) => (
  <TopStrip
    label="공지 알림, 2개"
    tone="brand"
    icon="speakerphone"
    action={{ asChild: <a href="/notices/1" /> }}
    onClose={onClose}
    closeLabel="공지 알림 닫기"
  >
    {text}
  </TopStrip>
);

describe("TopStrip", () => {
  it("띠 영역 전체를 링크 하나로 그리고, 닫기는 링크 밖의 버튼으로 둔다", () => {
    const onClose = vi.fn();
    render(strip("선반 기능이 새로 생겼어요", onClose));

    expect(screen.getByRole("region", { name: "공지 알림, 2개" })).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "선반 기능이 새로 생겼어요",
    });
    expect(link).toHaveAttribute("href", "/notices/1");
    const close = screen.getByRole("button", { name: "공지 알림 닫기" });
    expect(link).not.toContainElement(close);

    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("처음에는 움직이지 않고, 문구가 바뀐 뒤에만 올라온다", () => {
    const view = render(strip("첫 공지"));
    expect(screen.getByText("첫 공지")).not.toHaveAttribute("data-top-strip-text");

    view.rerender(strip("둘째 공지"));
    expect(screen.getByText("둘째 공지")).toHaveAttribute("data-top-strip-text");

    view.rerender(strip("첫 공지"));
    expect(screen.getByText("첫 공지")).toHaveAttribute("data-top-strip-text");
  });

  it("onClick 을 넘기면 띠 영역을 버튼으로 그린다", () => {
    const onClick = vi.fn();
    render(
      <TopStrip
        label="앱에서 열기"
        tone="neutral"
        icon="device-mobile"
        action={{ onClick }}
        onClose={() => {}}
        closeLabel="앱에서 열기 안내 닫기"
      >
        이 화면을 앱에서 열기
      </TopStrip>,
    );

    fireEvent.click(screen.getByRole("button", { name: "이 화면을 앱에서 열기" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
