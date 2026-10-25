import type { AnalyticsAuthState, ShelfEntrySource, ShelfIntent } from "./events";
import { analyticsAuthState } from "./identity";

const KEY = "poudy.shelf-journey.v1";
const MAX_AGE = 60 * 60 * 1000;
const SOURCES: readonly ShelfEntrySource[] = [
  "bottom_navigation",
  "about",
  "product_detail",
  "shelf_guide",
  "product_filter",
  "direct",
];
const INTENTS: readonly ShelfIntent[] = ["view_shelf", "add_product", "view_product_filter"];
const AUTH_STATES: readonly AnalyticsAuthState[] = ["unknown", "signed_out", "signed_in", "admin"];
export type ShelfJourney = {
  readonly id: string;
  readonly source: ShelfEntrySource;
  readonly intent: ShelfIntent;
  readonly entryAuthState: AnalyticsAuthState;
  readonly productId?: number;
  readonly at: number;
  readonly loginRequested: boolean;
  readonly loginSucceeded: boolean;
  readonly completed: boolean;
};
let memory: ShelfJourney | undefined;

export const createAnalyticsId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
const valid = (value: unknown): value is ShelfJourney => {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "source" in value &&
    SOURCES.some((source) => source === value.source) &&
    "intent" in value &&
    INTENTS.some((intent) => intent === value.intent) &&
    "entryAuthState" in value &&
    AUTH_STATES.some((state) => state === value.entryAuthState) &&
    "at" in value &&
    typeof value.at === "number" &&
    Number.isFinite(value.at) &&
    (!("productId" in value) ||
      value.productId === undefined ||
      (typeof value.productId === "number" && Number.isInteger(value.productId))) &&
    "loginRequested" in value &&
    typeof value.loginRequested === "boolean" &&
    "loginSucceeded" in value &&
    typeof value.loginSucceeded === "boolean" &&
    "completed" in value &&
    typeof value.completed === "boolean"
  );
};
const save = (journey: ShelfJourney): ShelfJourney => {
  memory = journey;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(journey));
  } catch {
    /* 저장소가 막혀도 현재 화면의 계측은 이어 간다. */
  }
  return journey;
};
export const clearShelfJourney = (): void => {
  memory = undefined;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* 다음 읽기에서도 만료를 확인한다. */
  }
};
export const readShelfJourney = (): ShelfJourney | undefined => {
  if (typeof window === "undefined") return undefined;
  let value: unknown = memory;
  try {
    value = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null") ?? memory;
  } catch {
    /* 메모리로 이어 간다. */
  }
  if (!valid(value) || Date.now() < value.at || Date.now() - value.at > MAX_AGE) {
    clearShelfJourney();
    return undefined;
  }
  return value;
};
export const beginShelfJourney = ({
  source,
  intent,
  entryAuthState = analyticsAuthState(),
  productId,
}: {
  readonly source: ShelfEntrySource;
  readonly intent: ShelfIntent;
  readonly entryAuthState?: AnalyticsAuthState;
  readonly productId?: number;
}): ShelfJourney =>
  save({
    id: createAnalyticsId(),
    source,
    intent,
    entryAuthState,
    productId,
    at: Date.now(),
    loginRequested: false,
    loginSucceeded: false,
    completed: false,
  });
export const ensureShelfJourney = (intent: ShelfIntent = "view_shelf", productId?: number): ShelfJourney =>
  readShelfJourney() ?? beginShelfJourney({ source: "direct", intent, productId });
export const updateShelfJourney = (
  change: Partial<Pick<ShelfJourney, "loginRequested" | "loginSucceeded" | "completed" | "intent" | "productId">>,
): ShelfJourney | undefined => {
  const journey = readShelfJourney();
  return journey ? save({ ...journey, ...change }) : undefined;
};
export const shelfJourneyProperties = (journey = readShelfJourney()) =>
  journey
    ? {
        shelf_journey_id: journey.id,
        shelf_entry_source: journey.source,
        entry_auth_state: journey.entryAuthState,
        shelf_intent: journey.intent,
      }
    : {};
