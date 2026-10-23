import { createActiveTimeMeter } from "@/lib/analytics/active-time";
import type { AnalyticsSession } from "@/lib/analytics/analytics-ready";
import { observeBrowserActivity } from "@/lib/analytics/browser-activity";
import type { ActiveTimeFlushReason } from "@/lib/analytics/events";
import { addServiceActiveTime, beginServiceSession, SERVICE_TIME_THRESHOLDS } from "@/lib/analytics/service-session";
import { track } from "@/lib/analytics/track";

type FlushReason = ActiveTimeFlushReason | "blur" | "session_change";

const LOCK_NAME = "poudy_service_active_time";

/** React effect에서 시작한다. 잠금을 가진, 화면이 보이는 탭만 측정한다. */
export const startServiceActiveTime = (client: AnalyticsSession, initialPathname: string) => {
  let pathname = initialPathname;
  const meter = createActiveTimeMeter({ now: () => performance.now(), visible: !document.hidden, focused: false });
  let sessionId = "";
  let unsavedSeconds = 0;
  let pendingSeconds = 0;
  let totalSeconds = 0;
  let heartbeatAt = performance.now();
  let active = true;
  let ownsLock = false;
  let lockRequest: AbortController | undefined;
  const context = () => ({
    pathname,
    $pathname: pathname,
    $current_url: new URL(pathname, window.location.origin).href,
    $session_id: sessionId,
  });

  const flush = (reason: FlushReason) => {
    if (pendingSeconds < 1) return;
    const seconds = pendingSeconds;
    pendingSeconds = 0;
    track(
      "service_active_time_recorded",
      { ...context(), active_seconds: seconds, session_active_seconds: totalSeconds, flush_reason: reason },
      { beacon: reason !== "heartbeat" },
    );
  };
  const syncSession = () => {
    const progress = beginServiceSession(sessionId);
    totalSeconds = progress.activeSeconds;
    if (progress.started) track("service_session_started", context());
  };
  const collect = (reason?: FlushReason) => {
    if (!ownsLock) return;
    unsavedSeconds += meter.take()?.active_seconds ?? 0;
    const reachedThreshold = SERVICE_TIME_THRESHOLDS.some(
      (threshold) => totalSeconds < threshold && totalSeconds + unsavedSeconds >= threshold,
    );
    if (unsavedSeconds > 0 && (reason || reachedThreshold)) {
      const { activeSeconds, reached } = addServiceActiveTime(sessionId, unsavedSeconds);
      pendingSeconds += unsavedSeconds;
      unsavedSeconds = 0;
      totalSeconds = activeSeconds;
      const properties = context();
      for (const threshold of reached) {
        track(
          "service_active_time_reached",
          { ...properties, threshold_seconds: threshold, session_active_seconds: activeSeconds },
          { beacon: reason !== undefined && reason !== "heartbeat" },
        );
      }
    }
    if (reason) flush(reason);
  };
  const pause = (reason: FlushReason) => {
    meter.setFocused(false);
    collect(reason);
    ownsLock = false;
    lockRequest?.abort();
    lockRequest = undefined;
  };
  const acquire = () => {
    if (!active || !sessionId || document.hidden || !document.hasFocus() || ownsLock || lockRequest) return;
    const request = new AbortController();
    lockRequest = request;
    const begin = () => {
      if (!active || document.hidden || !document.hasFocus()) return;
      ownsLock = true;
      syncSession();
      meter.setFocused(true);
      // 대기 중인 요청 취소와 보유 중인 잠금 해제를 같은 신호로 처리한다.
      return new Promise<void>((resolve) => request.signal.addEventListener("abort", () => resolve(), { once: true }));
    };
    if (!navigator.locks) {
      begin();
      return;
    }
    void navigator.locks.request(LOCK_NAME, { signal: request.signal }, begin).catch(() => {
      // 저장소 정책으로 Web Locks를 쓸 수 없으면 브라우저 포커스로 측정 탭을 가른다.
      if (!request.signal.aborted) return begin();
    });
  };
  const input = () => {
    meter.input();
    acquire();
  };
  const visibility = () => {
    meter.setVisible(!document.hidden);
    if (document.hidden) pause("hidden");
    else acquire();
  };
  const unsubscribe = observeBrowserActivity({
    input,
    visibility,
    focus: (focused) => (focused ? acquire() : pause("blur")),
    pagehide: () => pause("pagehide"),
    pageshow: visibility,
  });
  const unsubscribeSession = client.onSessionId((current) => {
    if (current === sessionId) return;
    collect("session_change");
    sessionId = current;
    if (ownsLock) syncSession();
    acquire();
  });
  // 매초 확인은 메모리에서만 한다. 저장은 도달·주기 전송·이탈 시점으로 제한한다.
  const timer = window.setInterval(() => {
    const now = performance.now();
    const reason = now - heartbeatAt >= 30_000 ? "heartbeat" : undefined;
    if (reason) heartbeatAt = now;
    collect(reason);
  }, 1000);
  acquire();
  const stop = () => {
    active = false;
    unsubscribeSession();
    unsubscribe();
    window.clearInterval(timer);
    pause(window.location.pathname === pathname ? "unmount" : "route_change");
  };
  const navigate = (nextPathname: string) => {
    if (nextPathname === pathname) return;
    collect("route_change");
    pathname = nextPathname;
  };
  return { stop, navigate };
};
