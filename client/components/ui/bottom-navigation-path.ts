import type { BottomNavigationItem } from "@poudy/design-system/bottom-navigation";

export type BottomNavigationTab = "home" | "category" | "explore" | "shelf" | "my";

/**
 * 하단 내비의 탭 다섯 칸(명세 APP · 하단 내비게이션). 탭 구성과 주소는 앱의 정보 구조라 여기서 정한다.
 * 탐색 탭은 제품 탐색부터 연다.
 */
export const BOTTOM_NAVIGATION_TABS = [
  { key: "home", label: "홈", icon: "home", href: "/" },
  { key: "category", label: "카테고리", icon: "category", href: "/categories" },
  { key: "explore", label: "탐색", icon: "search", href: "/search/products" },
  { key: "shelf", label: "선반", icon: "archive", href: "/shelf" },
  { key: "my", label: "마이", icon: "user", href: "/my-page" },
] as const satisfies readonly BottomNavigationItem<BottomNavigationTab>[];

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

/**
 * 제품 상세(/products/123). 위시리스트와 선반에 저장을 하단 고정 행동 바에 두고 하단 내비는 숨긴다(S60 ④).
 * 저장 버튼과 내비를 함께 두지 않는다. 조건 일치 제품 목록(/products)은 내비를 그대로 둔다.
 */
export const isProductDetailPath = (pathname: string): boolean => /^\/products\/\d+$/.test(pathname);

export const isBottomNavigationPath = (pathname: string): boolean =>
  !isProductDetailPath(pathname) &&
  (EXACT_BOTTOM_NAVIGATION_PATHS.some((path) => pathname === path) ||
    BOTTOM_NAVIGATION_SEGMENTS.some((segment) => matchesPathSegment(pathname, segment)));

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
  "/my-page/profile",
  "/my-page/gender",
  "/my-page/age-range",
  "/my-page/skin-type",
  "/my-page/withdraw",
  "/shelf/add",
  "/shelf/filter",
  "/shelf/guide",
] as const;

export const isBottomActionBarPath = (pathname: string): boolean =>
  isProductDetailPath(pathname) || BOTTOM_ACTION_BAR_PATHS.some((path) => pathname === path);
