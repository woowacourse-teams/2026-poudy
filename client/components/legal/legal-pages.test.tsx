import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/TopBar", () => ({ TopBar: () => null }));

import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

describe("인기 검색어와 인기 제품 법정 문서", () => {
  it("처리방침에 실제 집계 항목과 보유 기간, DNT 적용 범위를 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("시행일 2026년 9월 14일");
    expect(markup).toContain("2026년 9월 23일 개정 시행 예정");
    expect(markup).toContain("인기 검색어 집계");
    expect(markup).toContain("계산에는 제출한 때로부터 최대 7일 20분 사용");
    expect(markup).toContain("다음 상태 저장에 성공하면 파일에서 제거");
    expect(markup).toContain("제품 조회수 집계");
    expect(markup).toContain("서비스 운영 기간");
    expect(markup).toContain("PostHog와 Google Analytics의 분석 수집을 멈춥니다");
    expect(markup).toContain("인기 검색어·제품 조회수 집계에는 이 설정이 적용되지 않습니다");
  });

  it("이용약관에 순위 산정 기준과 한계를 안내한다", () => {
    const markup = renderToStaticMarkup(TermsPage());

    expect(markup).toContain("시행일 2026년 9월 1일");
    expect(markup).toContain("2026년 10월 7일 개정 시행 예정");
    expect(markup).toContain("팀이 정한 기본 검색어가 함께 표시될 수 있습니다");
    expect(markup).toContain("제품 상세 화면 조회 횟수를 기준으로 최대 6개를 보여 줍니다");
    expect(markup).toContain("판매량, 품질, 효능, 안전성 또는 팀의 추천을 뜻하지 않습니다");
  });
});
