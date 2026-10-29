import { readAppInfo } from "./app-info";
import { type EntryContext, entryContext } from "./entry-context";

import type { AppProperties } from "@/lib/types/app-info";

/** reset 은 등록한 속성을 모두 지우므로, 다시 등록할 때도 이 묶음을 그대로 쓴다. */
export const superProperties = (): AppProperties & EntryContext => ({
  ...readAppInfo(window.__POUDY_APP__),
  ...entryContext(),
});
