/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Disclosure, DisclosureContent, DisclosureGroup, DisclosureIcon, DisclosureTrigger } from "./disclosure";

describe("Disclosure", () => {
  const Row = ({ value }: { readonly value: string }) => (
    <Disclosure value={value}>
      <DisclosureTrigger>
        <button type="button">
          {value}
          <DisclosureIcon />
        </button>
      </DisclosureTrigger>
      <DisclosureContent>{value} 내용</DisclosureContent>
    </Disclosure>
  );

  it("single 은 하나를 펼치면 앞의 것을 접고, aria-expanded · aria-controls 를 붙인다", () => {
    render(
      <DisclosureGroup type="single" defaultValue="스킨케어">
        <Row value="스킨케어" />
        <Row value="클렌징" />
      </DisclosureGroup>,
    );
    const skincare = screen.getByRole("button", { name: "스킨케어" });
    const cleansing = screen.getByRole("button", { name: "클렌징" });

    expect(skincare).toHaveAttribute("aria-expanded", "true");
    expect(skincare).toHaveAttribute("data-state", "open");
    expect(document.getElementById(skincare.getAttribute("aria-controls")!)).toBeVisible();

    fireEvent.click(cleansing);
    expect(cleansing).toHaveAttribute("aria-expanded", "true");
    expect(skincare).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("스킨케어 내용")).not.toBeVisible();
  });

  it("multiple 은 따로 열고 닫는다", () => {
    render(
      <DisclosureGroup type="multiple">
        <Row value="질문 1" />
        <Row value="질문 2" />
      </DisclosureGroup>,
    );

    fireEvent.click(screen.getByRole("button", { name: "질문 1" }));
    fireEvent.click(screen.getByRole("button", { name: "질문 2" }));
    expect(screen.getByText("질문 1 내용")).toBeVisible();
    expect(screen.getByText("질문 2 내용")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "질문 1" }));
    expect(screen.getByText("질문 1 내용")).not.toBeVisible();
    expect(screen.getByText("질문 2 내용")).toBeVisible();
  });

  it("홀로 쓰면 스스로 펼침 상태를 든다", () => {
    render(
      <Disclosure>
        <DisclosureTrigger>
          <button type="button">더 보기</button>
        </DisclosureTrigger>
        <DisclosureContent>숨은 내용</DisclosureContent>
      </Disclosure>,
    );

    expect(screen.getByText("숨은 내용")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(screen.getByText("숨은 내용")).toBeVisible();
  });

  it("행에 hover·눌림 상태를 붙이고, 이름은 버튼 글자나 client 가 준 aria-label 에서 온다", () => {
    render(
      <>
        <Disclosure>
          <DisclosureTrigger>
            <button type="button" className="fb-surface">
              스킨케어
              <DisclosureIcon />
            </button>
          </DisclosureTrigger>
          <DisclosureContent>내용</DisclosureContent>
        </Disclosure>
        <Disclosure>
          <DisclosureTrigger>
            <button type="button" aria-label="자주 묻는 질문 펼치기">
              <DisclosureIcon />
            </button>
          </DisclosureTrigger>
          <DisclosureContent>내용</DisclosureContent>
        </Disclosure>
      </>,
    );
    const row = screen.getByRole("button", { name: "스킨케어" });

    expect(row).toHaveClass("pressable", "fb-surface");
    fireEvent.pointerDown(row, { pointerId: 1, button: 0, pointerType: "touch", clientX: 0, clientY: 0 });
    expect(row).toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "자주 묻는 질문 펼치기" })).toBeInTheDocument();
  });

  it("개발 환경에서 이름 없는 행을 알린다. 꺾쇠만 있는 버튼은 이름이 없다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Disclosure>
          <DisclosureTrigger>
            <button type="button">
              <DisclosureIcon />
            </button>
          </DisclosureTrigger>
          <DisclosureContent>내용</DisclosureContent>
        </Disclosure>
        <Disclosure>
          <DisclosureTrigger>
            <button type="button">이름 있음</button>
          </DisclosureTrigger>
          <DisclosureContent>내용</DisclosureContent>
        </Disclosure>
      </>,
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("DisclosureTrigger 에 이름이 없다");
    warn.mockRestore();
  });
});
