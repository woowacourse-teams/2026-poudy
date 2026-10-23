import { type ProductEntryPoint, productEntryPointOf } from "./events";

const STORAGE_KEY = "poudy:product-entry";
const MAX_AGE = 30 * 60 * 1000;

/** 수집용 링크는 표준 주소로 두고, 같은 탭에서 선택한 유입 경로만 잠시 보관한다. */
export const rememberProductEntry = (productId: number, entryPoint: ProductEntryPoint): void => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ productId, entryPoint, at: Date.now() }));
  } catch {
    // 저장소가 차단된 환경에서도 제품 이동은 계속한다.
  }
};

export const readProductEntry = (productId: number, fallback: ProductEntryPoint): ProductEntryPoint => {
  if (fallback !== "direct") return fallback;
  try {
    if (window.location.pathname !== `/products/${productId}`) return fallback;
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return fallback;
    if (!("productId" in raw) || raw.productId !== productId || !("at" in raw) || typeof raw.at !== "number")
      return fallback;
    if (Date.now() - raw.at < 0 || Date.now() - raw.at > MAX_AGE || !("entryPoint" in raw)) return fallback;
    return productEntryPointOf(raw.entryPoint);
  } catch {
    return fallback;
  }
};
