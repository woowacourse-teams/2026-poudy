/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShelfAddScreen } from "./ShelfAddScreen";

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
    expect(await screen.findByText("‘닥터지 시카 앰플’과 맞는 제품이 없어요")).toBeInTheDocument();
    // 결과 목록 끝의 등록 요청 줄은 결과가 있을 때만 둔다.
    expect(screen.queryByText("찾는 제품이 없나요?")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "제품 등록 요청하기" }));
    expect(await screen.findByRole("dialog", { name: "제품 등록 요청" })).toBeInTheDocument();
  });

  it("방금 담은 행은 [담김]이 되고, 누르면 바로 빼고 되돌리기를 띄운다(S52j-1)", async () => {
    const user = userEvent.setup();
    render(<ShelfAddScreen />, { wrapper: ToastProvider });

    await user.type(screen.getByRole("combobox", { name: "제품 검색" }), "크림");
    const option = await firstAddable();
    await user.click(option);

    // 담은 직후 평가 시트를 그냥 닫으면 담은 것만 알린다(S52j).
    await user.click(await screen.findByRole("button", { name: "나중에 할게요" }));
    expect(await screen.findByText("선반에 저장했어요. 평가는 선반에서 언제든 할 수 있어요")).toBeInTheDocument();
    await waitFor(() => expect(option).toHaveTextContent(/담김/));

    await user.click(option);
    expect(await screen.findByText("선반에서 뺐어요")).toBeInTheDocument();
    await waitFor(() => expect(option).toHaveTextContent(/추가$/));
  });
});
