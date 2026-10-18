import type { BottomNavigationTab } from "@poudy/design-system/bottom-navigation";

const EXACT_BOTTOM_NAVIGATION_PATHS = ["/", "/privacy", "/terms", "/my-page", "/shelf"] as const;
const BOTTOM_NAVIGATION_SEGMENTS = [
  "/brands",
  "/categories",
  "/ingredient-groups",
  "/ingredients",
  "/products",
  "/search",
] as const;

export const matchesPathSegment = (pathname: string, segment: string): boolean =>
  pathname === segment || pathname.startsWith(`${segment}/`);

export const isBottomNavigationPath = (pathname: string): boolean =>
  EXACT_BOTTOM_NAVIGATION_PATHS.some((path) => pathname === path) ||
  BOTTOM_NAVIGATION_SEGMENTS.some((segment) => matchesPathSegment(pathname, segment));

/*
 * 경로가 속한 탭. 옛 내비의 판정을 옮겼다. 선반의 하위 화면(/shelf/add 등)과 마이 아래 화면(/my-page/wishlist 등)은
 * 내비를 숨기지만, 판정은 각각 선반 탭과 마이 탭으로 둔다.
 */
const TAB_SEGMENTS: readonly (readonly [BottomNavigationTab, readonly string[]])[] = [
  ["category", ["/categories", "/brands"]],
  ["explore", ["/search", "/products", "/ingredients", "/ingredient-groups"]],
  ["shelf", ["/shelf"]],
  ["my", ["/my-page"]],
];

export const bottomNavigationTabOf = (pathname: string): BottomNavigationTab | null => {
  if (pathname === "/") return "home";
  const found = TAB_SEGMENTS.find(([, segments]) => segments.some((segment) => matchesPathSegment(pathname, segment)));
  return found?.[0] ?? null;
};

const BOTTOM_ACTION_BAR_PATHS = [
  "/my-page/gender",
  "/my-page/age-range",
  "/my-page/skin-type",
  "/my-page/withdraw",
  "/shelf/add",
  "/shelf/filter",
  "/shelf/guide",
] as const;

export const isBottomActionBarPath = (pathname: string): boolean =>
  BOTTOM_ACTION_BAR_PATHS.some((path) => pathname === path);
