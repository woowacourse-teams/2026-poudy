/**
 * 이벤트 이름과 속성을 타입으로 고정한다.
 * 화면에 문자열을 흩어 두면 오타가 조용히 지나가고 나중에 이름을 바꾸기 어렵다.
 *
 * 자세한 배경은 docs/exec-plans/analytics-events.md 를 본다.
 */

export type PageName =
  "home" | "search" | "product_list" | "product_detail" | "ingredient_detail" | "saved" | "category" | "brand";

export type FilterType = "ingredient" | "category" | "brand" | "moisture_oil" | "quick_filter";

export type SearchMode = "product" | "ingredient";

export const PRODUCT_ENTRY_POINTS = [
  "search_results",
  "suggestion",
  "home",
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
  page_viewed: { page: PageName };
  /** 검색 화면에서 첫 유효 입력이나 첫 성분 조건 조작이 일어났을 때 한 번만 남긴다. */
  search_started: { mode: SearchMode };
  /**
   * 검색어를 그대로 남긴다. 무엇을 찾는지 알아야 어떤 제품·성분을 채울지 정할 수 있다.
   * 길이도 함께 남겨 검색어 없이도 집계할 수 있게 둔다.
   */
  search_used: { mode: "product" | "ingredient"; query: string; query_length: number; result_count: number };
  /** 검색 결과가 실제로 화면에 반영된 뒤 남긴다. 0건도 결과로 기록한다. */
  search_results_viewed: {
    mode: SearchMode;
    query?: string;
    result_count: number;
    include_count: number;
    exclude_count: number;
    exclude_group_count: number;
  };
  /** 어떤 검색어에서 무엇을 골랐는지 남겨야 자동완성이 쓸모 있는지 알 수 있다. */
  search_suggestion_selected: {
    mode: "product" | "ingredient";
    query: string;
    position: number;
    product_id?: number;
    ingredient_id?: number;
  };
  /** 자동완성을 고르지 않고 검색어로 목록 전체를 열었을 때. 자동완성과 비율을 견준다. */
  search_submitted: { mode: "product" | "ingredient"; query: string; result_count: number };
  filter_applied: { filter_type: FilterType; filter_value_count: number };
  filter_reset: { filter_type: FilterType };
  sort_applied: { sort: string };
  product_viewed: { product_id: number; category?: string; entry_point: ProductEntryPoint };
  product_saved: { product_id: number; save_source: SaveSource };
  product_unsaved: { product_id: number; save_source: SaveSource };
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
  /** 검색 화면의 최근 검색 항목을 다시 눌렀을 때. */
  recent_search_used: { position: number; product_id: number };
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
