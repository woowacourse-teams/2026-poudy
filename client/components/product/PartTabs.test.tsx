/**
 * @vitest-environment jsdom
 */
import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { use, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PartTabs } from "./PartTabs";

import { productDetails } from "@/mocks/fixtures";

/**
 * 앱 라우터처럼 주소를 바꾸면 새 화면을 받을 때까지 기다리게 한다. 이동은 transition 안에서 불리므로,
 * 받기 전에는 React 가 앞 화면을 그대로 두고 받은 뒤에 바꾼다.
 */
const router = vi.hoisted(() => {
  const state: { navigate?: (href: string) => void } = {};
  return { state, replace: vi.fn((href: string) => state.navigate?.(href)) };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: router.replace, refresh: vi.fn() }),
}));

/**
 * 테스트에는 앱 라우터가 없어 next/link 가 누름을 넘기지 않는다. 앱의 링크처럼 onClick 뒤에 onNavigate 를 부른다.
 * 이동은 PartTabs 가 onNavigate 에서 맡는다.
 */
vi.mock("next/link", () => {
  /** 링크만 받는 값. 앵커에 넘기지 않는다. */
  const LINK_ONLY = new Set(["replace", "scroll", "prefetch"]);
  return {
    default: ({
      onClick,
      onNavigate,
      ...props
    }: React.ComponentProps<"a"> & {
      readonly onNavigate?: (event: { readonly preventDefault: () => void }) => void;
    }) => (
      <a
        {...Object.fromEntries(Object.entries(props).filter(([key]) => !LINK_ONLY.has(key)))}
        onClick={(event) => {
          onClick?.(event);
          event.preventDefault();
          onNavigate?.({ preventDefault: () => undefined });
        }}
      />
    ),
  };
});

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const PARTS = [
  { id: 11, name: "아쿠아 세럼", cautionCount: 0 },
  { id: 12, name: "인텐스 크림", cautionCount: 2 },
];

const productOf = (partId: number): ProductDetailResponse => {
  const part = PARTS.find(({ id }) => id === partId)!;
  return {
    ...productDetails[0]!,
    productParts: PARTS,
    selectedPart: { ...productDetails[0]!.selectedPart!, id: part.id, name: part.name },
  };
};

/** 주소마다 서버 응답을 기다리는 자리. 테스트가 응답을 보낸다. */
let responses: Map<string, (product: ProductDetailResponse) => void>;

function Page() {
  const [page, setPage] = useState<ProductDetailResponse | Promise<ProductDetailResponse>>(() => productOf(12));
  useEffect(() => {
    router.state.navigate = (href) => setPage(new Promise((resolve) => responses.set(href, resolve)));
  }, []);
  const product = page instanceof Promise ? use(page) : page;

  return (
    <PartTabs product={product}>
      <p>{product.selectedPart?.name} 패널</p>
    </PartTabs>
  );
}

const respond = async (partId: number) => {
  const href = `/products/1?partId=${partId}`;
  await act(async () => responses.get(href)?.(productOf(partId)));
};

/** 누르기와 시간 흐름. 화면이 새 구성품을 기다리며 멈춰 있어 act 를 기다려 준다. */
const press = async (element: HTMLElement) => {
  await act(async () => fireEvent.click(element));
};
const wait = async (ms: number) => {
  await act(async () => vi.advanceTimersByTime(ms));
};

const tab = (name: string) => within(screen.getByRole("tablist", { name: "구성품" })).getByRole("tab", { name });
const panel = () => screen.getByRole("tabpanel");
const skeletonShown = () => panel().querySelector(".animate-skeleton") !== null;
const AQUA = "01 아쿠아 세럼, 주의 성분 없음";
const INTENSE = "02 인텐스 크림, 주의 성분 있음";

describe("구성품을 바꾸는 동안(S50k)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    responses = new Map();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("누른 탭을 바로 고른 것으로 보이고, 300ms 가 지나면 패널만 스켈레톤으로 바꾼다", async () => {
    render(<Page />);

    await press(tab(AQUA));

    expect(router.replace).toHaveBeenCalledWith("/products/1?partId=11", { scroll: false });
    expect(tab(AQUA)).toHaveAttribute("aria-selected", "true");
    expect(tab(INTENSE)).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel", { name: AQUA }).parentElement).toHaveAttribute("aria-busy", "true");

    // 300ms 안에는 앞 패널을 그대로 둔다(FEEDBACK F02).
    await wait(299);
    expect(skeletonShown()).toBe(false);
    expect(panel()).toHaveTextContent("인텐스 크림 패널");

    await wait(1);
    expect(skeletonShown()).toBe(true);
    expect(panel()).not.toHaveTextContent("인텐스 크림 패널");
  });

  it("새 구성품이 오면 스켈레톤을 걷고 그 패널을 보인다", async () => {
    render(<Page />);

    await press(tab(AQUA));
    await wait(300);
    await respond(11);

    expect(panel().parentElement).toHaveAttribute("aria-busy", "false");
    // 켠 스켈레톤은 적어도 500ms 둔다.
    await wait(500);
    expect(skeletonShown()).toBe(false);
    expect(screen.getByRole("tabpanel", { name: AQUA })).toHaveTextContent("아쿠아 세럼 패널");
  });

  it("기다리는 중에 원래 탭을 다시 누르면 기다림을 지우고 원래 패널로 돌아간다", async () => {
    render(<Page />);

    await press(tab(AQUA));
    await wait(300);
    await press(tab(INTENSE));

    // 기다리던 이동은 원래 구성품으로 가는 이동이 버린다.
    expect(router.replace).toHaveBeenLastCalledWith("/products/1?partId=12", { scroll: false });
    expect(tab(INTENSE)).toHaveAttribute("aria-selected", "true");
    expect(panel().parentElement).toHaveAttribute("aria-busy", "false");
    await wait(500);
    expect(skeletonShown()).toBe(false);
    expect(panel()).toHaveTextContent("인텐스 크림 패널");
  });

  it("스켈레톤이 10초를 넘기면 그 위에 안내와 [다시 시도]를 보이고, 누르면 같은 구성품으로 다시 옮긴다", async () => {
    render(<Page />);

    await press(tab(AQUA));
    // 스켈레톤이 나타난 때(300ms)부터 잰다. 다른 화면의 스켈레톤과 같다.
    await wait(300);
    await wait(9_999);
    expect(screen.queryByText("시간이 조금 걸리고 있어요")).not.toBeInTheDocument();

    await wait(1);
    expect(within(panel()).getByText("시간이 조금 걸리고 있어요")).toBeInTheDocument();

    await press(within(panel()).getByRole("button", { name: "다시 시도" }));
    expect(router.replace).toHaveBeenCalledTimes(2);
    expect(router.replace).toHaveBeenLastCalledWith("/products/1?partId=11", { scroll: false });
    // 다시 시도한 뒤에도 기다리면 안내와 버튼을 그대로 둔다.
    expect(within(panel()).getByRole("button", { name: "다시 시도" })).toBeInTheDocument();

    await respond(11);
    await wait(500);
    expect(screen.queryByText("시간이 조금 걸리고 있어요")).not.toBeInTheDocument();
    expect(panel()).toHaveTextContent("아쿠아 세럼 패널");
  });

  it("기다리는 구성품을 다시 누르면 다시 옮기지 않는다", async () => {
    render(<Page />);

    await press(tab(AQUA));
    await press(tab(AQUA));

    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
