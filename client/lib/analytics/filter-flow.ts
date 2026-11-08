import type { Filter } from "@/lib/domain/filter";

const KEY = "poudy.filter-flow.v1";
const MAX_AGE = 30 * 60 * 1000;
export type FilterFlow = {
  readonly filter_flow_id: string;
  readonly mark_group: string;
  readonly mark_codes: readonly string[];
};
const filterKey = (filter: Filter): string =>
  JSON.stringify(
    Object.entries(filter)
      .filter(([key]) => !["page", "size", "sort"].includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : value]),
  );

export const rememberFilterFlow = (filter: Filter, flow: FilterFlow): void => {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ key: filterKey(filter), flow, at: Date.now() }));
  } catch {
    /* 저장소가 막혀도 필터는 적용한다. */
  }
};

const filterFlowOf = (flow: unknown): FilterFlow | undefined => {
  if (
    typeof flow !== "object" ||
    flow === null ||
    !("filter_flow_id" in flow) ||
    typeof flow.filter_flow_id !== "string" ||
    !("mark_group" in flow) ||
    typeof flow.mark_group !== "string" ||
    !("mark_codes" in flow) ||
    !Array.isArray(flow.mark_codes) ||
    !flow.mark_codes.every((code: unknown) => typeof code === "string")
  )
    return undefined;
  return { filter_flow_id: flow.filter_flow_id, mark_group: flow.mark_group, mark_codes: flow.mark_codes };
};

export const readFilterFlow = (filter: Filter): FilterFlow | undefined => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null");
    if (
      typeof value !== "object" ||
      value === null ||
      !("key" in value) ||
      value.key !== filterKey(filter) ||
      !("at" in value) ||
      typeof value.at !== "number" ||
      !Number.isFinite(value.at) ||
      Date.now() < value.at ||
      Date.now() - value.at > MAX_AGE ||
      !("flow" in value)
    )
      return undefined;
    return filterFlowOf(value.flow);
  } catch {
    return undefined;
  }
};
