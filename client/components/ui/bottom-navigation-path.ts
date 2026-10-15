const EXACT_BOTTOM_NAVIGATION_PATHS = ["/", "/privacy", "/terms", "/wishlist", "/my-page"] as const;
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

const BOTTOM_ACTION_BAR_PATHS = [
  "/my-page/gender",
  "/my-page/age-range",
  "/my-page/skin-type",
  "/my-page/withdraw",
  "/shelf/filter",
] as const;

export const isBottomActionBarPath = (pathname: string): boolean =>
  BOTTOM_ACTION_BAR_PATHS.some((path) => pathname === path);
