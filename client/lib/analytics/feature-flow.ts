import type { FeatureFlow, FeatureName } from "./events";
import { createAnalyticsId } from "./shelf-journey";

const PREFIX = "poudy.feature-flow.v1:";
const MAX_AGE = 60 * 60 * 1000;
const FEATURES: readonly FeatureName[] = ["routine", "similar_products", "youtube"];

export const isFeatureFlow = (value: unknown): value is FeatureFlow =>
  typeof value === "object" &&
  value !== null &&
  "feature_flow_id" in value &&
  typeof value.feature_flow_id === "string" &&
  value.feature_flow_id.length > 0 &&
  value.feature_flow_id.length <= 100 &&
  "feature_source" in value &&
  FEATURES.some((feature) => feature === value.feature_source) &&
  "entry_source" in value &&
  typeof value.entry_source === "string" &&
  value.entry_source.length <= 60;

export const newFeatureFlow = (feature: FeatureName, source: string): FeatureFlow => ({
  feature_flow_id: createAnalyticsId(),
  feature_source: feature,
  entry_source: source,
});

/** 로그인 왕복과 같은 탭의 상세 이동만 연결한다. 입력한 이름·메모는 보관하지 않는다. */
export const rememberFeatureFlow = (feature: FeatureName, target: string | number, flow: FeatureFlow): void => {
  try {
    window.sessionStorage.setItem(`${PREFIX}${feature}:${target}`, JSON.stringify({ flow, at: Date.now() }));
  } catch {
    /* 저장소가 막혀도 제품 기능은 계속한다. */
  }
};

export const readFeatureFlow = (feature: FeatureName, target: string | number): FeatureFlow | undefined => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(`${PREFIX}${feature}:${target}`) ?? "null");
    if (
      typeof value !== "object" ||
      value === null ||
      !("at" in value) ||
      typeof value.at !== "number" ||
      !Number.isFinite(value.at) ||
      Date.now() < value.at ||
      Date.now() - value.at > MAX_AGE ||
      !("flow" in value) ||
      !isFeatureFlow(value.flow) ||
      value.flow.feature_source !== feature
    )
      return undefined;
    return value.flow;
  } catch {
    return undefined;
  }
};

export const featureFlowFor = (feature: FeatureName, target: string | number): FeatureFlow => {
  const previous = readFeatureFlow(feature, target);
  if (previous) return previous;
  const flow = newFeatureFlow(feature, "direct");
  rememberFeatureFlow(feature, target, flow);
  return flow;
};
