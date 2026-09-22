/**
 * 이벤트 이름과 속성을 타입으로 고정한다.
 * 화면에 문자열을 흩어 두면 오타가 조용히 지나가고 나중에 이름을 바꾸기 어렵다.
 *
 * 자세한 배경은 docs/exec-plans/analytics-events.md 를 본다.
 */

export type PageName =
  "home" | "search" | "product_list" | "product_detail" | "ingredient_detail" | "saved" | "category" | "brand";

export type FilterType = "ingredient" | "category" | "brand" | "moisture_oil" | "quick_filter" | "skin_type";

export type SearchMode = "product" | "ingredient";

/** 검색과 카테고리 탐색을 서로 다른 퍼널로 나누는 값. */
export type DiscoveryMethod = "search" | "category";

/** 탐색을 시작한 화면. */
export type DiscoveryOrigin = "home" | "search" | "category";

/** 같은 탐색 안에서 발생한 결과·상세·보관 이벤트를 이어 붙인다. */
export type DiscoveryContext = {
  discovery_id: string;
  discovery_method: DiscoveryMethod;
  origin_surface: DiscoveryOrigin;
};

export type DiscoveryProperties = Partial<DiscoveryContext>;

/** 피부 타입 코드. 조건 타입과 같은 값이지만 이벤트 정의는 스스로 서게 둔다. */
export type SkinTypeCode = "DRY" | "OILY" | "SENSITIVE" | "COMBINATION";

export const PRODUCT_ENTRY_POINTS = [
  "search_results",
  "suggestion",
  "home",
  "home_category",
  "home_ranking",
  "category",
  "brand",
  "product_list",
  "saved",
  "recent_search",
  "direct",
] as const;

export type ProductEntryPoint = (typeof PRODUCT_ENTRY_POINTS)[number];

export const productEntryPointOf = (value: unknown): ProductEntryPoint =>
  PRODUCT_ENTRY_POINTS.find((entryPoint) => entryPoint === value) ?? "direct";

/** 저장 버튼이 여러 화면에 있어 어디서 눌렀는지 남긴다. */
export type SaveSource = "product_list" | "product_detail" | "home" | "saved";

/** 성분 설명으로 들어온 경로. 링크에 붙인 from 쿼리에서 읽는다. */
export type IngredientEntryPoint = "product_detail" | "search" | "ingredient_filter";

/** 목록을 그리는 화면. 같은 ProductList 를 여러 화면이 함께 쓴다. */
export type ListSurface = "product_list" | "category" | "brand";

