import { type ExplorationProperties, type ProductEntryPoint, productEntryPointOf } from "./events";

const STORAGE_KEY = "poudy:product-entry";
const MAX_AGE = 30 * 60 * 1000;

/** 수집용 링크는 표준 주소로 두고, 같은 탭에서 선택한 유입 경로만 잠시 보관한다. */
export const rememberProductEntry = (
  productId: number,
  entryPoint: ProductEntryPoint,
  exploration?: ExplorationProperties,
): void => {
  try {
    window.sessionStorage.setItem(
      `${STORAGE_KEY}:${productId}`,
      JSON.stringify({ productId, entryPoint, exploration, at: Date.now() }),
    );
  } catch {
    // 저장소가 차단된 환경에서도 제품 이동은 계속한다.
  }
};

export const readProductEntry = (productId: number, fallback: ProductEntryPoint): ProductEntryPoint => {
  if (fallback !== "direct") return fallback;
  try {
    if (window.location.pathname !== `/products/${productId}`) return fallback;
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(`${STORAGE_KEY}:${productId}`) ?? "null");
    if (typeof raw !== "object" || raw === null) return fallback;
    if (!("productId" in raw) || raw.productId !== productId || !("at" in raw) || typeof raw.at !== "number")
      return fallback;
    if (Date.now() - raw.at < 0 || Date.now() - raw.at > MAX_AGE || !("entryPoint" in raw)) return fallback;
    return productEntryPointOf(raw.entryPoint);
  } catch {
    return fallback;
  }
};

const explorationOf = (value: unknown): ExplorationProperties | undefined => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("exploration_id" in value) ||
    typeof value.exploration_id !== "string" ||
    !("my_filter_applied" in value) ||
    typeof value.my_filter_applied !== "boolean" ||
    !("my_filter_ingredient_count" in value) ||
    typeof value.my_filter_ingredient_count !== "number" ||
    !Number.isInteger(value.my_filter_ingredient_count) ||
    value.my_filter_ingredient_count < 0
  )
    return undefined;
  return {
    exploration_id: value.exploration_id,
    my_filter_applied: value.my_filter_applied,
    my_filter_ingredient_count: value.my_filter_ingredient_count,
  };
};

/** 링크를 실제로 누른 제품에만 그 목록의 개인화 적용 상태를 이어 붙인다. */
export const readProductExploration = (productId: number): ExplorationProperties | undefined => {
  try {
    if (window.location.pathname !== `/products/${productId}`) return undefined;
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(`${STORAGE_KEY}:${productId}`) ?? "null");
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("productId" in raw) ||
      raw.productId !== productId ||
      !("at" in raw) ||
      typeof raw.at !== "number" ||
      Date.now() < raw.at ||
      Date.now() - raw.at > MAX_AGE ||
      !("exploration" in raw)
    )
      return undefined;
    return explorationOf(raw.exploration);
  } catch {
    return undefined;
  }
};
