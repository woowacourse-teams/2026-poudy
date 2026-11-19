import type { BottomNavigationItem } from "@poudy/design-system/bottom-navigation";

export type BottomNavigationTab = "home" | "category" | "shelf" | "routine" | "my";

/**
 * 하단 내비의 탭 다섯 칸(명세 APP · 하단 내비게이션 · 루틴 활성, 파우치 활성). 탭 구성과 주소는 앱의 정보 구조라 여기서 정한다.
 * 검색은 탭이 아니라 상단 내비의 검색 버튼으로 연다.
 */
export const BOTTOM_NAVIGATION_TABS = [
  { key: "home", label: "홈", icon: "home", href: "/" },
  { key: "category", label: "카테고리", icon: "category", href: "/categories" },
  { key: "shelf", label: "파우치", icon: "vanity-case", href: "/pouch" },
  { key: "routine", label: "루틴", icon: "sun-moon", href: "/routines" },
  { key: "my", label: "마이", icon: "user", href: "/my-page" },
] as const satisfies readonly BottomNavigationItem<BottomNavigationTab>[];

/*
 * 하단 내비는 depth 1까지만 보인다(NAV 노출 기준, #1239). 탭의 첫 화면과 그 탭 안에서 목록을 둘러보는 화면에서만 그린다.
 * - 보임: 홈, 유튜버 목록, 조건 일치 제품(/products), 카테고리·브랜드와 그 아래 제품 목록, 파우치, 루틴 탭(내 루틴 줄 · 둘러보기), 마이
 * - 숨김: 제품·성분·성분군·유튜버·루틴 상세와 내 루틴 전체 보기(/routines/my)처럼 하나에 집중하는 화면, 검색(/search) · 필터 편집 · 평가 · 가입 같은 작업 흐름,
 *   약관 같은 문서 화면. 키보드가 올라와 있는 동안은 부품(BottomNavigation)이 숨긴다.
 */
const EXACT_BOTTOM_NAVIGATION_PATHS = ["/", "/youtubers", "/products", "/pouch", "/routines", "/my-page"] as const;
/** 카테고리 탭은 디렉터리(/categories, /brands)와 그 아래 제품 목록(/categories/1, /brands/1)이 모두 목록이라 하위 경로까지 보인다. */
const BOTTOM_NAVIGATION_SEGMENTS = ["/categories", "/brands"] as const;

export const matchesPathSegment = (pathname: string, segment: string): boolean =>
  pathname === segment || pathname.startsWith(`${segment}/`);

/**
 * 제품 상세(/products/123). 비교함과 파우치에 저장을 하단 고정 행동 바에 두고 하단 내비는 숨긴다(S60 ④).
 * 저장 버튼과 내비를 함께 두지 않는다. 조건 일치 제품 목록(/products)은 내비를 그대로 둔다.
 */
export const isProductDetailPath = (pathname: string): boolean => /^\/products\/\d+$/.test(pathname);

/**
 * 루틴 상세(/routines/12)와 그 아래 제품 추가(/routines/12/add) · 댓글(/routines/12/comments). 하단 내비를 숨긴다.
 * 다른 사람 루틴의 '내 루틴으로 가져오기', 제품 추가 버튼, 댓글 입력창은 화면 끝에 붙는다(RT6 · RT12).
 */
const isRoutineDetailPath = (pathname: string): boolean => /^\/routines\/\d+(\/(add|comments))?$/.test(pathname);

/** 제품 목록(/products, /categories/1, /brands/1). 담은 제품이 있으면 하단 내비 위에 비교함 띠를 띄운다. */
export const isProductListPath = (pathname: string): boolean =>
  pathname === "/products" || /^\/(categories|brands)\/\d+$/.test(pathname);

export const isBottomNavigationPath = (pathname: string): boolean =>
  EXACT_BOTTOM_NAVIGATION_PATHS.some((path) => pathname === path) ||
  BOTTOM_NAVIGATION_SEGMENTS.some((segment) => matchesPathSegment(pathname, segment));

/*
 * 경로가 속한 탭. 옛 내비의 판정을 옮겼다. 파우치의 하위 화면(/pouch/add 등)과 마이 아래 화면(/my-page/profile 등)은
 * 내비를 숨기지만, 판정은 각각 파우치 탭과 마이 탭으로 둔다.
 */
const TAB_SEGMENTS: readonly (readonly [BottomNavigationTab, readonly string[]])[] = [
  ["category", ["/categories", "/brands"]],
  ["shelf", ["/pouch"]],
  ["routine", ["/routines"]],
  ["my", ["/my-page"]],
];

export const bottomNavigationTabOf = (pathname: string): BottomNavigationTab | null => {
  if (pathname === "/" || matchesPathSegment(pathname, "/youtubers")) return "home";
  const found = TAB_SEGMENTS.find(([, segments]) => segments.some((segment) => matchesPathSegment(pathname, segment)));
  return found?.[0] ?? null;
};

const BOTTOM_ACTION_BAR_PATHS = [
  "/search/ingredients",
  "/my-page/profile",
  "/my-page/gender",
  "/my-page/age-range",
  "/my-page/skin-type",
  "/my-page/withdraw",
  "/pouch/filter",
  "/pouch/guide",
] as const;

export const isBottomActionBarPath = (pathname: string): boolean =>
  isProductDetailPath(pathname) ||
  isRoutineDetailPath(pathname) ||
  BOTTOM_ACTION_BAR_PATHS.some((path) => pathname === path);
