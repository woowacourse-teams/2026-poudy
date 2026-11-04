import {
  type RoutineCreateRequest,
  type RoutineProductsRequest,
  RoutineResponse,
  RoutinesResponse,
  SharedRoutinePageResponse,
  SharedRoutineResponse,
  type RoutineUpdateRequest,
} from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPostFor, apiPutFor } from "./client";

const PATH = "/api/users/me/routines";

/** 내 루틴 전부를 최근 만든 순으로 받는다. */
export const fetchMyRoutines = (): Promise<RoutinesResponse> => apiGet(PATH, RoutinesResponse, { withSession: true });

/**
 * 내 루틴 하나를 메모와 함께 받는다. 남의 루틴이나 없는 루틴이면 ROUTINE_NOT_FOUND 로 실패한다.
 * 상세 화면은 실패하면 공개 루틴으로 다시 열므로, 그때의 401·404 를 오류로 남기지 않게 reportErrors 를 끈다.
 */
export const fetchMyRoutine = (
  routineId: number,
  { reportErrors = true }: { readonly reportErrors?: boolean } = {},
): Promise<RoutineResponse> => apiGet(`${PATH}/${routineId}`, RoutineResponse, { withSession: true, reportErrors });

/** 루틴을 만든다. 아침·저녁 제품은 비워 보낼 수 있다. */
export const createRoutine = (request: RoutineCreateRequest): Promise<RoutineResponse> =>
  apiPostFor(PATH, RoutineResponse, request);

/** 이름·메모·공개 여부를 통째로 바꾼다. 메모를 비우면 지운다. */
export const updateRoutine = (routineId: number, request: RoutineUpdateRequest): Promise<RoutineResponse> =>
  apiPutFor(`${PATH}/${routineId}`, RoutineResponse, request);

export const deleteRoutine = (routineId: number): Promise<void> => apiDelete(`${PATH}/${routineId}`);

/** 아침·저녁 제품을 바르는 순서대로 통째로 바꾼다. 추가·빼기·순서 변경·구간 이동을 모두 이것으로 한다. */
export const replaceRoutineProducts = (routineId: number, request: RoutineProductsRequest): Promise<RoutineResponse> =>
  apiPutFor(`${PATH}/${routineId}/products`, RoutineResponse, request);

/** 제품이 있는 공개 루틴을 최신순으로 받는다. 로그인하지 않아도 된다. */
export const fetchSharedRoutines = (page: number): Promise<SharedRoutinePageResponse> =>
  apiGet("/api/routines", SharedRoutinePageResponse, { query: new URLSearchParams({ page: String(page) }) });

/** 공개 루틴 하나를 받는다. 메모는 없다. 비공개 루틴이면 ROUTINE_NOT_FOUND 로 실패한다. */
export const fetchSharedRoutine = (routineId: number): Promise<SharedRoutineResponse> =>
  apiGet(`/api/routines/${routineId}`, SharedRoutineResponse);

/** 공개 루틴을 내 루틴으로 복사한다. 만든 내 루틴을 돌려준다. */
export const importRoutine = (routineId: number): Promise<RoutineResponse> =>
  apiPostFor(`${PATH}/imports`, RoutineResponse, { routineId });
