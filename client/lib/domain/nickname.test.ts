import { describe, expect, it } from "vitest";

import { nicknameServerError } from "./nickname";

describe("nicknameServerError", () => {
  it("서버가 보낼 수 있는 닉네임 오류 코드를 모두 해요체 문구로 바꾼다", () => {
    expect(nicknameServerError("RESERVED_NICKNAME", "관리자")).toBe(
      "관리자나 운영자로 보일 수 있는 닉네임은 쓸 수 없어요",
    );
    expect(nicknameServerError("NICKNAME_ALREADY_EXISTS", "산뜻한수달")).toBe("이미 사용 중인 닉네임이에요.");
    expect(nicknameServerError("NICKNAME_TOO_SHORT", "가")).toBe("2~15자로 입력해 주세요");
    expect(nicknameServerError("NICKNAME_TOO_LONG", "가".repeat(16))).toBe("2~15자로 입력해 주세요");
    expect(nicknameServerError("INVALID_NICKNAME", "")).toBe("2~15자로 입력해 주세요");
  });

  it("형식 오류는 입력값을 보고 띄어쓰기와 특수문자를 가려 알린다", () => {
    expect(nicknameServerError("INVALID_NICKNAME_FORMAT", "산뜻한 수달")).toBe("띄어쓰기는 쓸 수 없어요");
    expect(nicknameServerError("INVALID_NICKNAME_FORMAT", "수달_1")).toBe("특수문자는 쓸 수 없어요");
    expect(nicknameServerError("INVALID_NICKNAME_FORMAT", "산뜻한수달")).toBe("띄어쓰기와 특수문자는 쓸 수 없어요");
  });

  it("모르는 코드에는 일반 문구를 쓴다", () => {
    expect(nicknameServerError("INVALID_QUERY_PARAMETER", "산뜻한수달")).toBe("다른 닉네임을 입력해 주세요");
  });
});
