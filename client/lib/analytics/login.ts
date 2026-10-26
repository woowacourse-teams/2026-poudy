"use client";

import type { UserResponse } from "@poudy/api/api.zod";

import { identifyAnalyticsMember } from "./identity";
import { createAnalyticsId, readShelfJourney, shelfJourneyProperties, updateShelfJourney } from "./shelf-journey";
import { track } from "./track";

const KEY = "poudy.login-analytics.v1";
type LoginFlow = {
  readonly id: string;
  readonly provider: "kakao" | "google";
  readonly at: number;
  readonly signup: boolean;
  readonly completed: boolean;
  readonly shelfJourneyId?: string;
};
const read = (): LoginFlow | undefined => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null");
    if (
      typeof value !== "object" ||
      value === null ||
      !("id" in value) ||
      typeof value.id !== "string" ||
      !("provider" in value) ||
      (value.provider !== "kakao" && value.provider !== "google") ||
      !("at" in value) ||
      typeof value.at !== "number" ||
      !Number.isFinite(value.at) ||
      Date.now() < value.at ||
      Date.now() - value.at > 3600000 ||
      !("signup" in value) ||
      typeof value.signup !== "boolean" ||
      !("completed" in value) ||
      typeof value.completed !== "boolean" ||
      ("shelfJourneyId" in value && typeof value.shelfJourneyId !== "string")
    )
      return undefined;
    return value as LoginFlow;
  } catch {
    return undefined;
  }
};
const save = (flow: LoginFlow): void => {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(flow));
  } catch {
    /* 저장소가 없으면 로그인 후 전환 연결을 생략한다. */
  }
};
export const startLoginAnalytics = (provider: "kakao" | "google"): void => {
  const journey = readShelfJourney();
  const flow: LoginFlow = {
    id: createAnalyticsId(),
    provider,
    at: Date.now(),
    signup: false,
    completed: false,
    ...(journey?.loginRequested ? { shelfJourneyId: journey.id } : {}),
  };
  save(flow);
  track(
    "login_started",
    { provider, login_flow_id: flow.id, login_source: flow.shelfJourneyId ? "shelf" : "other" },
    { beacon: true },
  );
};
export const markSignupAnalytics = (): void => {
  const flow = read();
  if (flow) save({ ...flow, signup: true });
};
export const completeLoginAnalytics = (member: UserResponse): void => {
  const flow = read();
  if (!flow || flow.completed) return;
  save({ ...flow, completed: true });
  identifyAnalyticsMember(member.id);
  const journey = readShelfJourney();
  const fromShelf = journey?.loginRequested && journey.id === flow.shelfJourneyId;
  if (fromShelf) updateShelfJourney({ loginSucceeded: true });
  const properties = {
    ...(fromShelf ? shelfJourneyProperties(journey) : {}),
    provider: flow.provider,
    login_flow_id: flow.id,
    login_source: fromShelf ? ("shelf" as const) : ("other" as const),
  };
  if (flow.signup) track("signup_completed", properties);
  track("login_succeeded", { ...properties, is_signup: flow.signup });
};
