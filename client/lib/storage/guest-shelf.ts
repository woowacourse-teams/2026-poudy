import { RatingResponse, ShelfProductInfoResponse, ShelfUsageStatus } from "@poudy/api/api.zod";
import { z } from "zod";

import { createSessionStore } from "./local-store";

/**
 * 비로그인 선반. 담은 제품의 정보와 사용 상태, 평가, 담은 시각을 이 탭에만 둔다.
 * 새로고침해도 남고, 탭을 닫았다가 다시 오면 사라진다. 로그인하면 회원 선반으로 옮기고 비운다.
 */
const GuestShelfItem = z.object({
  product: ShelfProductInfoResponse,
  usageStatus: ShelfUsageStatus,
  rating: RatingResponse,
  registeredAt: z.string(),
});
export type GuestShelfItem = z.infer<typeof GuestShelfItem>;

const GuestShelfItems = z.array(GuestShelfItem);

const store = createSessionStore<GuestShelfItem[]>("poudy.guest-shelf", {
  version: 1,
  fallback: [],
  isValid: (value: unknown): value is GuestShelfItem[] => GuestShelfItems.safeParse(value).success,
});

const listeners = new Set<() => void>();

const items = {
  read: store.read,
  write: (value: GuestShelfItem[]) => {
    store.write(value);
    listeners.forEach((listener) => listener());
  },
  clear: () => {
    store.clear();
    listeners.forEach((listener) => listener());
  },
};

/** 비로그인 선반이 바뀌면 알린다. 같은 화면의 다른 버튼이 담김 표시를 맞추는 데 쓴다. */
export const subscribeGuestShelf = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** 이 세션에서 비로그인 안내 시트(잠시 담아 뒀어요)를 이미 띄웠는지. */
const noticeShown = createSessionStore<boolean>("poudy.guest-shelf-notice", {
  version: 1,
  fallback: false,
  isValid: (value: unknown): value is boolean => typeof value === "boolean",
});

/** 최근에 담은 것부터 둔다. */
export const readGuestShelf = (): readonly GuestShelfItem[] => items.read();

export const findGuestShelfItem = (productId: number): GuestShelfItem | undefined =>
  items.read().find((item) => item.product.id === productId);

/** 담거나 고친다. 이미 있는 제품이면 담은 시각을 그대로 두고 자리도 지킨다. */
export const putGuestShelfItem = (item: GuestShelfItem): void => {
  const current = items.read();
  if (current.some((saved) => saved.product.id === item.product.id)) {
    items.write(current.map((saved) => (saved.product.id === item.product.id ? item : saved)));
    return;
  }
  items.write([item, ...current]);
};

export const removeGuestShelfItem = (productId: number): void => {
  items.write(items.read().filter((item) => item.product.id !== productId));
};

export const clearGuestShelf = (): void => {
  items.clear();
  noticeShown.clear();
};

export const hasShownGuestShelfNotice = (): boolean => noticeShown.read();

export const rememberGuestShelfNoticeShown = (): void => noticeShown.write(true);
