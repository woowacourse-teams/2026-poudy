import type { ServiceActiveTimeThreshold } from "./events";

import { createLocalStore } from "@/lib/storage/local-store";

export const SERVICE_TIME_THRESHOLDS = [10, 30, 60] as const;

type SessionProgress = {
  readonly sessionId: string;
  readonly activeSeconds: number;
};

const isProgress = (value: unknown): value is SessionProgress | null => {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const candidate = value as Partial<SessionProgress>;
  return (
    typeof candidate.sessionId === "string" &&
    candidate.sessionId.length > 0 &&
    typeof candidate.activeSeconds === "number" &&
    Number.isSafeInteger(candidate.activeSeconds) &&
    candidate.activeSeconds >= 0
  );
};

const progress = createLocalStore<SessionProgress | null>("poudy_service_active_time", {
  version: 1,
  fallback: null,
  isValid: isProgress,
});

/** 호출한 탭이 포커스와 측정 잠금을 가진 동안만 읽고 쓴다. */
export const beginServiceSession = (sessionId: string) => {
  const previous = progress.read();
  if (previous?.sessionId === sessionId) return { started: false, activeSeconds: previous.activeSeconds };
  progress.write({ sessionId, activeSeconds: 0 });
  return { started: true, activeSeconds: 0 };
};

export const addServiceActiveTime = (sessionId: string, seconds: number) => {
  const previous = progress.read();
  const before = previous?.sessionId === sessionId ? previous.activeSeconds : 0;
  const activeSeconds = before + seconds;
  const reached: readonly ServiceActiveTimeThreshold[] = SERVICE_TIME_THRESHOLDS.filter(
    (threshold) => before < threshold && activeSeconds >= threshold,
  );
  progress.write({ sessionId, activeSeconds });
  return { activeSeconds, reached };
};
