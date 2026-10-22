import { chromium, expect } from "playwright/test";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 별도의 테스트 프로필 API와 테스트 DB를 띄운 뒤 실행한다. 실제 운영 계정으로 실행하지 않는다.
const site = new URL(process.env.POUDY_VERIFY_SITE ?? "http://localhost:3008").origin;
const api = new URL(process.env.POUDY_VERIFY_API ?? "http://localhost:8089").origin;
if (![site, api].every((origin) => ["localhost", "127.0.0.1"].includes(new URL(origin).hostname)))
  throw new Error("로컬 테스트 서버에서만 실행할 수 있습니다.");
const evidence = process.env.POUDY_VERIFY_ARTIFACT_DIR ?? join(tmpdir(), "poudy-admin-evidence");
await mkdir(evidence, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  let createdId;
  let context;
  try {
    context = await browser.newContext({ viewport: { width: 1801, height: 1376 } });
    await context.route("**/api/**", (route) =>
      ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${site}/admin/login`);
    await page.getByLabel("아이디").fill(process.env.POUDY_VERIFY_USERNAME ?? "admin-test");
    await page.getByLabel("비밀번호").fill(process.env.POUDY_VERIFY_PASSWORD ?? "secret-test");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByRole("heading", { name: "문의 관리", exact: true })).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: join(evidence, "inquiries-desktop.png"), fullPage: true });
    await page.getByRole("link", { name: "공지사항", exact: true }).click();
    await expect(page.getByRole("heading", { name: "공지사항", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "새 공지 쓰기" }).click();
    await expect(page.getByRole("heading", { name: /공지 쓰기.*비공개/ })).toBeVisible();
    await page.getByRole("textbox", { name: /^제목/ }).fill("선반 기능이 새로 생겼어요");
    await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("선반 기능이 새로 생겼어요");
    await page
      .getByLabel("본문")
      .fill("써 본 화장품을 선반에 올리고, 피부에 잘 맞았는지 남겨 보세요.\n\nhttps://example.com/notice");
    await page.getByRole("switch", { name: "상단 띠로 알리기" }).click();
    await page.getByLabel("띠 문구").fill("선반 기능이 새로 생겼어요");
    await page.screenshot({ path: join(evidence, "notice-draft.png"), fullPage: true });
    await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("선반 기능이 새로 생겼어요");
    await page.getByRole("button", { name: "공개하기", exact: true }).click();
    await expect(page.getByRole("heading", { name: /공지 수정.*공개 중/ })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\/notices\/[0-9a-f-]{36}$/);
    const noticeId = new URL(page.url()).pathname.split("/").pop();
    createdId = noticeId;
    await page.screenshot({ path: join(evidence, "notice-published.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("textbox", { name: /^제목/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: join(evidence, "notice-desktop-1440.png"), fullPage: true });
    const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const user = await publicContext.newPage();
    user.on("pageerror", (e) => errors.push(e.message));
    await user.goto(`${site}/notices/${noticeId}`);
    await expect(user.getByRole("heading", { name: "선반 기능이 새로 생겼어요" })).toBeVisible();
    await expect(user.getByRole("link", { name: "https://example.com/notice" })).toBeVisible();
    await user.screenshot({ path: join(evidence, "notice-mobile-390.png"), fullPage: true });
    await user.setViewportSize({ width: 320, height: 844 });
    expect(await user.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await user.screenshot({ path: join(evidence, "notice-mobile-320.png"), fullPage: true });
    await user.evaluate(() => {
      const sizes = [...document.querySelectorAll("body, body *")].map((element) => [
        element,
        Number.parseFloat(getComputedStyle(element).fontSize),
      ]);
      for (const [element, size] of sizes) element.style.fontSize = `${size * 2}px`;
    });
    expect(await user.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(user.getByRole("link", { name: "https://example.com/notice" })).toBeVisible();
    await user.screenshot({ path: join(evidence, "notice-mobile-text-200.png"), fullPage: true });
    await user.goto(`${site}/notices`);
    await user.locator(`a[href="/notices/${noticeId}"]`).click();
    await expect(user.getByRole("heading", { name: "선반 기능이 새로 생겼어요" })).toBeVisible();
    await user.goto(`${site}/`);
    await expect(user.getByRole("link", { name: "공지사항", exact: true })).toHaveAttribute("href", "/notices");
    await expect(user.getByRole("region", { name: "공지 알림" })).toBeVisible();
    await user.getByRole("button", { name: "공지 알림 닫기" }).click();
    await user.reload();
    await expect(user.getByRole("region", { name: "공지 알림" })).toHaveCount(0);
    await page.getByRole("button", { name: "비공개로 전환" }).click();
    await expect(page.getByRole("heading", { name: /공지 쓰기.*비공개/ })).toBeVisible();
    await user.goto(`${site}/notices/${noticeId}`);
    await expect(user.getByText(/^공지를 불러오지 못했어요/)).toBeVisible();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "공지를 삭제할까요?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "공지를 삭제할까요?" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "삭제", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await page
      .getByRole("dialog", { name: "공지를 삭제할까요?" })
      .getByRole("button", { name: "삭제하기", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/notices$/);
    createdId = undefined;
    await page.getByRole("link", { name: "회원 복구", exact: true }).click();
    await expect(page.getByRole("heading", { name: "회원 복구", exact: true })).toBeVisible();
    await page.screenshot({ path: join(evidence, "recovery-desktop.png"), fullPage: true });
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ noticeId, pageErrors: errors, evidence }, null, 2));
  } finally {
    try {
      if (createdId && context) {
        const hidden = await context.request.put(`${api}/api/admin/notices/${createdId}`, {
          headers: { Origin: site },
          data: {
            title: "선반 기능이 새로 생겼어요",
            content: "브라우저 검증 후 정리",
            status: "PRIVATE",
            bannerEnabled: false,
            imageIds: [],
          },
        });
        if (!hidden.ok()) {
          console.error("검증 공지 비공개 정리 실패");
          process.exitCode = 1;
        }
        const deleted = await context.request.delete(`${api}/api/admin/notices/${createdId}`, {
          headers: { Origin: site },
        });
        if (!deleted.ok()) {
          console.error("검증 공지 삭제 정리 실패");
          process.exitCode = 1;
        }
      }
    } finally {
      await browser.close();
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
