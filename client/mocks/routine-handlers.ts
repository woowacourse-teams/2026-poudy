import {
  RoutineCreateRequest,
  RoutineImportRequest,
  RoutineProductsRequest,
  RoutineUpdateRequest,
  type RoutineResponse,
} from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";

import { allProducts } from "./fixtures";

/*
 * 루틴 목. 회원 한 명의 루틴을 메모리에 든다.
 *
 * 화면 상태를 확인하려면 쿠키 `poudy-mock-routine` 에 값을 넣는다.
 * - empty: 만든 루틴이 없음(RT1)
 * - signed-out: 로그인 전
 * - error: 루틴을 불러오지 못함
 */
type MockRoutineMode = "empty" | "signed-out" | "error" | undefined;

const mockRoutineMode = (): MockRoutineMode => {
  const cookie = globalThis.document?.cookie ?? "";
  const value = /(?:^|; )poudy-mock-routine=([^;]+)/.exec(cookie)?.[1];
  if (value === "empty" || value === "signed-out" || value === "error") return value;
  return undefined;
};

const problem = (status: number, code: string, detail: string) =>
  HttpResponse.json({ title: code, status, detail, code }, { status });

const blocked = () => {
  const mode = mockRoutineMode();
  if (mode === "signed-out") return problem(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  if (mode === "error") return problem(500, "INTERNAL_SERVER_ERROR", "서버에서 처리하지 못했습니다.");
  return undefined;
};

type MockRoutine = {
  readonly id: number;
  readonly name: string;
  readonly memo: string | null;
  readonly isPublic: boolean;
  readonly morning: readonly number[];
  readonly evening: readonly number[];
};

const SEED: readonly MockRoutine[] = [
  {
    id: 3,
    name: "평소 루틴",
    memo: "평일 출근 전후로 쓰는 기본 루틴이에요.",
    isPublic: true,
    morning: [1, 5, 12],
    evening: [11, 14],
  },
  { id: 2, name: "트러블 올라올 때", memo: null, isPublic: false, morning: [], evening: [5, 1] },
  { id: 1, name: "여행용", memo: null, isPublic: false, morning: [], evening: [] },
];

let routines: MockRoutine[] = [...SEED];
let nextId = 4;

const productOf = (id: number) => {
  const product = allProducts.find((candidate) => candidate.id === id);
  if (!product) return [];
  return [{ id: product.id, name: product.name, brandName: product.brand.name, imageUrl: product.imageUrl }];
};

const responseOf = (routine: MockRoutine): RoutineResponse => ({
  ...routine,
  morning: routine.morning.flatMap(productOf),
  evening: routine.evening.flatMap(productOf),
});

const visibleRoutines = () => {
  if (mockRoutineMode() === "empty") return [];
  return routines;
};

const notFound = () => problem(404, "ROUTINE_NOT_FOUND", "루틴을 찾을 수 없습니다.");

/** 테스트가 루틴을 처음 상태로 되돌린다. */
export const resetMockRoutines = (): void => {
  routines = [...SEED];
  nextId = 4;
};

/** 둘러보기에 보이는 다른 사람의 공개 루틴(RT8). */
const SHARED = [
  { id: 101, name: "보습 꽉 채우기", nickname: "건조주의보", morning: [1, 5], evening: [1, 12, 14] },
  { id: 102, name: "트러블 진정 저녁", nickname: "촉촉한판다", morning: [11, 1], evening: [5, 12, 14] },
  { id: 103, name: "가볍게 끝내는 아침", nickname: "모공고민중", morning: [12], evening: [] },
] as const;

const sharedResponseOf = (routine: (typeof SHARED)[number]) => ({
  id: routine.id,
  name: routine.name,
  author: { nickname: routine.nickname, profileImageUrl: null },
  morning: routine.morning.flatMap(productOf),
  evening: routine.evening.flatMap(productOf),
});

/** 서버처럼 '닉네임 - 원래 이름'을 25자로 자른다. */
const importedName = (nickname: string, name: string) =>
  Array.from(`${nickname} - ${name}`).slice(0, 25).join("").trim();

export const routineHandlers = [
  http.get("*/api/routines", () =>
    HttpResponse.json({
      items: SHARED.map(sharedResponseOf),
      pagination: { page: 1, size: 20, totalElements: SHARED.length, totalPages: 1, hasNext: false },
    }),
  ),
  http.get("*/api/routines/:routineId", ({ params }) => {
    const routine = SHARED.find((candidate) => candidate.id === Number(params.routineId));
    if (!routine) return notFound();
    return HttpResponse.json(sharedResponseOf(routine));
  }),
  http.post("*/api/users/me/routines/imports", async ({ request }) => {
    const body = RoutineImportRequest.parse(await request.json());
    const source = SHARED.find((candidate) => candidate.id === body.routineId);
    if (!source) return blocked() ?? notFound();
    const routine: MockRoutine = {
      id: nextId,
      name: importedName(source.nickname, source.name),
      memo: null,
      isPublic: false,
      morning: [...source.morning],
      evening: [...source.evening],
    };
    nextId += 1;
    routines = [routine, ...routines];
    return blocked() ?? HttpResponse.json(responseOf(routine), { status: 201 });
  }),
  http.get(
    "*/api/users/me/routines",
    () =>
      blocked() ??
      HttpResponse.json({
        items: visibleRoutines().map((routine) => {
          const { id, name, isPublic, morning, evening } = responseOf(routine);
          return { id, name, isPublic, morning, evening };
        }),
      }),
  ),
  http.get("*/api/users/me/routines/:routineId", ({ params }) => {
    const routine = visibleRoutines().find((candidate) => candidate.id === Number(params.routineId));
    if (!routine) return blocked() ?? notFound();
    return blocked() ?? HttpResponse.json(responseOf(routine));
  }),
  http.post("*/api/users/me/routines", async ({ request }) => {
    const body = RoutineCreateRequest.parse(await request.json());
    const routine: MockRoutine = {
      id: nextId,
      name: body.name.trim(),
      memo: body.memo?.trim() || null,
      isPublic: body.isPublic,
      morning: body.morningProductIds ?? [],
      evening: body.eveningProductIds ?? [],
    };
    nextId += 1;
    routines = [routine, ...routines];
    return blocked() ?? HttpResponse.json(responseOf(routine), { status: 201 });
  }),
  http.put("*/api/users/me/routines/:routineId", async ({ params, request }) => {
    const body = RoutineUpdateRequest.parse(await request.json());
    const routine = routines.find((candidate) => candidate.id === Number(params.routineId));
    if (!routine) return notFound();
    const updated = { ...routine, name: body.name.trim(), memo: body.memo?.trim() || null, isPublic: body.isPublic };
    routines = routines.map((candidate) => (candidate.id === updated.id ? updated : candidate));
    return HttpResponse.json(responseOf(updated));
  }),
  http.put("*/api/users/me/routines/:routineId/products", async ({ params, request }) => {
    const body = RoutineProductsRequest.parse(await request.json());
    const routine = routines.find((candidate) => candidate.id === Number(params.routineId));
    if (!routine) return notFound();
    const updated = { ...routine, morning: body.morningProductIds, evening: body.eveningProductIds };
    routines = routines.map((candidate) => {
      if (candidate.id === updated.id) return updated;
      return candidate;
    });
    return HttpResponse.json(responseOf(updated));
  }),
  http.delete("*/api/users/me/routines/:routineId", ({ params }) => {
    routines = routines.filter((candidate) => candidate.id !== Number(params.routineId));
    return new HttpResponse(null, { status: 204 });
  }),
];
