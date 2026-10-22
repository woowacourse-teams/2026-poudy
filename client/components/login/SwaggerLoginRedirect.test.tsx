// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SwaggerLoginRedirect } from "./SwaggerLoginRedirect";

import { socialLoginUrl } from "@/lib/api/member";
import { takeLoginReturn } from "@/lib/storage/login-return";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("Swagger 사용자 로그인", () => {
  it("OAuth로 이동하기 전에 Swagger 복귀 경로를 저장한다", async () => {
    const replace = vi.fn(() => {
      expect(takeLoginReturn()).toBe("/api/admin/swagger-ui.html");
    });
    vi.stubGlobal("location", { replace });
    render(<SwaggerLoginRedirect provider="kakao" popup={false} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(socialLoginUrl("kakao")));
  });
});
