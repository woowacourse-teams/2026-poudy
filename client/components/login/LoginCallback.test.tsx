// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginCallback } from "./LoginCallback";

import { findMe } from "@/lib/api/member";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/api/member", () => ({ findMe: vi.fn(), requestRestore: vi.fn() }));
vi.mock("@/lib/storage/saved-products", () => ({ reloadSavedProducts: vi.fn(() => Promise.resolve()) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("로그인 결과 화면", () => {
  it("로그인했으면 로그인 전에 불러 둔 저장함을 다시 불러온 뒤 다음 화면으로 보낸다", async () => {
    vi.mocked(findMe).mockResolvedValue({ provider: "KAKAO" } as Awaited<ReturnType<typeof findMe>>);

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(reloadSavedProducts).toHaveBeenCalledTimes(1);
  });

  it("세션을 확인하지 못하면 저장함을 다시 불러오지 않는다", async () => {
    vi.mocked(findMe).mockRejectedValue(new Error("unauthorized"));

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />);

    await waitFor(() => expect(findMe).toHaveBeenCalled());
    expect(reloadSavedProducts).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
