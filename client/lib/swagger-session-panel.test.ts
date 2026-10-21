// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { waitFor } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";

const html = readFileSync(resolve(process.cwd(), "../server/src/main/resources/openapi/session-panel.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("Swagger 로그인 상태 스크립트가 없습니다.");

let panelDocument = document;

const admin = () => panelDocument.getElementById("poudy-admin-session")?.textContent;
const user = () => panelDocument.getElementById("poudy-user-session")?.textContent;
const account = (path: string) =>
  path === "/api/admin/me"
    ? Response.json({ username: "admin" })
    : Response.json({ email: "user@example.com", provider: "KAKAO" });

const start = (fetch: typeof globalThis.fetch) => {
  panelDocument = document.implementation.createHTMLDocument();
  panelDocument.body.innerHTML = html;
  const events = new EventTarget();
  const browser = Object.assign(events, { location: window.location, open: vi.fn() });
  runInNewContext(script, { document: panelDocument, window: browser, fetch, Element, URL });
  return browser;
};

describe("Swagger 실제 로그인 상태", () => {
  it("로그인 링크는 닫을 수 있는 별도 탭에서 열고 opener 접근을 차단한다", () => {
    const browser = start(vi.fn().mockImplementation(async (path: string) => account(path)));
    const link = panelDocument.querySelector('a[href="/login/swagger?provider=kakao&popup=1"]');
    link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(browser.open).toHaveBeenCalledWith(
      new URL("/login/swagger?provider=kakao&popup=1", window.location.href).href,
      "_blank",
      "noopener",
    );
  });

  it("관리자와 사용자 상태를 별도로 확인하고 쿠키를 전달한다", async () => {
    const fetch = vi.fn().mockImplementation(async (path: string) => account(path));
    start(fetch);
    await waitFor(() => expect(user()).toBe("로그인됨 (user@example.com · KAKAO)"));
    expect(admin()).toBe("로그인됨 (admin)");
    expect(fetch).toHaveBeenCalledWith("/api/users/me", { credentials: "include", cache: "no-store" });
  });

  it("401만 미로그인으로 보고 서버·네트워크 오류는 확인 실패로 표시한다", async () => {
    start(
      vi
        .fn()
        .mockImplementation(async (path: string) =>
          path === "/api/admin/me" ? new Response(null, { status: 500 }) : new Response(null, { status: 401 }),
        ),
    );
    await waitFor(() => expect(user()).toBe("로그인되지 않음"));
    expect(admin()).toBe("상태 확인 실패 (HTTP 500)");
  });

  it("네트워크 실패를 미로그인으로 표시하지 않는다", async () => {
    start(vi.fn().mockRejectedValue(new Error("offline")));
    await waitFor(() => expect(user()).toContain("상태 확인 실패"));
  });

  it.each(["focus", "poudy-session-changed"])("%s 이후 로그인·로그아웃 상태를 다시 확인한다", async (event) => {
    let signedIn = false;
    const fetch = vi
      .fn()
      .mockImplementation(async (path: string) => (signedIn ? account(path) : new Response(null, { status: 401 })));
    const events = start(fetch);
    await waitFor(() => expect(user()).toBe("로그인되지 않음"));
    signedIn = true;
    events.dispatchEvent(new Event(event));
    await waitFor(() => expect(user()).toBe("로그인됨 (user@example.com · KAKAO)"));
    signedIn = false;
    panelDocument.getElementById("poudy-session-refresh")?.click();
    await waitFor(() => expect(user()).toBe("로그인되지 않음"));
  });
});
