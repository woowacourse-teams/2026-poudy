/**
 * localStorage 와 렌더링이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { SavedPreview } from "./PersonalSections";

import { refreshSavedProducts, saveProduct } from "@/lib/storage/saved-products";
import { server } from "@/mocks/server";

beforeEach(() => {
  window.localStorage.clear();
  refreshSavedProducts();
});

describe("홈 저장 제품 미리보기", () => {
  it("저장을 풀면 그 카드가 화면에서 사라진다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedPreview />);

    // 저장한 둘이 먼저 채워진다.
    expect(await screen.findByText("1025 독도 토너")).toBeInTheDocument();
    const target = await screen.findByText("다이브인 저분자 히알루론산 토너");
    expect(target).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다이브인 저분자 히알루론산 토너 저장 해제" }));

    // 저장을 푼 카드는 남지 않는다. 다시 불러오기를 기다리는 동안에도 보이면 안 된다.
    await waitFor(() => {
      expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
    });
    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
  });

  /*
   * 목 서버는 곧바로 답해서 다시 불러오기가 사실상 즉시 끝난다.
   * 실제 망에서는 시간이 걸리고 그동안 지운 카드가 남았다.
   * 응답을 늦춰 그 사이를 재현한다.
   */
  it("다시 불러오는 동안에도 저장을 푼 카드가 남지 않는다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedPreview />);

    expect(await screen.findByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();

    server.use(
      http.get("*/api/storage", async () => {
        await delay(3000);
        return HttpResponse.json({ items: [] });
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "다이브인 저분자 히알루론산 토너 저장 해제" }));

    // 응답을 기다리지 않고 본다. 이 자리에서 이미 사라져 있어야 한다.
    expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
  });

  it("셋을 저장해도 둘만 보여 주고, 하나를 풀면 다음 것이 올라온다", async () => {
    saveProduct(1);
    saveProduct(2);
    saveProduct(3);
    render(<SavedPreview />);

    // 최근 저장이 앞에 오므로 3 · 2 만 보이고 1 은 `전체 보기` 로 넘긴다.
    expect(await screen.findByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();
    expect(screen.getByText("어성초 77 수딩 토너")).toBeInTheDocument();
    expect(screen.queryByText("1025 독도 토너")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다이브인 저분자 히알루론산 토너 저장 해제" }));

    // 푼 자리를 남은 하나가 채운다. 그래도 한 번에 둘까지만 보여 준다.
    expect(await screen.findByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.getByText("어성초 77 수딩 토너")).toBeInTheDocument();
    expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
  });

  /*
   * 저장 목록은 브라우저에 있고 표시 정보는 서버가 준다. 둘이 어긋날 수 있다.
   * 지워진 제품을 저장해 둔 채로 두면 ID 는 남지만 서버는 그 제품을 주지 않는다.
   * 이때 `savedIds` 로 빈 상태를 판단하면 카드도 안내도 없는 빈칸만 남는다.
   */
  it("저장한 ID 를 서버가 더 이상 주지 않으면 빈 안내를 보여 준다", async () => {
    saveProduct(99999);
    render(<SavedPreview />);

    expect(await screen.findByText("아직 저장한 제품이 없어요")).toBeInTheDocument();
    // 보여 줄 것이 없으면 전체 보기로 보낼 이유도 없다.
    expect(screen.queryByRole("link", { name: /전체 보기/ })).not.toBeInTheDocument();
  });

  it("마지막 하나까지 저장을 풀면 카드가 모두 사라지고 빈 안내가 뜬다", async () => {
    saveProduct(1);
    render(<SavedPreview />);

    expect(await screen.findByText("1025 독도 토너")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    /*
     * 저장이 비면 불러올 것이 없어 응답이 오지 않는다.
     * 앞서 받아 둔 것을 비우지 않으면 지운 카드가 그대로 남는다.
     */
    await waitFor(() => {
      expect(screen.queryByText("1025 독도 토너")).not.toBeInTheDocument();
    });
    expect(screen.getByText("아직 저장한 제품이 없어요")).toBeInTheDocument();
  });
});
