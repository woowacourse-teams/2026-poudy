/**
 * @vitest-environment jsdom
 */
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyFilterChip, MyFilterToggleRow } from "./MyFilterToggle";

import { addMyFilterIngredients } from "@/lib/api/my-filter";
import { type MyFilterStatus, useMyFilterStatus } from "@/lib/hooks/useMyFilterStatus";
import { takeLoginReturn } from "@/lib/storage/login-return";
import { readMyFilterOn } from "@/lib/storage/my-filter-setting";
import { server } from "@/mocks/server";
import { resetMockShelf } from "@/mocks/shelf-handlers";

const { router, push } = vi.hoisted(() => {
  const mocks = { push: vi.fn() };
  return { ...mocks, router: { back: vi.fn(), replace: vi.fn(), ...mocks } };
});
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/products",
}));

const SIGNED_OUT: MyFilterStatus = { status: "signedOut" };
const EMPTY: MyFilterStatus = { status: "ready", count: 0 };
const FILLED: MyFilterStatus = { status: "ready", count: 3 };

afterEach(() => {
  resetMockShelf();
  push.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("나만의 필터 칩(S23)", () => {
  it("필터에 성분이 있으면 누르는 대로 켜고 끈다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MyFilterChip on={false} status={FILLED} onChange={onChange} serverApplied={false} />);

    const chip = screen.getByRole("button", { name: "나만의 필터" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("로그인 전이어도 보여 주고, 누르면 로그인을 안내한 뒤 설정을 켬으로 남기고 지금 화면을 돌아올 곳으로 남긴다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    window.history.replaceState(null, "", "/products?categoryIds=3");
    document.cookie = "poudy-my-filter=off; path=/";
    render(<MyFilterChip on={false} status={SIGNED_OUT} onChange={onChange} serverApplied={false} />);

    await user.click(screen.getByRole("button", { name: "나만의 필터" }));
    expect(await screen.findByText("로그인하고 나만의 필터를 쓸까요?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login");
    expect(takeLoginReturn()).toBe("/products?categoryIds=3");
    expect(readMyFilterOn()).toBe(true);
  });

  it("필터가 비어 있으면 켜지 않고 선반으로 안내한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MyFilterChip on={false} status={EMPTY} onChange={onChange} serverApplied={false} />);

    await user.click(screen.getByRole("button", { name: "나만의 필터" }));
    expect(await screen.findByText("나만의 필터에 넣은 성분이 하나도 없어요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "선반 보기" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/shelf");
  });

  it("회원 상태를 읽는 동안에는 서버 컴포넌트가 정한 적용 여부로 그린다", () => {
    const { rerender } = render(<MyFilterChip on status={{ status: "loading" }} onChange={vi.fn()} serverApplied />);
    expect(screen.getByRole("button", { name: "나만의 필터" })).toHaveAttribute("aria-pressed", "true");

    rerender(<MyFilterChip on status={{ status: "loading" }} onChange={vi.fn()} serverApplied={false} />);
    expect(screen.getByRole("button", { name: "나만의 필터" })).toHaveAttribute("aria-pressed", "false");
  });

  it("설정이 켬이어도 필터가 비어 있으면 끈 모양으로 그린다", () => {
    render(<MyFilterChip on status={EMPTY} onChange={vi.fn()} serverApplied={false} />);

    expect(screen.getByRole("button", { name: "나만의 필터" })).toHaveAttribute("aria-pressed", "false");
  });

  it("관리자 세션이거나 필터를 읽지 못하면 숨긴다", () => {
    render(<MyFilterChip on status={{ status: "unavailable" }} onChange={vi.fn()} serverApplied={false} />);

    expect(screen.queryByRole("button", { name: "나만의 필터" })).not.toBeInTheDocument();
  });
});

describe("나만의 필터 행(S22)", () => {
  it("필터에 성분이 있으면 성분 수를 적고 스위치로 켜고 끈다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MyFilterToggleRow on status={FILLED} onChange={onChange} />);

    const row = screen.getByRole("switch", { name: /나만의 필터 적용/ });
    expect(row).toHaveAttribute("aria-checked", "true");
    expect(row).toHaveTextContent("필터에 넣은 성분 3개가 든 제품을 제외해요");
    await user.click(row);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("로그인 전이면 [로그인]을 두고, 누르면 로그인 안내 시트를 띄운다", async () => {
    const user = userEvent.setup();
    render(<MyFilterToggleRow on={false} status={SIGNED_OUT} onChange={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText("로그인하고 나만의 필터를 쓸까요?")).toBeInTheDocument();
  });

  it("필터가 비어 있으면 스위치 대신 선반으로 가는 버튼을 두고, 행 자체는 누르는 자리가 아니다", async () => {
    const user = userEvent.setup();
    render(<MyFilterToggleRow on={false} status={EMPTY} onChange={vi.fn()} />);

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "선반 보기" }));
    expect(push).toHaveBeenCalledWith("/shelf");
  });
});

describe("useMyFilterStatus", () => {
  it("로그인했으면 필터의 성분 수를 알린다", async () => {
    await addMyFilterIngredients([9001, 9002]);
    const { result } = renderHook(() => useMyFilterStatus());

    await waitFor(() => expect(result.current).toEqual({ status: "ready", count: 2 }));
  });

  it("로그인 전이면 signedOut 이다", async () => {
    server.use(
      http.get("*/api/users/me/my-filter", () =>
        HttpResponse.json({ title: "UNAUTHORIZED", status: 401, code: "UNAUTHORIZED" }, { status: 401 }),
      ),
    );
    const { result } = renderHook(() => useMyFilterStatus());

    await waitFor(() => expect(result.current).toEqual({ status: "signedOut" }));
  });
});
