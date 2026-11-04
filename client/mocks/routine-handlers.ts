import {
  RoutineCommentRequest,
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
  { id: 2, name: "트러블 올라올 때", memo: null, isPublic: false, morning: [1, 2, 5, 11, 12, 14, 15], evening: [5, 1] },
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

/** 내 루틴. 공개하는 동안 받은 댓글은 비공개로 바꿔도 작성자가 본다. */
const ownRoutineOf = (routineId: number) => visibleRoutines().find((routine) => routine.id === routineId);

const notFound = () => problem(404, "ROUTINE_NOT_FOUND", "루틴을 찾을 수 없습니다.");

/** 테스트가 루틴을 처음 상태로 되돌린다. */
export const resetMockRoutines = (): void => {
  routines = [...SEED];
  nextId = 4;
  comments = [...COMMENT_SEED];
  nextCommentId = 6;
  likedIds = [];
};

type MockSharedRoutine = {
  readonly id: number;
  readonly name: string;
  readonly nickname: string;
  readonly memo: string | null;
  readonly morning: readonly number[];
  readonly evening: readonly number[];
};

const GENERATED_NAMES = [
  "출근 전 5분 루틴",
  "건조한 겨울 저녁",
  "선크림 꼭 챙기는 아침",
  "모공 정리 루틴",
  "민감할 때 최소 루틴",
  "운동 후 진정",
  "여름 산뜻 루틴",
  "주말 집중 관리",
  "야근한 날 간단히",
  "속당김 잡는 저녁",
  "피지 많은 날",
  "각질 정리 주 2회",
] as const;

const GENERATED_NICKNAMES = ["건조주의보", "촉촉한판다", "모공고민중", "새벽세안", "피부일기", "수분충전중"] as const;

/** 둘러보기 무한 스크롤을 볼 수 있게 이름·작성자·제품을 돌려 가며 만든 공개 루틴. */
const GENERATED_SHARED: readonly MockSharedRoutine[] = Array.from({ length: 36 }, (_, index) => ({
  id: 104 + index,
  name: GENERATED_NAMES[index % GENERATED_NAMES.length],
  nickname: GENERATED_NICKNAMES[index % GENERATED_NICKNAMES.length],
  memo: null,
  morning: Array.from({ length: (index % 4) + 1 }, (_, order) => ((index + order * 3) % 15) + 1),
  evening: Array.from({ length: index % 5 }, (_, order) => ((index * 2 + order * 4) % 15) + 1),
}));

const SHARED_PAGE_SIZE = 10;

/** 서버 기본 쪽 크기와 같다. */
const MY_PAGE_SIZE = 20;

/** 둘러보기에 보이는 다른 사람의 공개 루틴(RT8). */
const SHARED: readonly MockSharedRoutine[] = [
  {
    id: 101,
    name: "보습 꽉 채우기",
    nickname: "건조주의보",
    memo: "세안 직후 3분 안에 토너부터 바르는 게 핵심이에요.\n저녁엔 크림을 두껍게 한 겹 더 올려요.",
    morning: [1, 5],
    evening: [1, 12, 14],
  },
  { id: 102, name: "트러블 진정 저녁", nickname: "촉촉한판다", memo: null, morning: [11, 1], evening: [5, 12, 14] },
  { id: 103, name: "가볍게 끝내는 아침", nickname: "모공고민중", memo: null, morning: [12], evening: [] },
  ...GENERATED_SHARED,
];

type MockComment = {
  readonly id: number;
  readonly routineId: number;
  readonly nickname: string;
  readonly content: string;
  readonly createdAt: string;
  readonly mine: boolean;
};

const COMMENT_SEED: readonly MockComment[] = [
  {
    id: 1,
    routineId: 102,
    nickname: "건조주의보",
    content: "토너를 저녁에 먼저 쓰는 이유가 궁금해요!",
    createdAt: "2026-11-02T10:00:00+09:00",
    mine: false,
  },
  {
    id: 2,
    routineId: 102,
    nickname: "촉촉한판다",
    content: "트러블 올라올 때는 가벼운 토너로 먼저 닦아내고\n크림을 얇게 발라요.",
    createdAt: "2026-11-02T11:00:00+09:00",
    mine: false,
  },
  {
    id: 3,
    routineId: 102,
    nickname: "모공고민중",
    content: "저녁 3단계면 무겁지 않아요? 저는 아침엔 2개만 써요.",
    createdAt: "2026-11-03T09:00:00+09:00",
    mine: false,
  },
  {
    id: 4,
    routineId: 3,
    nickname: "피부일기",
    content: "아침 3단계 순서 그대로 따라 해 볼게요!",
    createdAt: "2026-11-03T20:00:00+09:00",
    mine: false,
  },
  {
    id: 5,
    routineId: 2,
    nickname: "새벽세안",
    content: "공개였을 때 봤는데 트러블 날 정말 좋았어요.",
    createdAt: "2026-11-01T08:00:00+09:00",
    mine: false,
  },
];

const LIKE_SEED: Readonly<Record<number, number>> = { 1: 0, 2: 2, 3: 5, 101: 41, 102: 24, 103: 3 };

let comments: MockComment[] = [...COMMENT_SEED];
let nextCommentId = 6;
let likedIds: number[] = [];

/** 목 회원의 피부 타입. 없는 닉네임은 입력하지 않은 회원이다. */
const SKIN_TYPES: Readonly<Record<string, "DRY" | "OILY" | "COMBINATION">> = {
  건조주의보: "DRY",
  촉촉한판다: "COMBINATION",
  모공고민중: "OILY",
  새벽세안: "DRY",
  피부일기: "COMBINATION",
};

const authorOf = (nickname: string) => ({ nickname, profileImageUrl: null, skinType: SKIN_TYPES[nickname] ?? null });

const commentResponseOf = (comment: MockComment) => {
  const routine = SHARED.find((candidate) => candidate.id === comment.routineId);
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: authorOf(comment.nickname),
    byRoutineAuthor: routine?.nickname === comment.nickname,
    mine: comment.mine,
  };
};

