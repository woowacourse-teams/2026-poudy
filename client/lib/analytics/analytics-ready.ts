import type { PostHog } from "posthog-js";

export type AnalyticsSession = Pick<PostHog, "onSessionId" | "get_session_id">;
type Listener = (client: AnalyticsSession) => () => void;

let readyClient: AnalyticsSession | undefined;
const listeners = new Set<(client: AnalyticsSession) => void>();

/** SDK를 앞당겨 로드하지 않고, 실제 클라이언트가 준비된 뒤에만 측정한다. */
export const afterAnalyticsReady = (start: Listener): (() => void) => {
  let stop: (() => void) | undefined;
  const ready = (client: AnalyticsSession) => {
    stop?.();
    stop = start(client);
  };
  listeners.add(ready);
  if (readyClient) ready(readyClient);
  return () => {
    listeners.delete(ready);
    stop?.();
  };
};

export const analyticsReady = (client: AnalyticsSession): void => {
  readyClient = client;
  listeners.forEach((ready) => ready(client));
};
