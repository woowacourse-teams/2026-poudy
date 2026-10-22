import { describe, expect, it } from "vitest";

import AdminLoginPage from "./page";

describe("관리자 로그인 복귀 경로", () => {
  it.each([
    { next: "/api/admin/swagger-ui.html", allowed: true },
    { next: "https://external.example", allowed: false },
    { next: "javascript:alert(1)", allowed: false },
    { next: ["/api/admin/swagger-ui.html"], allowed: false },
    { next: undefined, allowed: false },
  ])("등록된 Swagger 경로만 허용한다: $next", async ({ next, allowed }) => {
    const page = await AdminLoginPage({ searchParams: Promise.resolve({ next }) });
    expect(page.props.returnToSwagger).toBe(allowed);
  });
});
