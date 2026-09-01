import type { ShareMatchResponse } from "@poudy/api/api.zod";

import { apiGet } from "./client";

/** 앱이 공유 텍스트를 그대로 넘긴다. 정제와 제품 확정은 서버가 맡는다. */
export const fetchShareMatch = (text: string): Promise<ShareMatchResponse> =>
  apiGet("/api/products/share-matches", new URLSearchParams({ text }));
