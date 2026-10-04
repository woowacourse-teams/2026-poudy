/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSavedProducts } from "./useSavedProducts";

import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { reloadSavedProducts } from "@/lib/storage/saved-products";
import { setMockSavedProducts } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// 실패 응답의 오류 이벤트가 테스트 종료 뒤 실제 분석 모듈을 불러오지 않게 한다.
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const SAVED_PATH = "*/api/members/me/saved-products";
const codeOf = (status: number): string => {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  return "INTERNAL_SERVER_ERROR";
};
const problem = (status: number) =>
  HttpResponse.json({ title: "실패", status, detail: "실패", code: codeOf(status) }, { status });

beforeEach(async () => {
  push.mockClear();
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
  setMockSavedProducts([1]);
  await reloadSavedProducts();
});

describe("저장 요청 결과", () => {
  it("저장·해제·토글 결과를 Promise로 반환한다", async () => {
    const { result } = renderHook(useSavedProducts);

    await act(async () => {
      await expect(result.current.save(2)).resolves.toBe("done");
    });
    expect(result.current.isSaved(2)).toBe(true);
    await act(async () => {
      await expect(result.current.unsave(2)).resolves.toBe("done");
    });
    expect(result.current.isSaved(2)).toBe(false);
    await act(async () => {
      await expect(result.current.toggle(1)).resolves.toBe("done");
    });
    expect(result.current.isSaved(1)).toBe(false);
  });

  it("요청이 실패했으면 failed를 반환한다", async () => {
    server.use(http.delete(`${SAVED_PATH}/1`, () => problem(500)));
    const { result } = renderHook(useSavedProducts);

    await act(async () => {
      await expect(result.current.unsave(1)).resolves.toBe("failed");
      await reloadSavedProducts();
    });

    expect(result.current.isSaved(1)).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("이미 로그아웃 상태면 요청을 보내지 않고 null과 로그인 이동을 반환한다", async () => {
    server.use(http.get(`${SAVED_PATH}/ids`, () => problem(401)));
    await reloadSavedProducts();
    const { result } = renderHook(useSavedProducts);

    expect(result.current.save(2)).toBeNull();
    expect(result.current.unsave(1)).toBeNull();
    expect(result.current.toggle(1)).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("요청 중 세션이 끝나면 결과를 반환하면서 로그인 화면으로 보낸다", async () => {
    server.use(http.put(`${SAVED_PATH}/2`, () => problem(401)));
    const { result } = renderHook(useSavedProducts);

    await act(async () => {
      await expect(result.current.save(2)).resolves.toBe("signedOut");
    });

    expect(push).toHaveBeenCalledWith("/login");
    expect(result.current.status).toBe("signedOut");
  });

  it("관리자 세션이면 요청을 보내지 않고 안내한 뒤 null을 반환한다", async () => {
    server.use(http.get(`${SAVED_PATH}/ids`, () => problem(403)));
    await reloadSavedProducts();
    const { result } = renderHook(useSavedProducts);

    expect(result.current.save(2)).toBeNull();
    expect(window.alert).toHaveBeenCalledWith(ADMIN_SESSION_MESSAGE);
    expect(push).not.toHaveBeenCalled();
  });

  it("요청이 관리자 세션으로 거절되면 결과를 반환하면서 안내한다", async () => {
    server.use(http.put(`${SAVED_PATH}/2`, () => problem(403)));
    const { result } = renderHook(useSavedProducts);

    await act(async () => {
      await expect(result.current.save(2)).resolves.toBe("adminSession");
    });

    expect(window.alert).toHaveBeenCalledWith(ADMIN_SESSION_MESSAGE);
    expect(push).not.toHaveBeenCalled();
    expect(result.current.status).toBe("adminSession");
  });
});
