/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IngredientTitle } from "./IngredientTitle";

/** jsdom 은 글자를 앉히지 않아 높이가 늘 0 이다. 넘치는 상황만 흉내 낸다. */
const stubOverflow = (overflowing: boolean) => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(overflowing ? 90 : 30);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(30);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("성분 제목", () => {
  it("두 줄에 담기는 이름에는 여는 단추를 두지 않는다", () => {
    stubOverflow(false);
    render(<IngredientTitle koreanName="글리세린" englishName="Glycerin" />);

    expect(screen.getByRole("heading", { name: "글리세린" })).toHaveClass("line-clamp-2");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("넘치는 이름은 두 줄로 줄이고 눌러서 펼친다", async () => {
    stubOverflow(true);
    const name = "하이드록시에틸아크릴레이트/소듐아크릴로일다이메틸타우레이트코폴리머";
    render(
      <IngredientTitle
        koreanName={name}
        englishName="Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer"
      />,
    );

    const heading = screen.getByRole("heading", { name });
    const english = screen.getByText(/Hydroxyethyl Acrylate/);
    expect(heading).toHaveClass("line-clamp-2");
    expect(english).toHaveClass("line-clamp-2");

    await userEvent.click(screen.getByRole("button", { name: "전체 이름 보기" }));

    expect(heading).not.toHaveClass("line-clamp-2");
    expect(english).not.toHaveClass("line-clamp-2");
    expect(screen.getByRole("button", { name: "접기" })).toHaveAttribute("aria-expanded", "true");
  });
});
