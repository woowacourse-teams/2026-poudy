// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/navigation/SubTopBar", () => ({ SubTopBar: () => null }));

import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { ScheduledTerms } from "@/components/legal/ScheduledTerms";

describe("법정 문서와 실제 회원·집계 동작", () => {
  it("처리방침에 실제 집계 항목과 보유 기간, DNT 적용 범위를 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("시행일 2026년 10월 21일");
    expect(markup).not.toContain("시행 예정");
    expect(markup).not.toContain("회원가입과 로그인이 없는 서비스");
    expect(markup).toContain("제공자가 인증한 이메일");
    expect(markup).toContain("회원 저장함");
    expect(markup).toContain("복구 요청만으로 보관 기간이 연장되지 않습니다");
    expect(markup).toContain("JSESSIONID");
    expect(markup).toContain("앱 세션은 60일 미사용에 만료");
    expect(markup).not.toContain("서버 재시작 시에도 세션이 종료됩니다");
    expect(markup).not.toContain("모름&quot;을 선택할 수");
    expect(markup).toContain("S3 DB 백업에 포함된 개인정보");
    expect(markup).toContain("백업 객체 생성 후 30일에 만료");
    expect(markup).toContain("실제 삭제 완료까지 시간이 더 걸릴 수 있습니다");
    expect(markup).toContain("S3의 30일 만료 설정은 이 임시 사본에는 적용되지 않습니다");
    expect(markup).toContain("인기 검색어 집계");
    expect(markup).toContain("계산에는 제출한 때로부터 최대 7일 20분 사용");
    expect(markup).toContain("다음 상태 저장에 성공하면 파일에서 제거");
    expect(markup).toContain("제품 조회수 집계");
    expect(markup).toContain("서비스 운영 기간");
    expect(markup).toContain("PostHog와 Google Analytics의 분석 수집을 멈춥니다");
    expect(markup).toContain("인기 검색어·제품 조회수 집계에는 이 설정이 적용되지 않습니다");
    expect(markup).toContain("요청한 제품의 등록 여부를 정한 뒤에도 처리 이력으로 보관");
  });

  it("처리방침에 선반과 민감성 피부 여부를 실제 저장 항목대로 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("피부 타입(건성·지성·복합성), 민감성 피부 여부");
    expect(markup).not.toContain("건성·지성·민감성·복합성");
    expect(markup).toContain("사용 상태(사용 중·사용했던)");
    expect(markup).toContain("직전 성분 분석 결과");
    expect(markup).toContain("선반에서 뺀 제품도 되돌릴 수 있도록 사용 상태와 평가를 지우지 않고 보관");
    expect(markup).toContain("저장함에서 뺀 제품도 되돌릴 수 있도록 지우지 않고 보관");
    expect(markup).not.toContain("제품을 선반에서 뺄 때까지");
    expect(markup).toContain("계정과 프로필, 저장함과 선반은 복구 요청");
  });

  it("처리방침에 선반 평가 이력의 기록과 탈퇴 후 통계 보관, 권리 행사의 한계를 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("선반 평가 이력");
    expect(markup).toContain("기록 날짜(시각 없이 날짜만)");
    expect(markup).toContain("같은 프로필로 남긴 최신 평가인지 여부");
    expect(markup).toContain("선반에서 제품을 빼거나 프로필만 고칠 때는 새로 기록하지 않습니다");
    expect(markup).not.toContain("선반에서 뺄 때마다");
    expect(markup).toContain("선반에서 제품을 빼도 이력은 지우지 않습니다");
    expect(markup).toContain("회원 번호만 지우고");
    expect(markup).toContain("개인을 알아볼 수 없는 통계 자료");
    expect(markup).toContain("회원 번호를 지운 뒤에는 특정 회원의 기록을 찾을 수 없습니다");
    expect(markup).toContain("제품의 수분감·유분감 정보를 개선");
  });

  it("이용약관에 순위 산정 기준과 한계를 안내한다", () => {
    const markup = renderToStaticMarkup(<ScheduledTerms />);

    expect(markup).toContain("2026년 11월 11일");
    expect(markup).not.toContain("시행일 2026년 10월 12일");
    expect(markup).toContain("시행 전까지는 종전 약관이 적용됩니다");
    expect(markup).not.toContain("계속 이용하면 바뀐 약관에 동의한 것으로 봅니다");
    expect(markup).toContain("회원가입은 만 14세 이상");
    expect(markup).toContain("탈퇴 후 30일 보관");
    expect(markup).toContain("운영자가 복구를 완료하면");
    expect(markup).toContain("백업에 정보가 남아 있다는 이유로 계정 복구 요청 기간이 늘어나지는 않습니다");
    expect(markup).not.toContain("모름&quot;을 선택할 수");
    expect(markup).toContain("법령상 책임을 배제하거나");
    expect(markup).toContain("팀이 정한 기본 검색어가 함께 표시될 수 있습니다");
    expect(markup).toContain("제품 상세 화면 조회 횟수를 기준으로 최대 6개를 보여 줍니다");
    expect(markup).toContain("판매량, 품질, 효능, 안전성 또는 팀의 추천을 뜻하지 않습니다");
  });

  it("현재 약관을 기본으로 제공하고 개정 예정 약관은 접힌 펼침 영역에 둔다", async () => {
    const { container } = render(<TermsPage />);
    const trigger = screen.getByRole("button", { name: "2026년 11월 11일 시행 예정 약관 펼쳐보기" });
    const scheduled = document.getElementById(trigger.getAttribute("aria-controls") ?? "");

    expect(screen.getByText("시행일 2026년 10월 4일")).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // 접힌 동안에도 문서에는 남아 페이지 안 찾기와 검색엔진이 읽는다.
    expect(scheduled).not.toBeVisible();
    expect(scheduled).toHaveTextContent("백업 객체 생성 후 30일에 만료");

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(scheduled).toBeVisible();

    const currentArticles = Array.from(container.querySelectorAll("main > section"));
    expect(currentArticles).toHaveLength(14);
    expect(currentArticles.map((article) => article.textContent).join(" ")).toContain('피부 타입은 "모름"을 선택할 수');
    expect(currentArticles.map((article) => article.textContent).join(" ")).not.toContain(
      "백업 객체 생성 후 30일에 만료",
    );
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
