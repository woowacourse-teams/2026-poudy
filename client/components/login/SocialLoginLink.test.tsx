// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialLoginLink } from "./SocialLoginLink";

import { canAppLogin, signInWithApp } from "@/lib/interaction/app-login";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/interaction/app-login", () => ({ canAppLogin: vi.fn(() => false), signInWithApp: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
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

describe("앱 안의 로그인 링크", () => {
  const renderInApp = () => {
    vi.mocked(canAppLogin).mockReturnValue(true);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://staging.poudy.site");
    render(
      <SocialLoginLink provider="kakao" className="">
        카카오로 시작하기
      </SocialLoginLink>,
    );
    return screen.getByRole("link");
  };

  it("페이지를 옮기지 않고 앱 로그인 결과 화면으로 보낸다", async () => {
    vi.mocked(signInWithApp).mockResolvedValue({ kind: "callback", url: "/login/callback?status=SIGNED_IN" });
    const link = renderInApp();

    const navigated = fireEvent.click(link);

    expect(navigated).toBe(false);
    expect(signInWithApp).toHaveBeenCalledWith("kakao");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login/callback?status=SIGNED_IN"));
  });

  it("앱이 네이티브로 로그인할 수 없으면 앱 채널을 붙인 OAuth 주소로 이동한다", async () => {
    vi.mocked(signInWithApp).mockResolvedValue({ kind: "webLogin" });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const link = renderInApp();

    fireEvent.click(link);

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://staging.poudy.site/api/oauth2/authorization/kakao?channel=app"),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("연달아 누르면 앱에 한 번만 요청한다", () => {
    vi.mocked(signInWithApp).mockReturnValue(new Promise(() => {}));
    const link = renderInApp();

    fireEvent.click(link);
    fireEvent.click(link);

    expect(signInWithApp).toHaveBeenCalledTimes(1);
  });

  it("앱이 결과를 돌려주지 않아도 잠시 뒤 다시 누르면 새로 요청한다", () => {
    vi.mocked(signInWithApp).mockReturnValue(new Promise(() => {}));
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
    const link = renderInApp();

    fireEvent.click(link);
    now.mockReturnValue(11_000);
    fireEvent.click(link);

    expect(signInWithApp).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it("취소하면 그대로 두고 다시 누를 수 있다", async () => {
    vi.mocked(signInWithApp).mockResolvedValue({ kind: "none" });
    const link = renderInApp();

    fireEvent.click(link);
    await waitFor(() => expect(link.getAttribute("aria-busy")).toBe("false"));
    fireEvent.click(link);

    expect(replace).not.toHaveBeenCalled();
    expect(signInWithApp).toHaveBeenCalledTimes(2);
  });
});
