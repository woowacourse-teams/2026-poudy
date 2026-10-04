import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getSavedProductsSnapshot,
  reloadSavedProducts,
  saveProduct,
  subscribeSavedProducts,
  unsaveProduct,
} from "./saved-products";

import { setMockSavedProducts } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const SAVED_PATH = "*/api/members/me/saved-products";

const unauthorized = () =>
  HttpResponse.json(
    { title: "Unauthorized", status: 401, detail: "로그인이 필요합니다.", code: "UNAUTHORIZED" },
    { status: 401 },
  );

const serverError = () =>
  HttpResponse.json(
    { title: "Internal Server Error", status: 500, detail: "서버 오류", code: "INTERNAL_SERVER_ERROR" },
    { status: 500 },
  );

beforeEach(async () => {
  setMockSavedProducts([3, 1]);
  await reloadSavedProducts();
});

describe("저장한 제품", () => {
  it("서버의 저장 목록을 최근 저장순 그대로 받는다", () => {
    expect(getSavedProductsSnapshot()).toEqual({ status: "ready", ids: [3, 1] });
  });

  it("로그인하지 않았으면 로그아웃 상태로 둔다", async () => {
    server.use(http.get(`${SAVED_PATH}/ids`, unauthorized));

    await reloadSavedProducts();

    expect(getSavedProductsSnapshot()).toEqual({ status: "signedOut", ids: [] });
  });

  it("처음 구독할 때 목록을 받아 온다", async () => {
    const unsubscribe = subscribeSavedProducts(() => undefined);

    await expect.poll(() => getSavedProductsSnapshot().status).toBe("ready");
    unsubscribe();
  });

  it("저장하면 바로 앞에 두고 서버에도 저장한다", async () => {
    const result = saveProduct(2);

    expect(getSavedProductsSnapshot().ids).toEqual([2, 3, 1]);
    await expect(result).resolves.toBe("done");
    await reloadSavedProducts();
    expect(getSavedProductsSnapshot().ids).toEqual([2, 3, 1]);
  });

  it("저장을 풀면 바로 빼고 서버에서도 지운다", async () => {
    const result = unsaveProduct(3);

    expect(getSavedProductsSnapshot().ids).toEqual([1]);
    await expect(result).resolves.toBe("done");
    await reloadSavedProducts();
    expect(getSavedProductsSnapshot().ids).toEqual([1]);
  });

  it("같은 제품을 잇달아 저장하고 풀면 누른 차례대로 서버에 반영한다", async () => {
    server.use(
      http.put(`${SAVED_PATH}/:productId`, async () => {
        await delay(50);
        setMockSavedProducts([2, 3, 1]);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const saved = saveProduct(2);
    const unsaved = unsaveProduct(2);
    await Promise.all([saved, unsaved]);

    await reloadSavedProducts();
    expect(getSavedProductsSnapshot().ids).toEqual([3, 1]);
  });

  it("저장이 실패하면 서버 목록으로 되돌린다", async () => {
    server.use(http.put(`${SAVED_PATH}/:productId`, serverError));

    await expect(saveProduct(2)).resolves.toBe("failed");

    await expect.poll(() => getSavedProductsSnapshot().ids).toEqual([3, 1]);
  });

  it("세션이 끝났으면 로그아웃 상태로 바꾼다", async () => {
    server.use(http.put(`${SAVED_PATH}/:productId`, unauthorized));

    await expect(saveProduct(2)).resolves.toBe("signedOut");

    expect(getSavedProductsSnapshot()).toEqual({ status: "signedOut", ids: [] });
  });
});
