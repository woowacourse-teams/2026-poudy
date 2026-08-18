/**
 * 이벤트 이름과 속성을 타입으로 고정한다.
 * 화면에 문자열을 흩어 두면 오타가 조용히 지나가고 나중에 이름을 바꾸기 어렵다.
 *
 * 자세한 배경은 docs/exec-plans/analytics-events.md 를 본다.
 */

export type PageName =
  "home" | "search" | "product_list" | "product_detail" | "ingredient_detail" | "saved" | "category" | "brand";

export type FilterType = "ingredient" | "category" | "brand" | "moisture_oil" | "quick_filter";

/** 저장 버튼이 여러 화면에 있어 어디서 눌렀는지 남긴다. */
export type SaveSource = "product_list" | "product_detail" | "home" | "saved";

export type EventMap = {
  page_viewed: { page: PageName };
  /** 검색어 자체는 보내지 않는다. 개인정보가 담길 수 있어 길이만 남긴다. */
  search_used: { mode: "product" | "ingredient"; query_length: number; result_count: number };
  search_suggestion_selected: { mode: "product" | "ingredient"; position: number };
  filter_applied: { filter_type: FilterType; filter_value_count: number; result_count: number };
  filter_reset: { filter_type: FilterType };
  sort_applied: { sort: string };
  product_viewed: { product_id: number; category?: string };
  product_saved: { product_id: number; save_source: SaveSource };
  product_unsaved: { product_id: number; save_source: SaveSource };
  ingredient_viewed: {
    ingredient_id: number;
    entry_point: "product_detail" | "search" | "ingredient_filter";
  };
  error_occurred: { error_code: string; surface: string };
};

export type EventName = keyof EventMap;
