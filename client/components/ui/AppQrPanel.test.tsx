/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppQrPanel } from "./AppQrPanel";

const STORE_URL = "https://play.google.com/store/apps/details?id=com.poudy.app&pcampaignid=web_share";

const link = () => screen.getByRole("link", { name: /앱 받기/ });

describe("앱 설치 QR 코드 패널", () => {
  /*
   * 앱은 Play 스토어에만 있다. 조건을 적지 않으면 iPhone 사용자가 찍어 본 뒤에야
   * 받을 수 없다는 것을 알게 된다.
   */
  it("안드로이드 전용임을 제목에서 알린다", () => {
    render(<AppQrPanel />);

    expect(screen.getByText(/안드로이드 앱으로 더 편하게/)).toBeInTheDocument();
  });

  it("화면 낭독기로도 안드로이드 전용임이 전해진다", () => {
    render(<AppQrPanel />);

    expect(screen.getByRole("complementary", { name: /안드로이드/ })).toBeInTheDocument();
  });

  /*
   * 줄바꿈은 눈으로 읽는 자리를 고른 것이라 문장 자체는 끊기지 않아야 한다.
   * `Play 스토어` 가 갈라지지 않도록 그 앞에서 줄을 바꾼다.
   */
  it("설명은 줄바꿈이 있어도 한 문장으로 읽힌다", () => {
    render(<AppQrPanel />);

    const description = screen.getByText(/QR 코드를 비추면/);

    expect(description.textContent).toBe("휴대전화 카메라로 QR 코드를 비추면 Play 스토어로 이동해요.");
    expect(description.querySelector("br")).toBeInTheDocument();
  });

  it("스토어 주소로 QR 코드를 그린다", () => {
    const { container } = render(<AppQrPanel />);

    /* QR 코드는 링크의 내용을 옮긴 그림이라 두 주소가 어긋나면 찍은 쪽만 엉뚱한 곳으로 간다. */
    expect(link()).toHaveAttribute("href", STORE_URL);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("새 창으로 열되 여는 쪽 정보를 넘기지 않는다", () => {
    render(<AppQrPanel />);

    expect(link()).toHaveAttribute("target", "_blank");
    expect(link()).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  /* 그림 자체에는 읽어 줄 것이 없다. 링크의 이름이 어디로 가는지 알린다. */
  it("QR 코드 그림은 화면 낭독기에서 감춘다", () => {
    const { container } = render(<AppQrPanel />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  /* 좁은 화면에서는 본문 옆에 설 자리가 없다. jsdom 은 미디어 질의를 재지 않으므로 클래스로 확인한다. */
  it("1024px 아래에서는 감춘다", () => {
    render(<AppQrPanel />);

    const panel = screen.getByRole("complementary");

    expect(panel).toHaveClass("hidden");
    expect(panel).toHaveClass("lg:grid");
  });

  it("스크롤을 따라 남도록 화면에 고정한다", () => {
    render(<AppQrPanel />);

    expect(screen.getByRole("complementary")).toHaveClass("fixed");
  });

  /* 본문을 읽어 내려간 뒤에 눈에 들도록 위쪽은 비워 둔다. */
  it("여백의 아래쪽에 세운다", () => {
    render(<AppQrPanel />);

    expect(screen.getByRole("complementary")).toHaveClass("bottom-[calc(var(--bottom-navigation-height)+2rem)]");
  });

  /* 본문은 뷰포트 가운데에 놓인다. 패널이 그 폭을 침범하면 본문 카드와 겹친다. */
  it("본문 왼쪽에 남는 여백만큼만 차지한다", () => {
    render(<AppQrPanel />);

    expect(screen.getByRole("complementary")).toHaveStyle({
      left: "0",
      width: "calc(50% - var(--container-md) / 2)",
    });
  });
});
