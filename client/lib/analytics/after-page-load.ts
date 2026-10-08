/** 화면 로딩을 우선하되, 먼저 조작하거나 화면을 숨기면 분석 로딩을 앞당긴다. */
export const afterPageLoad = (start: () => void): (() => void) => {
  const controller = new AbortController();
  const options = { once: true, passive: true, signal: controller.signal };
  let idle: number | undefined;
  let timer: number | undefined;
  const cancel = () => {
    controller.abort();
    if (idle !== undefined) window.cancelIdleCallback(idle);
    if (timer !== undefined) window.clearTimeout(timer);
  };
  const run = () => {
    cancel();
    start();
  };
  const loaded = () => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: 1000 });
    else timer = window.setTimeout(run, 0);
  };
  window.addEventListener("pointerdown", run, options);
  window.addEventListener("keydown", run, options);
  window.addEventListener("pagehide", run, options);
  const hidden = () => {
    if (document.hidden) run();
  };
  document.addEventListener("visibilitychange", hidden, { signal: controller.signal });
  if (document.readyState === "complete") loaded();
  else window.addEventListener("load", loaded, options);
  return cancel;
};
