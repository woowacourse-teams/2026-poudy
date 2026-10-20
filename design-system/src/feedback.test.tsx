/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadMore } from "./load-more";
import { Notice } from "./notice";

describe("Notice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("문구를 그린 뒤 한 번 알리고, 행동과 닫기를 부른다", () => {
    const onClose = vi.fn();
    const keep = vi.fn();
    render(
      <Notice actions={[{ label: "대신 리모넨 남기기", onClick: keep }]} onClose={onClose}>
        리모넨을 뺐어요.
      </Notice>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("");
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole("status")).toHaveTextContent("리모넨을 뺐어요.");

    fireEvent.click(screen.getByRole("button", { name: "대신 리모넨 남기기" }));
    expect(keep).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "안내 닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("EmptyState", () => {
  it("제목 → 설명 → 행동 순서로 그리고, 제목은 포커스를 받을 수 있다", () => {
    render(
      <EmptyState
        title="아직 위시리스트에 추가한 제품이 없어요"
        description="제품 상세에서 추가해 보세요."
        action={<button type="button">제품 둘러보기</button>}
      />,
    );
    const title = screen.getByText("아직 위시리스트에 추가한 제품이 없어요");
    expect(title).toHaveAttribute("tabindex", "-1");
    expect(title.compareDocumentPosition(screen.getByText("제품 상세에서 추가해 보세요."))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole("button", { name: "제품 둘러보기" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("화면 오류는 제목을 heading 으로 그리고 라이브 영역을 두지 않는다", () => {
    render(<ErrorState variant="screen" title="화면을 불러오지 못했어요" code="7f3a9c" />);
    expect(screen.getByRole("heading", { name: "화면을 불러오지 못했어요" })).toBeInTheDocument();
    expect(screen.getByText("오류 코드 7f3a9c")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("섹션 오류는 [다시 시도]로 그 섹션만 다시 부른다", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState variant="section" onRetry={onRetry}>
        제품을 불러오지 못했어요
      </ErrorState>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("LoadMore", () => {
  let observed: Element[] = [];
  let trigger: () => void = () => {};

  beforeEach(() => {
    vi.useFakeTimers();
    observed = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          trigger = () => callback([{ isIntersecting: true }]);
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {
          observed = [];
        }
      },
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const next = (status: "idle" | "loading" | "end" | "failed", onLoad = vi.fn(), onRetry = vi.fn()) => (
    <LoadMore
      direction="next"
      status={status}
      loadedCount={20}
      totalCount={1350}
      onLoad={onLoad}
      onRetry={onRetry}
      href="/products?page=2"
    />
  );

  it("idle 이면 화면에 닿을 때 다음 장을 부르고, 실패하면 지켜보지 않는다", () => {
    const onLoad = vi.fn();
    const { rerender } = render(next("idle", onLoad));
    act(() => trigger());
    expect(onLoad).toHaveBeenCalledTimes(1);

    rerender(next("failed", onLoad));
    expect(observed).toHaveLength(0);
  });

  it("불러오는 중은 300ms 뒤에 개수와 함께 보인다", () => {
    render(next("loading"));
    const line = screen.getByText("20 / 1,350 · 다음 제품 불러오는 중");
    expect(line).toHaveClass("invisible");
    act(() => vi.advanceTimersByTime(300));
    expect(line).not.toHaveClass("invisible");
  });

  it("10초가 지나면 안내와 [다시 시도]를 함께 보인다", () => {
    const onRetry = vi.fn();
    render(next("loading", vi.fn(), onRetry));
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("시간이 조금 걸리고 있어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("실패하면 문구를 알리고 버튼으로만 다시 부른다", () => {
    const onRetry = vi.fn();
    render(next("failed", vi.fn(), onRetry));
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole("status")).toHaveTextContent("다음 제품을 불러오지 못했어요");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("마지막이면 아무것도 보이지 않고 알리지도 않으며, 크롤러 링크를 두지 않는다", () => {
    const { container } = render(next("end"));
    act(() => vi.advanceTimersByTime(100));
    expect(container).toHaveTextContent("");
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("이전 장은 버튼을 눌러야만 부르고, 부르는 동안은 처리 중이다", () => {
    const onLoad = vi.fn();
    const { rerender, container } = render(
      <LoadMore direction="previous" status="idle" onLoad={onLoad} href="/products?page=1" />,
    );
    expect(observed).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "이전 제품 보기" }));
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(container.querySelector("a")).toHaveAttribute("href", "/products?page=1");

    rerender(<LoadMore direction="previous" status="loading" onLoad={onLoad} />);
    expect(screen.getByRole("button", { name: "불러오는 중…" })).toHaveAttribute("aria-busy", "true");
  });
});
