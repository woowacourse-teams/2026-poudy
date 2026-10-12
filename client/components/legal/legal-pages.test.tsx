// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/TopBar", () => ({ TopBar: () => null }));

import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { ScheduledTerms } from "@/components/legal/ScheduledTerms";

describe("법정 문서와 실제 회원·집계 동작", () => {
  it("처리방침에 실제 집계 항목과 보유 기간, DNT 적용 범위를 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("시행일 2026년 10월 12일");
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

  it("현재 약관을 기본으로 제공하고 개정 예정 약관은 닫힌 펼침 영역에 둔다", () => {
    const { container } = render(<TermsPage />);
    const details = container.querySelector("details");

    expect(screen.getByText("시행일 2026년 10월 4일")).toBeVisible();
    expect(details).not.toHaveAttribute("open");
    expect(details?.querySelector("summary")).toHaveTextContent("2026년 11월 11일 시행 예정 약관 펼쳐보기");
    expect(details).toHaveTextContent("백업 객체 생성 후 30일에 만료");

    const currentArticles = Array.from(container.querySelectorAll("main > section"));
    expect(currentArticles).toHaveLength(14);
    expect(currentArticles.map((article) => article.textContent).join(" ")).toContain('피부 타입은 "모름"을 선택할 수');
    expect(currentArticles.map((article) => article.textContent).join(" ")).not.toContain(
      "백업 객체 생성 후 30일에 만료",
    );
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
