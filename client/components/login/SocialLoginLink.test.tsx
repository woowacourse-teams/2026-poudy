// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialLoginLink } from "./SocialLoginLink";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderLink(origin: string) {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://staging.poudy.site");
  vi.stubGlobal("window", { location: new URL(origin) });
  render(
    <SocialLoginLink provider="kakao" className="">
      카카오로 시작하기
    </SocialLoginLink>,
  );
  const link = screen.getByRole("link");
  // 테스트에서 실제 외부 페이지 이동은 막고 링크에 붙는 주소를 확인한다.
  link.addEventListener("click", (event) => event.preventDefault());
  link.addEventListener("auxclick", (event) => event.preventDefault());
  return link;
}

describe("preview 로그인 링크", () => {
  it("preview에서 클릭하면 현재 오리진을 전달한다", () => {
    const link = renderLink("https://pr-111.preview.poudy.site");
    fireEvent.click(link);
    expect(new URL(link.getAttribute("href") ?? "").searchParams.get("returnOrigin")).toBe(
      "https://pr-111.preview.poudy.site",
    );
  });

  it("새 탭이나 링크 복사에도 사용할 수 있도록 href에 복귀 주소를 넣는다", () => {
    const link = renderLink("https://pr-112.preview.poudy.site");
    expect(new URL(link.getAttribute("href") ?? "").searchParams.get("returnOrigin")).toBe(
      "https://pr-112.preview.poudy.site",
    );
  });

  it.each(["https://staging-app.poudy.site", "https://poudy.site", "https://pr-111.preview.poudy.site.evil.com"])(
    "%s에서는 기존 로그인 주소를 유지한다",
    (origin) => {
      const link = renderLink(origin);
      fireEvent.click(link);
      expect(link.getAttribute("href")).toBe("https://staging.poudy.site/api/oauth2/authorization/kakao");
    },
  );
});
