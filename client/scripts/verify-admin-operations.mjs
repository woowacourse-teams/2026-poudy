import { chromium, expect } from "playwright/test";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// admin-notices 실행 계획의 로컬 검증용 가상 데이터가 필요하다.
const site = new URL(process.env.POUDY_VERIFY_SITE ?? "http://localhost:3008").origin;
if (!["localhost", "127.0.0.1"].includes(new URL(site).hostname))
  throw new Error("로컬 테스트 서버에서만 실행할 수 있습니다.");
const evidence = process.env.POUDY_VERIFY_ARTIFACT_DIR ?? join(tmpdir(), "poudy-admin-evidence");
await mkdir(evidence, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1801, height: 1376 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${site}/admin/login`);
    await page.getByLabel("아이디").fill(process.env.POUDY_VERIFY_USERNAME ?? "admin-test");
    await page.getByLabel("비밀번호").fill(process.env.POUDY_VERIFY_PASSWORD ?? "secret-test");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByRole("heading", { name: "문의 관리", exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /저장한 제품이 목록에서/ }).click();
    let drawer = page.getByRole("dialog", { name: "문의 상세", exact: true });
    await expect(drawer.getByRole("heading", { name: "처리 정보", exact: true })).toBeVisible();
    await drawer.getByLabel("처리 상태").selectOption("REVIEW_PLANNED");
    await expect(drawer.getByLabel("처리 상태")).toHaveValue("REVIEW_PLANNED");
    await drawer.getByLabel("담당자", { exact: true }).selectOption("true");
    await expect(drawer.getByLabel("담당자", { exact: true })).toHaveValue("true");
    await page.screenshot({ path: join(evidence, "inquiry-detail.png"), fullPage: true });
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /저장한 제품이 목록에서/ }).click();
    drawer = page.getByRole("dialog", { name: "문의 상세", exact: true });
    await expect(drawer.getByLabel("처리 상태")).toHaveValue("REVIEW_PLANNED");
    await expect(drawer.getByLabel("담당자", { exact: true })).toHaveValue("true");
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await page.getByRole("checkbox", { name: "현재 페이지 전체 선택" }).check();
    await page.getByRole("combobox", { name: "선택 문의 상태 변경" }).selectOption("COMPLETED");
    await expect(page.getByRole("combobox", { name: "선택 문의 상태 변경" })).toHaveCount(0);
    await page.setViewportSize({ width: 720, height: 900 });
    const overflow = await page
      .getByRole("table", { name: "문의 목록" })
      .evaluate((t) => t.parentElement.scrollWidth > t.parentElement.clientWidth);
    expect(overflow).toBe(true);
    await page.screenshot({ path: join(evidence, "inquiries-narrow.png"), fullPage: true });
    await page.setViewportSize({ width: 1801, height: 1376 });
    await page.getByRole("link", { name: "회원 복구", exact: true }).click();
    await page.getByRole("button", { name: "복구", exact: true }).first().click();
    const modal = page.getByRole("dialog", { name: "이 계정을 복구할까요?" });
    await expect(modal.getByText("복구 근거", { exact: true })).toBeVisible();
    await page.screenshot({ path: join(evidence, "recovery-modal.png"), fullPage: true });
    await modal.getByRole("button", { name: "복구하기", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(
      page.getByRole("table", { name: "회원 복구 목록" }).getByText("복구됨", { exact: true }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("table", { name: "회원 복구 목록" }).getByText("복구됨", { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({ path: join(evidence, "recovery-restored.png"), fullPage: true });
    expect(errors).toEqual([]);
    console.log(
      JSON.stringify({
        inquiryPersistence: true,
        bulkUpdate: true,
        narrowTableScroll: overflow,
        recoveryPersistence: true,
        pageErrors: errors,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
