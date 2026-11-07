import {
  type RoutineCreateRequest,
  type RoutineProductsRequest,
  RoutineResponse,
  RoutinePageResponse,
  RoutineCommentPageResponse,
  RoutineCommentResponse,
  SharedRoutineDetailResponse,
  SharedRoutinePageResponse,
  type SharedRoutineSort,
  type RoutineUpdateRequest,
} from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPostFor, apiPut, apiPutFor } from "./client";

const PATH = "/api/users/me/routines";

/** 내 루틴 한 쪽을 최근 만든 순으로 받는다. */
export const fetchMyRoutines = (page: number): Promise<RoutinePageResponse> =>
  apiGet(PATH, RoutinePageResponse, { withSession: true, query: new URLSearchParams({ page: String(page) }) });

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

/** 제품이 있는 공개 루틴을 고른 순서로 받는다. 로그인하지 않아도 된다. */
export const fetchSharedRoutines = (sort: SharedRoutineSort, page: number): Promise<SharedRoutinePageResponse> =>
  apiGet("/api/routines", SharedRoutinePageResponse, { query: new URLSearchParams({ sort, page: String(page) }) });

/**
 * 공개 루틴 하나를 메모·좋아요·댓글 미리보기와 함께 받는다. 비공개 루틴이면 ROUTINE_NOT_FOUND 로 실패한다.
 * 로그인했으면 내 좋아요 여부가 오도록 세션을 함께 보낸다.
 */
export const fetchSharedRoutine = (routineId: number): Promise<SharedRoutineDetailResponse> =>
  apiGet(`/api/routines/${routineId}`, SharedRoutineDetailResponse, { withSession: true });

/** 공개 루틴을 내 루틴으로 복사한다. 만든 내 루틴을 돌려준다. */
export const importRoutine = (routineId: number): Promise<RoutineResponse> =>
  apiPostFor(`${PATH}/imports`, RoutineResponse, { routineId });

/** 공개 루틴에 좋아요를 누른다. 이미 눌렀으면 그대로 둔다. */
export const likeRoutine = (routineId: number): Promise<void> => apiPut(`${PATH}/${routineId}/like`);

/** 좋아요를 취소한다. 누르지 않았어도 성공한다. */
export const unlikeRoutine = (routineId: number): Promise<void> => apiDelete(`${PATH}/${routineId}/like`);

/** 공개 루틴의 댓글을 오래된 순으로 받는다. 로그인했으면 내 댓글 표시가 오도록 세션을 함께 보낸다. */
export const fetchRoutineComments = (routineId: number, page: number): Promise<RoutineCommentPageResponse> =>
  apiGet(`/api/routines/${routineId}/comments`, RoutineCommentPageResponse, {
    query: new URLSearchParams({ page: String(page) }),
    withSession: true,
  });

export const writeRoutineComment = (routineId: number, content: string): Promise<RoutineCommentResponse> =>
  apiPostFor(`${PATH}/${routineId}/comments`, RoutineCommentResponse, { content });

/** 내가 쓴 댓글의 내용을 바꾼다. */
export const editRoutineComment = (commentId: number, content: string): Promise<RoutineCommentResponse> =>
  apiPutFor(`${PATH}/comments/${commentId}`, RoutineCommentResponse, { content });

/** 내가 쓴 댓글을 지운다. */
export const deleteRoutineComment = (commentId: number): Promise<void> => apiDelete(`${PATH}/comments/${commentId}`);
