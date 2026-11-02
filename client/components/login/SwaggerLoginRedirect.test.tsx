// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SwaggerLoginRedirect } from "./SwaggerLoginRedirect";

import { socialLoginUrl } from "@/lib/api/member";
import { takeLoginReturn } from "@/lib/storage/login-return";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/lib/navigation/browser-location", () => ({ replaceLocation: replace }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("Swagger 사용자 로그인", () => {
  it("OAuth로 이동하기 전에 Swagger 복귀 경로를 저장한다", async () => {
    replace.mockImplementation(() => {
      expect(takeLoginReturn()).toBe("/api/admin/swagger-ui.html");
    });
    render(<SwaggerLoginRedirect provider="kakao" popup={false} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(socialLoginUrl("kakao")));
  });
});