const commentsOf = (routineId: number) => comments.filter((comment) => comment.routineId === routineId);

const likeCountOf = (routineId: number) =>
  (LIKE_SEED[routineId] ?? (routineId * 7) % 30) + Number(likedIds.includes(routineId));

const sharedResponseOf = (routine: MockSharedRoutine) => ({
  id: routine.id,
  name: routine.name,
  author: authorOf(routine.nickname),
  likeCount: likeCountOf(routine.id),
  commentCount: commentsOf(routine.id).length,
  morning: routine.morning.flatMap(productOf),
  evening: routine.evening.flatMap(productOf),
});

const sharedDetailOf = (routine: MockSharedRoutine) => ({
  ...sharedResponseOf(routine),
  memo: routine.memo,
  liked: likedIds.includes(routine.id),
  comments: commentsOf(routine.id).slice(0, 2).map(commentResponseOf),
});

const sharedRoutineOf = (routineId: unknown) => SHARED.find((candidate) => candidate.id === Number(routineId));

/** 서버처럼 '닉네임 - 원래 이름'을 25자로 자른다. */
const importedName = (nickname: string, name: string) =>
  Array.from(`${nickname} - ${name}`).slice(0, 25).join("").trim();

export const routineHandlers = [
  http.get("*/api/routines", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const sort = params.get("sort");
    const page = Math.max(Number(params.get("page") ?? 1), 1);
    const sorted = SHARED.map(sharedResponseOf).toSorted((a, b) => {
      if (sort === "LIKES") return b.likeCount - a.likeCount || b.id - a.id;
      if (sort === "COMMENTS") return b.commentCount - a.commentCount || b.id - a.id;
      return 0;
    });
    const totalPages = Math.ceil(sorted.length / SHARED_PAGE_SIZE);
    return HttpResponse.json({
      items: sorted.slice((page - 1) * SHARED_PAGE_SIZE, page * SHARED_PAGE_SIZE),
      pagination: {
        page,
        size: SHARED_PAGE_SIZE,
        totalElements: sorted.length,
        totalPages,
        hasNext: page < totalPages,
      },
    });
  }),
  http.get("*/api/routines/:routineId", ({ params }) => {
    const routine = sharedRoutineOf(params.routineId);
    if (!routine) return notFound();
    return HttpResponse.json(sharedDetailOf(routine));
  }),
  http.get("*/api/routines/:routineId/comments", ({ params }) => {
    const routineId = Number(params.routineId);
    const own = ownRoutineOf(routineId);
    if (!sharedRoutineOf(routineId) && !own) return notFound();
    const items = commentsOf(routineId).map(commentResponseOf);
    return HttpResponse.json({
      items,
      pagination: { page: 1, size: 20, totalElements: items.length, totalPages: 1, hasNext: false },
      writable: own?.isPublic ?? true,
    });
  }),
  http.put("*/api/users/me/routines/:routineId/like", ({ params }) => {
    const routine = sharedRoutineOf(params.routineId);
    if (!routine) return blocked() ?? notFound();
    if (!likedIds.includes(routine.id)) likedIds = [...likedIds, routine.id];
    return blocked() ?? new HttpResponse(null, { status: 204 });
  }),
  http.delete("*/api/users/me/routines/:routineId/like", ({ params }) => {
    likedIds = likedIds.filter((id) => id !== Number(params.routineId));
    return blocked() ?? new HttpResponse(null, { status: 204 });
  }),
  http.post("*/api/users/me/routines/:routineId/comments", async ({ params, request }) => {
    const body = RoutineCommentRequest.parse(await request.json());
    const routineId = Number(params.routineId);
    const own = ownRoutineOf(routineId);
    if (!sharedRoutineOf(routineId) && !own?.isPublic) return blocked() ?? notFound();
    const comment: MockComment = {
      id: nextCommentId,
      routineId,
      nickname: "산뜻한수달",
      content: body.content.trim(),
      createdAt: new Date().toISOString(),
      mine: true,
    };
    nextCommentId += 1;
    comments = [...comments, comment];
    return blocked() ?? HttpResponse.json(commentResponseOf(comment), { status: 201 });
  }),
  http.put("*/api/users/me/routines/comments/:commentId", async ({ params, request }) => {
    const body = RoutineCommentRequest.parse(await request.json());
    const comment = comments.find((candidate) => candidate.id === Number(params.commentId) && candidate.mine);
    if (!comment) return problem(404, "ROUTINE_COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다.");
    const edited = { ...comment, content: body.content.trim() };
    comments = comments.map((candidate) => {
      if (candidate.id === edited.id) return edited;
      return candidate;
    });
    return HttpResponse.json(commentResponseOf(edited));
  }),
  http.delete("*/api/users/me/routines/comments/:commentId", ({ params }) => {
    const comment = comments.find((candidate) => candidate.id === Number(params.commentId) && candidate.mine);
    if (!comment) return problem(404, "ROUTINE_COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다.");
    comments = comments.filter((candidate) => candidate.id !== comment.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("*/api/users/me/routines/imports", async ({ request }) => {
    const body = RoutineImportRequest.parse(await request.json());
    const source = SHARED.find((candidate) => candidate.id === body.routineId);
    if (!source) return blocked() ?? notFound();
    const routine: MockRoutine = {
      id: nextId,
      name: importedName(source.nickname, source.name),
      memo: source.memo,
      isPublic: false,
      morning: [...source.morning],
      evening: [...source.evening],
    };
    nextId += 1;
    routines = [routine, ...routines];
    return blocked() ?? HttpResponse.json(responseOf(routine), { status: 201 });
  }),
  http.get("*/api/users/me/routines", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const page = Math.max(Number(params.get("page") ?? 1), 1);
    const size = Math.max(Number(params.get("size") ?? MY_PAGE_SIZE), 1);
    const all = visibleRoutines();
    const totalPages = Math.ceil(all.length / size);
    return (
      blocked() ??
      HttpResponse.json({
        items: all.slice((page - 1) * size, page * size).map((routine) => {
          const { id, name, isPublic, morning, evening } = responseOf(routine);
          return {
            id,
            name,
            isPublic,
            likeCount: likeCountOf(id),
            commentCount: commentsOf(id).length,
            morning,
            evening,
          };
        }),
        pagination: { page, size, totalElements: all.length, totalPages, hasNext: page < totalPages },
      })
    );
  }),
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
