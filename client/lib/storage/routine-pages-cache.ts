import type { RoutineSummaryResponse, SharedRoutineResponse } from "@poudy/api/api.zod";

import { createListCache } from "./list-cache";

/** 한 방문에서 이어 붙인 루틴 목록. 로딩·실패 표시는 복원하지 않는다. */
export type RoutinePages<T> = {
  readonly items: readonly T[];
  readonly page: number;
  readonly total: number;
  readonly hasNext: boolean;
};

/** 내 루틴은 항목을 저장하지 않고 장수와 위치만 기억한다. 다시 들어오면 인증된 응답으로 채운다. */
export const myRoutinePages = createListCache<RoutinePages<RoutineSummaryResponse>>(5);
export const sharedRoutinePages = createListCache<RoutinePages<SharedRoutineResponse>>(10);
