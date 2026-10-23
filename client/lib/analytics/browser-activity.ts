type ActivityHandlers = {
  readonly input: () => void;
  readonly visibility: () => void;
  readonly focus: (focused: boolean) => void;
  readonly pagehide: () => void;
  readonly pageshow?: () => void;
  readonly scroll?: () => void;
};

/** 상세·전체 측정에서 같은 입력을 받고, 구독 해제 때 모두 정리한다. */
export const observeBrowserActivity = (handlers: ActivityHandlers): (() => void) => {
  const events = {
    pointerdown: handlers.input,
    pointermove: handlers.input,
    keydown: handlers.input,
    wheel: handlers.input,
    touchstart: handlers.input,
    scroll: () => {
      handlers.input();
      handlers.scroll?.();
    },
    focus: () => handlers.focus(true),
    blur: () => handlers.focus(false),
    pagehide: handlers.pagehide,
    pageshow: () => handlers.pageshow?.(),
  };
  document.addEventListener("visibilitychange", handlers.visibility);
  for (const [event, handler] of Object.entries(events)) window.addEventListener(event, handler, { passive: true });
  return () => {
    document.removeEventListener("visibilitychange", handlers.visibility);
    for (const [event, handler] of Object.entries(events)) window.removeEventListener(event, handler);
  };
};
