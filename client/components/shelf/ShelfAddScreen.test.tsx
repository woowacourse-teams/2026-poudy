/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShelfAddScreen } from "./ShelfAddScreen";

import { VISIBLE_TEXT } from "@/lib/test/visible-text";
import { server } from "@/mocks/server";
import { resetMockShelf } from "@/mocks/shelf-handlers";

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push, replace }),
  usePathname: () => "/shelf/add",
}));

afterEach(() => {
  resetMockShelf();
});

const firstAddable = async () => {
  const listbox = await screen.findByRole("listbox", { name: "제품 자동완성" });
  return within(listbox)
    .findAllByRole("option")
    .then((options) => {
      const option = options.find((each) => /추가$/.test(each.textContent ?? ""));
      if (!option)
        throw new Error(`담을 수 있는 후보가 없어요: ${options.map((each) => each.textContent).join(" | ")}`);
      return option;
    });
};

describe("제품 추가", () => {
  it("검색 전에는 안내만 두고 등록 요청 줄을 두지 않는다(S52g)", () => {
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    expect(screen.getByRole("heading", { name: "어떤 제품을 쓰고 있나요?" })).toBeInTheDocument();
    expect(screen.queryByText("찾는 제품이 없나요?")).not.toBeInTheDocument();
  });

  it("결과 목록 끝에 등록 요청 줄을 두고, 고르면 등록 요청 시트를 연다(S52h)", async () => {
    const user = userEvent.setup();
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "독도");
    const listbox = await screen.findByRole("listbox", { name: "제품 자동완성" });
    const options = await within(listbox).findAllByRole("option");
    const last = options.at(-1);
    expect(last).toHaveTextContent("찾는 제품이 없나요?");

    if (last) await user.click(last);
    expect(await screen.findByRole("dialog", { name: "제품 등록 요청" })).toBeInTheDocument();
  });

  it("검색어와 맞는 제품이 없으면 결과 없음 안내와 등록 요청 버튼을 둔다(S52h-1)", async () => {
    const user = userEvent.setup();
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "닥터지 시카 앰플");
    expect(await screen.findByText("‘닥터지 시카 앰플’과 맞는 제품이 없어요", VISIBLE_TEXT)).toBeInTheDocument();
    // 결과 목록 끝의 등록 요청 줄은 결과가 있을 때만 둔다.
    expect(screen.queryByText("찾는 제품이 없나요?")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "제품 등록 요청하기" }));
    expect(await screen.findByRole("dialog", { name: "제품 등록 요청" })).toBeInTheDocument();
  });

  describe("등록 요청 시트(S53h)", () => {
    const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
      render(<ShelfAddScreen />, { wrapper: ToastProvider });
      await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "닥터지 시카 앰플");
      await user.click(await screen.findByRole("button", { name: "제품 등록 요청하기" }));
      const sheet = await screen.findByRole("dialog", { name: "제품 등록 요청" });
      return {
        sheet,
        send: within(sheet).getByRole("button", { name: "요청 보내기" }),
        brand: within(sheet).getByRole("textbox", { name: /브랜드/ }),
        product: within(sheet).getByRole("textbox", { name: /제품명/ }),
      };
    };
    const captureRequests = () => {
      const bodies: unknown[] = [];
      server.use(
        http.post("*/api/products/registration-requests", async ({ request }) => {
          bodies.push(await request.json());
          return new HttpResponse(null, { status: 202 });
        }),
      );
      return bodies;
    };

    it("제품명만 있으면 보낼 수 있고, 브랜드 없이 요청한다", async () => {
      const user = userEvent.setup();
      const bodies = captureRequests();
      const { send, sheet } = await openSheet(user);

      expect(within(sheet).getByText("선택")).toBeInTheDocument();
      expect(send).not.toHaveAttribute("aria-disabled");
      await user.click(send);

      await waitFor(() => expect(bodies).toEqual([{ productName: "닥터지 시카 앰플" }]));
    });

    it("브랜드도 적으면 둘 다 보낸다", async () => {
      const user = userEvent.setup();
      const bodies = captureRequests();
      const { send, brand } = await openSheet(user);

      await user.type(brand, "닥터지");
      await user.click(send);

      await waitFor(() => expect(bodies).toEqual([{ productName: "닥터지 시카 앰플", brandName: "닥터지" }]));
    });

    it("브랜드만 있으면 막고 버튼 위 안내로 이유를 알린다", async () => {
      const user = userEvent.setup();
      const bodies = captureRequests();
      const { send, brand, product, sheet } = await openSheet(user);

      await user.clear(product);
      await user.type(brand, "닥터지");

      expect(send).toHaveAttribute("aria-disabled", "true");
      expect(send).toHaveAccessibleDescription("제품명을 입력해 주세요");
      await user.click(send);
      expect(bodies).toEqual([]);

      await user.type(product, "시카 앰플");
      expect(send).not.toHaveAttribute("aria-disabled");
      expect(within(sheet).queryByText("제품명을 입력해 주세요")).not.toBeInTheDocument();
    });

    it("제품명이 공백뿐이면 막는다", async () => {
      const user = userEvent.setup();
      const bodies = captureRequests();
      const { send, product } = await openSheet(user);

      await user.clear(product);
      await user.type(product, "   ");

      expect(send).toHaveAttribute("aria-disabled", "true");
      await user.click(send);
      expect(bodies).toEqual([]);
    });
  });

  it("[추가]를 누르면 담지 않고 평가 시트만 열고, 그냥 닫으면 담기를 취소한다(S52i)", async () => {
    const user = userEvent.setup();
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "크림");
    const option = await firstAddable();
    await user.click(option);

    // 지금 쓰고 있나요?는 필수라 '네'를 미리 골라 둔다.
    expect(await screen.findByRole("radio", { name: "네" })).toBeChecked();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(option).toHaveTextContent(/추가$/);
    expect(screen.queryByText(/선반에 저장했어요/)).not.toBeInTheDocument();
  });

  it("[나중에]를 누르면 담고 되돌리기를 띄우며, 행은 '선반에 있음'이 된다(S52j)", async () => {
    const user = userEvent.setup();
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "크림");
    const option = await firstAddable();
    await user.click(option);
    await user.click(await screen.findByRole("button", { name: "나중에" }));

    expect(await screen.findByText("선반에 저장했어요. 평가는 선반에서 언제든 할 수 있어요")).toBeInTheDocument();
    await waitFor(() => expect(option).toHaveTextContent(/선반에 있음$/));

    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    await waitFor(() => expect(option).toHaveTextContent(/추가$/));
  });

  it("[다음]을 누르면 1단계 답과 함께 담고 사용감 단계로 넘어간다(S52i-2)", async () => {
    const user = userEvent.setup();
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "크림");
    const option = await firstAddable();
    await user.click(option);
    await user.click(await screen.findByRole("button", { name: "다음" }));

    expect(await screen.findByRole("heading", { name: "사용감은 어땠나요?" })).toBeInTheDocument();
    await waitFor(() => expect(option).toHaveTextContent(/선반에 있음$/));
  });
});
