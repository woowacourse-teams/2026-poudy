const EXACT_BOTTOM_NAVIGATION_PATHS = ["/", "/privacy", "/saved", "/terms"] as const;
const BOTTOM_NAVIGATION_SEGMENTS = ["/brands", "/categories", "/ingredients", "/products", "/search"] as const;

export const matchesPathSegment = (pathname: string, segment: string): boolean =>
  pathname === segment || pathname.startsWith(`${segment}/`);

export const isBottomNavigationPath = (pathname: string): boolean =>
  EXACT_BOTTOM_NAVIGATION_PATHS.some((path) => pathname === path) ||
  BOTTOM_NAVIGATION_SEGMENTS.some((segment) => matchesPathSegment(pathname, segment));
