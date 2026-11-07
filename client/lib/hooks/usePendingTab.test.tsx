/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePendingTab } from "./usePendingTab";

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

function Tabs({ replaceHistory = false }: { readonly replaceHistory?: boolean }) {
  const [shown, navigate] = usePendingTab("a");
  const preventDefault = vi.fn();
  return (
    <>
      <p>지금 {shown}</p>
      <button
        type="button"
        onClick={() => {
          navigate("b", "/b", { replace: replaceHistory })({ preventDefault });
          if (preventDefault.mock.calls.length > 0) document.body.dataset.prevented = "";
        }}
      >
        b
      </button>
    </>
  );
}

describe("usePendingTab", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    delete document.body.dataset.prevented;
  });

  it("링크의 이동을 막고 같은 주소로 쌓아 옮긴다", async () => {
    render(<Tabs />);

    await userEvent.click(screen.getByRole("button", { name: "b" }));

    expect(document.body.dataset.prevented).toBe("");
    expect(push).toHaveBeenCalledExactlyOnceWith("/b");
    expect(replace).not.toHaveBeenCalled();
  });

  it("replace 이면 기록을 쌓지 않고 바꾼다", async () => {
    render(<Tabs replaceHistory />);

    await userEvent.click(screen.getByRole("button", { name: "b" }));

    expect(replace).toHaveBeenCalledExactlyOnceWith("/b");
    expect(push).not.toHaveBeenCalled();
  });

  it("이동이 끝나면 주소에서 읽은 탭으로 돌아간다", async () => {
    // 이 라우터는 아무 화면도 받지 않고 끝난다. 이동이 버려진 것과 같다.
    render(<Tabs />);

    await userEvent.click(screen.getByRole("button", { name: "b" }));

    expect(screen.getByText("지금 a")).toBeInTheDocument();
  });
});