export type EventMap = {
  page_viewed: { page: PageName; page_version?: string };
  /** 검색 화면에서 첫 유효 입력이나 첫 성분 조건 조작이 일어났을 때 한 번만 남긴다. */
  search_started: { mode: SearchMode } & DiscoveryProperties;
  /**
   * 검색어를 그대로 남긴다. 무엇을 찾는지 알아야 어떤 제품·성분을 채울지 정할 수 있다.
   * 길이도 함께 남겨 검색어 없이도 집계할 수 있게 둔다.
   */
  search_used: {
    mode: "product" | "ingredient";
    query: string;
    query_length: number;
    result_count: number;
  } & DiscoveryProperties;
  /** 검색 결과가 실제로 화면에 반영된 뒤 남긴다. 0건도 결과로 기록한다. */
  search_results_viewed: {
    mode: SearchMode;
    query?: string;
    result_count: number;
    include_count: number;
    exclude_count: number;
    exclude_group_count: number;
  } & DiscoveryProperties;
  /** 어떤 검색어에서 무엇을 골랐는지 남겨야 자동완성이 쓸모 있는지 알 수 있다. */
  search_suggestion_selected: {
    mode: "product" | "ingredient";
    query: string;
    position: number;
    product_id?: number;
    ingredient_id?: number;
  } & DiscoveryProperties;
  /** 자동완성을 고르지 않고 검색 결과 목록 전체를 열었을 때. 자동완성과 비율을 견준다. */
  search_submitted: (
    | { mode: "product"; query: string; result_count: number }
    | {
        mode: "ingredient";
        result_count: number;
        include_count: number;
        exclude_count: number;
        exclude_group_count: number;
      }
  ) &
    DiscoveryProperties;
  filter_applied: { filter_type: FilterType; filter_value_count: number };
  filter_reset: { filter_type: FilterType };
  sort_applied: { sort: string };
  product_viewed: {
    product_id: number;
    category?: string;
    entry_point: ProductEntryPoint;
  } & DiscoveryProperties;
  product_saved: { product_id: number; save_source: SaveSource; entry_point?: ProductEntryPoint } & DiscoveryProperties;
  product_unsaved: {
    product_id: number;
    save_source: SaveSource;
    entry_point?: ProductEntryPoint;
  } & DiscoveryProperties;
  ingredient_viewed: {
    ingredient_id: number;
    entry_point: IngredientEntryPoint;
  };
  /** status 는 404 와 500 을 가른다. code 만으로는 서버가 무엇을 돌려줬는지 알기 어렵다. */
  error_occurred: { error_code: string; status: number; surface: string };

  /** 무한 스크롤로 다음 장을 불렀을 때. 탐색을 얼마나 깊이 하는지 본다. */
  product_list_scrolled: { surface: ListSurface; page: number; loaded_count: number };
  /** 조건에 맞는 제품이 없다고 표시했을 때. 어떤 조합이 막다른 길인지 본다. */
  empty_result_shown: { surface: ListSurface; condition_count: number };
  /** 제외한 성분군에 속한 성분을 포함으로 골라 경고를 띄웠을 때. */
  filter_conflict_shown: { conflict_count: number; ingredient_count: number };
  /** 홈의 최근 탐색 조건 카드를 다시 눌렀을 때. */
  recent_filter_used: { mode: "product" | "ingredient"; position: number; age_minutes: number };
  /**
   * 검색 화면의 최근 검색 항목을 다시 눌렀을 때.
   * 고른 제품으로 되돌아가는 것과 검색어로 되돌아가는 것을 갈래로 나눈다.
   */
  recent_search_used:
    | { target_type: "product"; position: number; product_id: number }
    | { target_type: "keyword"; position: number; query: string };
  /** 홈의 인기 검색어를 눌렀을 때. 접힌 줄과 펼친 목록을 가리지 않고 남긴다. */
  popular_keyword_used: { keyword: string; rank: number };
  /** 인기 검색어를 펼쳤을 때. 접힌 줄만으로 충분한지 본다. */
  popular_keywords_expanded: { rank: number };
  /** 홈의 큐레이션 카드를 눌렀을 때. */
  curation_opened: { curation_id: number; position: number };
  /** 홈의 피부 타입 빠른 메뉴를 눌렀을 때. */
  skin_type_selected: { skin_type: SkinTypeCode };
  /** 인기 제품의 카테고리 칩을 바꿨을 때. 전체는 category_id 를 두지 않는다. */
  ranking_category_changed: { category_id?: number };
  /** 카테고리를 선택해 제품 탐색을 시작했을 때. 같은 선택 안의 후속 행동과 연결한다. */
  category_selected: {
    category_id: number;
    category_name?: string;
    origin_surface: "home" | "category";
  } & DiscoveryProperties;
  /** 성분을 포함·제외 조건으로 켜고 끌 때. 어떤 성분이 실제로 쓰이는지 본다. */
  ingredient_condition_toggled:
    | {
        target_type: "ingredient";
        ingredient_id: number;
        condition: "include" | "exclude";
        action: "add" | "remove";
        surface: "ingredient_search" | "filter_sheet";
      }
    | {
        target_type: "exclude_group";
        exclude_code: string;
        condition: "exclude";
        action: "add" | "remove";
        surface: "ingredient_search" | "filter_sheet";
      };
};

export type EventName = keyof EventMap;
