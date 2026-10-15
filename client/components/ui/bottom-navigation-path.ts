import type { BottomNavigationTab } from "@poudy/design-system/bottom-navigation";

const EXACT_BOTTOM_NAVIGATION_PATHS = ["/", "/privacy", "/terms", "/wishlist", "/my-page"] as const;
const BOTTOM_NAVIGATION_SEGMENTS = [
  "/brands",
  "/categories",
  "/ingredient-groups",
  "/ingredients",
  "/products",
  "/search",
  "/shelf",
] as const;

export const matchesPathSegment = (pathname: string, segment: string): boolean =>
  pathname === segment || pathname.startsWith(`${segment}/`);

export const isBottomNavigationPath = (pathname: string): boolean =>
  EXACT_BOTTOM_NAVIGATION_PATHS.some((path) => pathname === path) ||
  BOTTOM_NAVIGATION_SEGMENTS.some((segment) => matchesPathSegment(pathname, segment));

/*
 * 경로가 속한 탭. 옛 내비의 판정을 옮겼다. 저장함(/wishlist)은 선반으로 바뀌어 탭이 아니다. 화면은 남아 있어 내비는
 * 보이지만 고른 탭이 없다. 선반 화면(/shelf)은 아직 없고(#738) 들어오면 이 판정으로 선반 탭이 켜진다.
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
] as const;

export const isBottomActionBarPath = (pathname: string): boolean =>
  BOTTOM_ACTION_BAR_PATHS.some((path) => pathname === path);
