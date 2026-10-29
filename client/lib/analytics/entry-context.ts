export type EntryNavigationType = "navigate" | "reload" | "back_forward" | "prerender" | "unknown";

export type InAppBrowser = "kakaotalk" | "instagram" | "facebook" | "naver" | "line" | "daum" | "band" | "none";

export type EntryContext = {
  readonly entry_navigation_type: EntryNavigationType;
  readonly entry_history_length: number;
  readonly in_app_browser: InAppBrowser;
  readonly display_standalone: boolean;
  readonly webdriver: boolean;
};

const NAVIGATION_TYPES: readonly EntryNavigationType[] = ["navigate", "reload", "back_forward", "prerender"];

const IN_APP_BROWSERS: readonly (readonly [InAppBrowser, RegExp])[] = [
  ["kakaotalk", /KAKAOTALK/i],
  ["instagram", /Instagram/],
  ["facebook", /FBAN|FBAV|FB_IAB/],
  ["naver", /NAVER\(inapp/],
  ["line", /\bLine\//],
  ["daum", /DaumApps/],
  ["band", /\bBAND\//],
];

const navigationTypeOf = (entries: readonly PerformanceEntry[]): EntryNavigationType => {
  const type = entries.find((entry): entry is PerformanceNavigationTiming => "type" in entry)?.type;

  return NAVIGATION_TYPES.find((known) => known === type) ?? "unknown";
};

export const inAppBrowserOf = (userAgent: string): InAppBrowser =>
  IN_APP_BROWSERS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? "none";

const isStandalone = (): boolean => {
  if ("standalone" in navigator && navigator.standalone === true) return true;

  return window.matchMedia?.("(display-mode: standalone)").matches === true;
};

const readEntryContext = (): EntryContext => ({
  entry_navigation_type: navigationTypeOf(window.performance?.getEntriesByType?.("navigation") ?? []),
  entry_history_length: window.history.length,
  in_app_browser: inAppBrowserOf(navigator.userAgent),
  display_standalone: isStandalone(),
  webdriver: navigator.webdriver === true,
});

let remembered: EntryContext | undefined;

/** 문서가 열린 순간의 값이다. SPA 이동으로 history.length 가 늘기 전에 한 번 읽어 둔다. */
export const entryContext = (): EntryContext => {
  if (!remembered) remembered = readEntryContext();

  return remembered;
};
