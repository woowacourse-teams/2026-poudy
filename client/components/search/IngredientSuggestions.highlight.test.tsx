/**
 * @vitest-environment jsdom
 */
import type { IngredientSuggestionResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IngredientSuggestions } from "./IngredientSuggestions";

const item = (match: IngredientSuggestionResponse["match"]): IngredientSuggestionResponse => ({
  id: 6,
  koreanName: "판테놀",
  englishName: "Panthenol",
  skinEffects: [],
  match,
});

const show = (match: IngredientSuggestionResponse["match"]) =>
  render(
    <IngredientSuggestions
      items={[item(match)]}
      loading={false}
      includedIds={[]}
      excludedIds={[]}
      onToggle={vi.fn()}
    />,
  );

/** 색이 얹힌 토막만 모은다. 낭독기용 온전한 이름은 세지 않는다. */
const marked = () =>
  Array.from(document.querySelectorAll("span.text-brand-strong")).map((element) => element.textContent);

/** 줄에 눈으로 보이는 글자. 낭독기용으로 숨겨 둔 이름은 빼고 읽는다. */
const text = () => {
  const row = screen.getByRole("listitem");
  Array.from(row.querySelectorAll(".sr-only")).forEach((node) => node.remove());

  return row.querySelector("span")?.textContent?.trim();
};

describe("자동완성 하이라이팅", () => {
  it("서버가 짚어 준 자리만 색으로 가른다", () => {
    show({ field: "KOREAN_NAME", text: "판테놀", startIndex: 0, endIndexExclusive: 2 });

    expect(marked()).toEqual(["판테"]);
  });

  it("초성으로 걸린 줄도 색이 얹힌다", () => {
    // `ㅍㅌㄴ` 은 이름 안에 그대로 있지 않다. 클라이언트가 다시 찾으면 못 찾는 자리다.
    show({ field: "KOREAN_NAME", text: "판테놀", startIndex: 0, endIndexExclusive: 3 });

    expect(marked()).toEqual(["판테놀"]);
  });

  it("이명으로 걸리면 대표 이름을 앞에 두고 이명을 덧붙인다", () => {
    show({ field: "ALIAS", text: "프로비타민B5", startIndex: 0, endIndexExclusive: 4 });

    // 진해지는 것은 이명 안의 맞은 자리뿐이다. 대표 이름은 흐려지지 않는다.
    expect(marked()).toEqual(["프로비타"]);
    expect(text()).toBe("판테놀 · 프로비타민B5");
  });

  it("영문 이름으로 걸려도 한글 이름이 앞에 선다", () => {
    // 한글 목록에서 `Glycerin` 이 먼저 오면 같은 성분이 검색어마다 다른 이름으로 보인다.
    show({ field: "ENGLISH_NAME", text: "Panthenol", startIndex: 0, endIndexExclusive: 4 });

    expect(text()).toBe("판테놀 · Panthenol");
    expect(marked()).toEqual(["Pant"]);
  });

  it("범위가 글자 밖을 가리키면 색을 얹지 않는다", () => {
    show({ field: "KOREAN_NAME", text: "판테놀", startIndex: 0, endIndexExclusive: 99 });

    expect(marked()).toEqual([]);
    expect(screen.getByText("판테놀")).toBeInTheDocument();
  });

  it("낭독기에는 토막이 아니라 온전한 이름이 남는다", () => {
    show({ field: "KOREAN_NAME", text: "판테놀", startIndex: 0, endIndexExclusive: 2 });

    expect(screen.getByRole("list", { name: "성분 검색 결과" })).toHaveTextContent("판테놀");
  });
});
