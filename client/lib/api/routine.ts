import {
  type RoutineCreateRequest,
  RoutineResponse,
  RoutinesResponse,
  type RoutineUpdateRequest,
} from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPostFor, apiPutFor } from "./client";

const PATH = "/api/users/me/routines";

/** 내 루틴 전부를 최근 만든 순으로 받는다. */
export const fetchMyRoutines = (): Promise<RoutinesResponse> => apiGet(PATH, RoutinesResponse, { withSession: true });

/** 내 루틴 하나를 메모와 함께 받는다. 남의 루틴이나 없는 루틴이면 ROUTINE_NOT_FOUND 로 실패한다. */
export const fetchMyRoutine = (routineId: number): Promise<RoutineResponse> =>
  apiGet(`${PATH}/${routineId}`, RoutineResponse, { withSession: true });

/** 루틴을 만든다. 아침·저녁 제품은 비워 보낼 수 있다. */
export const createRoutine = (request: RoutineCreateRequest): Promise<RoutineResponse> =>
  apiPostFor(PATH, RoutineResponse, request);

/** 이름·메모·공개 여부를 통째로 바꾼다. 메모를 비우면 지운다. */
export const updateRoutine = (routineId: number, request: RoutineUpdateRequest): Promise<RoutineResponse> =>
  apiPutFor(`${PATH}/${routineId}`, RoutineResponse, request);

export const deleteRoutine = (routineId: number): Promise<void> => apiDelete(`${PATH}/${routineId}`);
