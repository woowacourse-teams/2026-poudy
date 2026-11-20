import { RoutineResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import { MyRoutineResponse } from "./routine";

const routine = { id: 3, name: "평소 루틴", memo: null, isPublic: true, morning: [], evening: [] };

describe("내 루틴 응답", () => {
  it("서버가 준 좋아요 수를 지우지 않고 남긴다", () => {
    expect(MyRoutineResponse.parse({ ...routine, likeCount: 5 })).toEqual({ ...routine, likeCount: 5 });
  });

  it("좋아요 수가 없는 응답은 서버 계약(RoutineResponse)이 받는 동안에만 받는다", () => {
    // 서버가 likeCount 를 필수로 더하기 전에는 둘 다 받고, 더한 뒤에는 둘 다 막는다.
    expect(MyRoutineResponse.safeParse(routine).success).toBe(RoutineResponse.safeParse(routine).success);
  });

  it("계약에 없는 다른 필드는 지운다", () => {
    expect(MyRoutineResponse.parse({ ...routine, likeCount: 1, extra: true })).not.toHaveProperty("extra");
  });
});
