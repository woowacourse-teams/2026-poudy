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

    expect(markup).toContain("시행일 2026년 11월 9일");
    expect(markup).toContain("내부 회원 번호에 접두어를 붙인 식별자");
    expect(markup).toContain(
      "파우치 평가의 구체적인 값, 필터에 고른 성분 번호와 댓글 내용은 분석 이벤트에 보내지 않습니다",
    );
    expect(markup).not.toContain("시행 예정");
    expect(markup).not.toContain("회원가입과 로그인이 없는 서비스");
    expect(markup).toContain("제공자가 인증한 이메일");
    expect(markup).toContain("회원 저장함");
    expect(markup).toContain("복구 요청만으로 보관 기간이 연장되지 않습니다");
    expect(markup).toContain("JSESSIONID");
    expect(markup).toContain("앱 세션은 60일 미사용에 만료");
    expect(markup).not.toContain("서버 재시작 시에도 세션이 종료됩니다");
    expect(markup).not.toContain("모름&quot;을 선택할 수");
    expect(markup).toContain("DB 백업에 포함된 개인정보");
    expect(markup).toContain("백업 생성 후 30일이 지나면 순차적으로 삭제");
    expect(markup).toContain("실제 삭제 완료까지 시간이 더 걸릴 수 있습니다");
    expect(markup).toContain("서버에 임시 사본이 남을 수 있으며, 이 사본에는 30일 만료가 적용되지 않습니다");
    expect(markup).toContain("인기 검색어 집계");
    expect(markup).toContain("제출한 때로부터 최대 7일 20분");
    expect(markup).not.toContain("200MB");
    expect(markup).toContain("제품 조회수 집계");
    expect(markup).toContain("서비스 운영 기간");
    expect(markup).toContain("PostHog의 분석 수집을 멈춥니다");
    expect(markup).toContain("인기 검색어·제품 조회수 집계에는 이 설정이 적용되지 않습니다");
    expect(markup).toContain("요청한 제품의 등록 여부를 정한 뒤에도 처리 이력으로 보관");
  });

  it("처리방침에 파우치와 민감성 피부 여부를 실제 저장 항목대로 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("피부 타입(건성·지성·복합성), 민감성 피부 여부");
    expect(markup).not.toContain("건성·지성·민감성·복합성");
    expect(markup).toContain("사용 상태(사용 중·사용했던)");
    expect(markup).toContain("직전 성분 분석 결과");
    expect(markup).toContain("파우치에서 뺀 제품도 되돌릴 수 있도록 사용 상태와 평가를 지우지 않고 보관");
    expect(markup).toContain("저장함에서 뺀 제품도 되돌릴 수 있도록 지우지 않고 보관");
    expect(markup).not.toContain("제품을 파우치에서 뺄 때까지");
    expect(markup).toContain("계정과 프로필, 저장함과 파우치, 나만의 필터는 복구 요청");
  });

  it("처리방침에 파우치 평가 이력의 기록과 탈퇴 후 통계 보관, 권리 행사의 한계를 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("파우치 평가 이력");
    expect(markup).toContain(
      "기록할 때의 성별·나이대·피부 타입·민감성 피부 여부, 같은 프로필로 남긴 최신 평가인지 여부, 기록 날짜",
    );
    expect(markup).toContain("같은 프로필로 남긴 최신 평가인지 여부");
    expect(markup).toContain("파우치에서 제품을 빼거나 프로필만 고칠 때는 새로 기록하지 않습니다");
    expect(markup).not.toContain("파우치에서 뺄 때마다");
    expect(markup).toContain("파우치에서 제품을 빼도 이력은 지우지 않습니다");
    expect(markup).toContain("회원 번호만 지우고");
    expect(markup).toContain("개인을 알아볼 수 없는 통계 자료");
    expect(markup).toContain("회원 번호를 지운 뒤에는 특정 회원의 기록을 찾을 수 없습니다");
    expect(markup).toContain("제품의 수분감·유분감 정보를 개선");
  });

  it("처리방침에 루틴의 저장 항목, 공개 범위, 가져간 사본과 탈퇴 후 처리를 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain(
      "회원 번호, 루틴 이름, 메모, 공개 여부, 아침·저녁에 쓰는 제품 번호와 순서, 만들고 고친 시각",
    );
    expect(markup).toContain("댓글을 단 루틴 번호와 댓글 내용, 작성 시각");
    expect(markup).toContain("작성자의 닉네임, 프로필 사진, 피부 타입(건성·지성·복합성)이 로그인하지 않은");
    expect(markup).toContain("민감성 피부 여부와 성별·나이대는 보이지 않습니다");
    expect(markup).toContain("루틴 이름 앞에 작성자의 닉네임을 붙이고 메모와 제품을 복사해");
    expect(markup).toContain("공개 루틴과 루틴에 남긴 좋아요·댓글은 바로");
    expect(markup).toContain("다른 회원이 가져간 루틴 사본은 그 회원의 루틴이므로 이 작업에서 삭제하지 않습니다");
    expect(markup).toContain("내가 쓴 댓글을 고치거나 지울 수 있습니다");
  });

  it("처리방침에 PostHog가 실제로 저장하는 IP 주소·위치·유입 정보와 화면 조작 기록에 담기는 화면을 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("IP 주소, 운영체제, 브라우저 종류와 버전(User-Agent 원문 포함)");
    expect(markup).toContain("우편번호, 대략적인 위도·경도");
    expect(markup).toContain("gclid·fbclid 같은 광고 클릭 ID");
    expect(markup).toContain("마지막으로 이용한 날로부터 1년이 지난 뒤 분기마다 하는 정리 작업에서 삭제");
    expect(markup).toContain("파우치에 담은 제품과 평가, 루틴과 댓글이 포함될 수 있습니다");
  });

  it("처리방침에 문의 알림에는 이용자가 적은 내용을 보내지 않고 Discord를 수탁자로 두지 않는다고 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain(
      "이용자가 적은 내용과 제품명·브랜드명, 문의를 연 화면 주소, 첨부한 이미지는 담지 않습니다",
    );
    expect(markup).not.toContain("Discord Inc.");
    expect(markup).not.toContain("privacy@discord.com");
  });

  it("처리방침에 나만의 필터와 제품 정보 수정 요청을 실제 저장 항목대로 안내하고 푸시 알림은 아직 적지 않는다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("회원 번호, 회원이 고른 성분 번호, 추가·수정 시각");
    expect(markup).toContain("제품 정보 수정 요청이면 대상 제품 번호");
    expect(markup).not.toContain("푸시");
  });

  it("처리방침에 서버 오류 기록과 모니터링 서버의 요약 보관을 안내한다", () => {
    const markup = renderToStaticMarkup(PrivacyPage());

    expect(markup).toContain("서버 오류 기록");
    expect(markup).toContain("관련 회원 번호와 제품·의견 번호 같은 식별 번호");
    expect(markup).toContain(
      "모니터링 서버에는 오류 메시지와 발생 위치를 뺀 요약(발생 시각, 오류가 난 기능, 식별 번호)만 7일 보관",
    );
    expect(markup).toContain("모니터링 서버의 오류 요약은 7일이 지나면 삭제합니다");
    expect(markup).toContain("접속 기록, 서버 검색 기록과 서버 오류 기록은");
  });

  it("개정 예정 약관에 파우치와 나만의 필터, 성분 분석의 한계를 안내한다", () => {
    const markup = renderToStaticMarkup(<ScheduledTerms />);

    expect(markup).toContain("파우치와 성분 분석, 나만의 필터, 루틴과 공개 루틴의");
    expect(markup).toContain("건성·지성·복합성 중 선택하고 피부가 민감한 편인지는 따로 선택");
    expect(markup).not.toContain("건성·지성·민감성·복합성");
    expect(markup).toContain("계정·프로필·저장함·파우치·나만의 필터·루틴·좋아요·댓글을 탈퇴 후 30일 보관");
    expect(markup).toContain("계정·프로필·위시리스트·파우치·나만의 필터·루틴을 삭제하지 않습니다");
    expect(markup).toContain("고른 성분이 피부 문제의 원인이라는 판단이 아니며");
  });

  it("개정 예정 약관에 게시물의 권리와 이용 허락, 금지 게시물과 팀의 조치, 탈퇴 후 처리를 안내한다", () => {
    const markup = renderToStaticMarkup(<ScheduledTerms />);

    expect(markup).toContain("게시물 — 회원이 공개로 설정한 루틴(루틴 이름, 메모, 제품 구성)과 공개 루틴에 남긴 댓글");
    expect(markup).toContain("제8조 게시물");
    expect(markup).toContain("게시물에 대한 권리는 작성한 회원에게 있습니다");
    expect(markup).toContain("다른 회원이 공개 루틴을 가져가 자기 루틴으로 저장하는 것을 허락합니다");
    expect(markup).toContain("필요한 범위에서 숨기거나 삭제할 수 있습니다");
    expect(markup).toContain("다른 회원이 가져간 루틴은 그 회원의 루틴이므로 이 작업에서 삭제하지 않습니다");
    expect(markup).toContain("제13조 준거법과 분쟁 해결");
  });

  it("이용약관에 순위 산정 기준과 한계를 안내한다", () => {
    const markup = renderToStaticMarkup(<ScheduledTerms />);

    expect(markup).toContain("2026년 12월 9일");
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
    expect(markup).toContain("제품 상세 화면 조회 횟수를 기준으로 보여 줍니다");
    expect(markup).toContain("판매량, 품질, 효능, 안전성 또는 팀의 추천을 뜻하지 않습니다");
  });

  it("현재 약관을 기본으로 제공하고 개정 예정 약관은 접힌 펼침 영역에 둔다", async () => {
    const { container } = render(<TermsPage />);
    const trigger = screen.getByRole("button", { name: "2026년 12월 9일 시행 예정 약관 펼쳐보기" });
    const scheduled = document.getElementById(trigger.getAttribute("aria-controls") ?? "");

    expect(screen.getByText("시행일 2026년 10월 4일")).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // 접힌 동안에도 문서에는 남아 페이지 안 찾기와 검색엔진이 읽는다.
    expect(scheduled).not.toBeVisible();
    expect(scheduled).toHaveTextContent("장애 복구용 DB 백업은 생성 후 30일이 지나면");

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(scheduled).toBeVisible();

    const currentArticles = Array.from(container.querySelectorAll("main > section"));
    expect(currentArticles).toHaveLength(14);
    expect(currentArticles.map((article) => article.textContent).join(" ")).toContain('피부 타입은 "모름"을 선택할 수');
    expect(currentArticles.map((article) => article.textContent).join(" ")).not.toContain(
      "장애 복구용 DB 백업은 생성 후 30일이 지나면",
    );
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
