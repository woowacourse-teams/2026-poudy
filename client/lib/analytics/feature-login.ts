import type { FeatureFlow, FeatureIntent } from "./events";
import { isFeatureFlow, newFeatureFlow, rememberFeatureFlow } from "./feature-flow";
import { track } from "./track";

const KEY = "poudy.feature-login.v1";
const MAX_AGE = 60 * 60 * 1000;
const INTENTS: readonly FeatureIntent[] = [
  "routine_create",
  "routine_import",
  "routine_like",
  "routine_comment",
  "similar_shelf",
];
export type FeatureLogin = FeatureFlow & {
  readonly feature_source: "routine" | "similar_products";
  readonly feature_intent: FeatureIntent;
  readonly target_id?: number;
  readonly at: number;
  readonly succeeded: boolean;
};

export const isFeatureLogin = (value: unknown): value is FeatureLogin =>
  isFeatureFlow(value) &&
  (value.feature_source === "routine" || value.feature_source === "similar_products") &&
  "feature_intent" in value &&
  INTENTS.some((intent) => intent === value.feature_intent) &&
  (value.feature_source === "similar_products") === (value.feature_intent === "similar_shelf") &&
  "at" in value &&
  typeof value.at === "number" &&
  Number.isFinite(value.at) &&
  "succeeded" in value &&
  typeof value.succeeded === "boolean" &&
  (!("target_id" in value) ||
    value.target_id === undefined ||
    (typeof value.target_id === "number" && Number.isSafeInteger(value.target_id)));

export const readFeatureLogin = (): FeatureLogin | undefined => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null");
    return isFeatureLogin(value) && Date.now() >= value.at && Date.now() - value.at <= MAX_AGE ? value : undefined;
  } catch {
    return undefined;
  }
};
const save = (value: FeatureLogin): void => {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* 로그인은 저장소와 관계없이 진행한다. */
  }
};
export const featureLoginProperties = (value: FeatureLogin) => ({
  feature_flow_id: value.feature_flow_id,
  feature_source: value.feature_source,
  entry_source: value.entry_source,
  feature_intent: value.feature_intent,
  ...(value.target_id === undefined ? {} : { target_id: value.target_id }),
});
export const requestFeatureLogin = (intent: FeatureIntent, targetId?: number): void => {
  const source = intent === "similar_shelf" ? "similar_products" : "routine";
  const flow = newFeatureFlow(source, "login");
  const value: FeatureLogin = {
    ...flow,
    feature_source: source,
    feature_intent: intent,
    at: Date.now(),
    succeeded: false,
    ...(targetId === undefined ? {} : { target_id: targetId }),
  };
  save(value);
  if (source === "routine") rememberFeatureFlow(source, targetId ?? "create", flow);
  track("feature_login_requested", featureLoginProperties(value));
};
export const markFeatureLoginSucceeded = (value: FeatureLogin): void => {
  if (readFeatureLogin()?.feature_flow_id === value.feature_flow_id) save({ ...value, succeeded: true });
};
export const completeFeatureIntent = (intent: FeatureIntent, targetId?: number): void => {
  const value = readFeatureLogin();
  if (!value?.succeeded || value.feature_intent !== intent || value.target_id !== targetId) return;
  track("feature_intent_completed", featureLoginProperties(value));
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* 중복 방지는 저장소를 사용할 수 있을 때 적용한다. */
  }
};
