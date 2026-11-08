import {
  type ExplorationProperties,
  type FeatureFlow,
  type ProductEntryPoint,
  type ProductFeatureContext,
  productEntryPointOf,
} from "./events";
import { isFeatureFlow } from "./feature-flow";

const STORAGE_KEY = "poudy:product-entry";
const MAX_AGE = 30 * 60 * 1000;

/** 수집용 링크는 표준 주소로 두고, 같은 탭에서 선택한 유입 경로만 잠시 보관한다. */
const saveEntry = (
  productId: number,
  entryPoint: ProductEntryPoint,
  context: { readonly exploration?: ExplorationProperties; readonly feature?: ProductFeatureContext },
): void => {
  try {
    window.sessionStorage.setItem(
      `${STORAGE_KEY}:${productId}`,
      JSON.stringify({ productId, entryPoint, ...context, at: Date.now() }),
    );
  } catch {
    // 저장소가 차단된 환경에서도 제품 이동은 계속한다.
  }
};

export const rememberProductEntry = (
  productId: number,
  entryPoint: ProductEntryPoint,
  exploration?: ExplorationProperties,
): void => saveEntry(productId, entryPoint, { exploration });
export const rememberFeatureProductEntry = (
  productId: number,
  entryPoint: ProductEntryPoint,
  feature: ProductFeatureContext,
): void => saveEntry(productId, entryPoint, { feature });

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
    ...("filter_flow_id" in value && typeof value.filter_flow_id === "string"
      ? { filter_flow_id: value.filter_flow_id }
      : {}),
  };
};

const optionalNumber = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
const optionalString = (value: unknown) => (typeof value === "string" && value.length <= 100 ? value : undefined);
const featureProperties = (feature: FeatureFlow): ProductFeatureContext => ({
  feature_flow_id: feature.feature_flow_id,
  feature_source: feature.feature_source,
  entry_source: feature.entry_source,
  base_product_id: optionalNumber("base_product_id" in feature ? feature.base_product_id : undefined),
  base_part_id: optionalNumber("base_part_id" in feature ? feature.base_part_id : undefined),
  target_part_id: optionalNumber("target_part_id" in feature ? feature.target_part_id : undefined),
  routine_id: optionalNumber("routine_id" in feature ? feature.routine_id : undefined),
  channel_id: optionalString("channel_id" in feature ? feature.channel_id : undefined),
  video_id: optionalString("video_id" in feature ? feature.video_id : undefined),
});

/** 실제로 선택한 제품에만 새 기능의 유입 문맥을 이어 붙인다. */
export const readProductFeature = (productId: number): ProductFeatureContext | undefined => {
  try {
    if (window.location.pathname !== `/products/${productId}`) return undefined;
    const value: unknown = JSON.parse(window.sessionStorage.getItem(`${STORAGE_KEY}:${productId}`) ?? "null");
    if (
      typeof value !== "object" ||
      value === null ||
      !("productId" in value) ||
      value.productId !== productId ||
      !("at" in value) ||
      typeof value.at !== "number" ||
      !Number.isFinite(value.at) ||
      Date.now() < value.at ||
      Date.now() - value.at > MAX_AGE ||
      !("feature" in value) ||
      !isFeatureFlow(value.feature)
    )
      return undefined;
    return featureProperties(value.feature);
  } catch {
    return undefined;
  }
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
