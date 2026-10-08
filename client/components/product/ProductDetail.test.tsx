/**
 * @vitest-environment jsdom
 */
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductDetail } from "./ProductDetail";

import { track } from "@/lib/analytics/track";
import { productDetails, untaggedProductDetail } from "@/mocks/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("@/lib/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/products")>()),
  fetchIngredientDetail: vi.fn(async (id: number) => ({ id, description: `성분 ${id} 설명` })),
  fetchIngredientGroup: vi.fn(async (code: string) => ({
    code,
    name: "글라이콜 계열",
    englishName: "Glycols",
    description: "수분을 붙잡는 글라이콜 성분이에요.",
    ingredients: [],
  })),
}));

describe("제품 성분 요약", () => {
  it("제품 조회에 상세 진입 경로를 남긴다", async () => {
    render(<ProductDetail product={untaggedProductDetail} entryPoint="saved" />);

    await vi.waitFor(() =>
      expect(track).toHaveBeenCalledWith("product_viewed", {
        product_id: untaggedProductDetail.id,
        category: untaggedProductDetail.categories[0]?.name,
        entry_point: "saved",
      }),
    );
  });

  it("상세에서 보관할 때도 상세 진입 경로를 남긴다", async () => {
    render(<ProductDetail product={untaggedProductDetail} entryPoint="home_category" />);

    await userEvent.click(screen.getAllByRole("button", { name: /저장$/ })[0]);

    expect(track).toHaveBeenCalledWith("product_saved", {
      product_id: untaggedProductDetail.id,
      save_source: "product_detail",
      entry_point: "home_category",
    });
  });

  it("문서의 대표 제목으로 바 문구가 아니라 제품명을 쓴다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("더마 릴리프 썬스크린");
    expect(screen.getByText("제품 상세").tagName).toBe("P");
  });

  it("첫 화면의 대표 이미지만 즉시 불러온다", () => {
    const { container } = render(<ProductDetail product={untaggedProductDetail} />);
    const compactImage = summaryBar().querySelector("img");
    const mainImage = container.querySelector("main section img");

    expect(mainImage).toHaveAttribute("loading", "eager");
    expect(compactImage).toHaveAttribute("loading", "lazy");
  });

  it("대표 이미지에 브랜드와 제품명을 설명한다", () => {
    const product = productDetails[0];
    const { container } = render(<ProductDetail product={product} />);
    const mainImage = container.querySelector("main section img");

    expect(mainImage).toHaveAttribute("alt", `${product.brand.name} ${product.name} 제품 이미지`);
  });

  it("전성분 펼쳐보기 버튼을 본문 폭에 꽉 채운다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const toggle = screen.getByRole("button", { name: "나머지 19개 성분 펼쳐보기" });

    expect(toggle).toHaveClass("w-full", "bg-[#DEE2E9]");
  });

  it("펼치기 전에도 전성분 전체를 본문에 그려 두고 보이기만 감춘다", () => {
    const { container } = render(<ProductDetail product={untaggedProductDetail} />);

    const links = container.querySelectorAll('a[href^="/ingredients/"]');
    const sixth = links[5]?.closest("li");

    expect(links).toHaveLength(untaggedProductDetail.selectedPart?.ingredients.length ?? 0);
    expect(links[0]?.closest("li")).not.toHaveAttribute("hidden");
    expect(sixth).toHaveAttribute("hidden");

    act(() => screen.getByRole("button", { name: "나머지 19개 성분 펼쳐보기" }).click());

    expect(sixth).not.toHaveAttribute("hidden");
  });

  it("카테고리 경로의 대분류와 소분류를 각각의 목록으로 잇는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveAttribute("href", "/categories/13");
    expect(within(path).getByRole("link", { name: "선크림 카테고리 제품" })).toHaveAttribute("href", "/categories/14");
  });

  it("브랜드명을 브랜드관으로 잇는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveAttribute("href", "/brands/6");
  });

  it("보이는 이름을 그대로 담은 이름으로 어디로 가는지 알린다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveTextContent("선케어");
    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveTextContent("셀퓨전씨");
  });

  it("이동할 수 있는 카테고리와 브랜드는 누르는 동안 옅어진다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveClass("active:opacity-60");
    expect(within(path).getByRole("link", { name: "선크림 카테고리 제품" })).toHaveClass("active:opacity-60");
    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveClass("active:opacity-60");
  });

  it("이동할 수 있는 카테고리와 브랜드의 누를 자리를 넓힌다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });
    const links = [
      within(path).getByRole("link", { name: "선케어 카테고리 제품" }),
      within(path).getByRole("link", { name: "선크림 카테고리 제품" }),
      screen.getByRole("link", { name: "셀퓨전씨 브랜드관" }),
    ];

    // 여백으로 넓히면 경로의 높이가 바뀐다. 위아래로 겹쳐 그린 가상 요소가 손을 받는다.
    links.forEach((link) => expect(link).toHaveClass("relative", "after:-inset-y-1.5"));
  });

  it("상세 구역을 24px씩 띄우고 출처 안내를 회색 상자에 담는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const caution = screen.getByRole("heading", { name: "주의 성분 확인" }).closest("section");
    const source = screen.getByRole("heading", { name: "정보 출처" }).closest("section");

    expect(caution?.parentElement).toHaveClass("gap-6");
    expect(source).toHaveClass("bg-[#EFF1F5]");
  });
});

/** 지켜보는 자리마다 하나씩. 각자 제 자리의 `rootMargin` 을 기억한다. */
const observers: { readonly margin: number; readonly notify: IntersectionObserverCallback }[] = [];

/**
 * 지켜보는 자리를 화면 위 `top` 에 두고 IntersectionObserver 가 알리는 것을 흉내 낸다.
 *
 * 진짜 관찰자는 제 자리를 넘는 순간에만 알려 온다. 넘지 않은 자리는 잠자코 있어야
 * 되돌아올 때 생기던 문제가 시험에도 그대로 나타난다.
 */
const scrollSummaryEndTo = (top: number, previousTop = Infinity) => {
  act(() => {
    observers
      .filter(({ margin }) => top < margin !== previousTop < margin)
      .forEach(({ notify }) =>
        notify([{ boundingClientRect: { top } } as IntersectionObserverEntry], {} as IntersectionObserver),
      );
  });
};

/** 축약형이 드러나는 때를 IntersectionObserver 가 알려 준다. 그 자리를 대신 두드린다. */
const scrollPastSummary = () => scrollSummaryEndTo(-1);

const summaryBar = () => document.querySelector(".product-summary-bar") as HTMLElement;

/** 용량이 둘인 제품(1025 독도 토너). 이름이 긴 제품을 확인하는 데 쓴다. */
const multiVariantProduct = productDetails[0];

describe("제품 상세 머리 고정", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observers.push({ margin: -parseFloat(String(options?.rootMargin ?? "0")), notify: callback });
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("뒤로가기를 단 머리를 화면 위에 붙이고 바텀시트보다 아래에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const header = screen.getByText("제품 상세").closest("header")?.parentElement;

    expect(header).toHaveClass("sticky", "top-0", "z-30", "bg-background");
  });

  it("원래 배치가 지나가기 전에는 축약형을 감추고 손도 받지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
    expect(summaryBar()).toHaveAttribute("inert");
  });

  it("원래 배치가 머리 아래로 지나가면 축약형이 그 자리를 이어받는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollPastSummary();

    expect(summaryBar()).toHaveAttribute("data-stuck", "true");
    expect(summaryBar()).not.toHaveAttribute("inert");
  });

  it("나타난 뒤에는 나타난 자리로 조금 되돌아와도 그대로 남는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollPastSummary();
    // 나타나는 자리(44)는 다시 넘겼지만 사라지는 자리(44+24)에는 못 미친 그사이.
    scrollSummaryEndTo(50, -1);

    expect(summaryBar()).toHaveAttribute("data-stuck", "true");
  });

  it("사라지는 자리까지 거슬러 올라가야 축약형이 물러난다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollPastSummary();
    scrollSummaryEndTo(68, -1);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
  });

  it("그사이에 머물러 있으면 나타난 적 없는 축약형은 나오지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollSummaryEndTo(50);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
  });

  it("한참 내려갔다 되돌아와도 사라지는 자리를 넘으면 축약형이 물러난다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    // 한참 내려가면 지켜보는 자리를 둘 다 지나 알림이 끊긴다.
    scrollSummaryEndTo(-800);
    scrollSummaryEndTo(300, -800);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
  });

  it("되돌아오다 그사이에 멈추면 축약형이 그대로 남는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollSummaryEndTo(-800);
    // 나타나는 자리(44)는 넘었지만 사라지는 자리(68)에는 못 미친 그사이.
    scrollSummaryEndTo(50, -800);

    expect(summaryBar()).toHaveAttribute("data-stuck", "true");
  });

  it("축약형에도 브랜드·제품명·유수분·저장 버튼이 모두 남는다", () => {
    render(<ProductDetail product={multiVariantProduct} />);
    scrollPastSummary();

    const bar = within(summaryBar());

    expect(bar.getByText(multiVariantProduct.brand.name)).toBeInTheDocument();
    expect(bar.getByText(multiVariantProduct.name)).toBeInTheDocument();
    expect(bar.getByText("수분")).toBeInTheDocument();
    expect(bar.getByText("유분")).toBeInTheDocument();
    expect(bar.getByRole("button", { name: `${multiVariantProduct.name} 저장` })).toBeInTheDocument();
    expect(summaryBar().querySelector("img")).toBeInTheDocument();
  });

  it("축약형의 제품명은 길어져도 한 줄로 줄인다", () => {
    render(<ProductDetail product={multiVariantProduct} />);

    expect(within(summaryBar()).getByText(multiVariantProduct.name).closest("p")).toHaveClass("truncate");
  });
});

describe("정보 출처", () => {
  it("수정 제안으로 제품 정보 정정 화면에 간다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("link", { name: "정보가 다르다면 수정을 제안해 주세요" })).toHaveAttribute(
      "href",
      `/inquiry/products/${untaggedProductDetail.id}`,
    );
  });
});

describe("성분 정보 선택 차단", () => {
  it("주의 성분 확인과 전체 성분에 선택을 막는 표시를 단다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { name: "주의 성분 확인" }).closest("section")).toHaveAttribute(
      "data-no-select",
    );
    expect(screen.getByRole("heading", { name: "전체 성분" }).closest("section")).toHaveAttribute("data-no-select");
  });

  it("쓰임새별 성분에도 선택을 막는 표시를 단다", () => {
    render(<ProductDetail product={productDetails[0]} />);

    expect(screen.getByRole("heading", { name: "쓰임새별 성분" }).closest("section")).toHaveAttribute("data-no-select");
  });

  it("제품 이름과 정보 출처는 그대로 선택된다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { level: 1 }).closest("[data-no-select]")).toBeNull();
    expect(screen.getByRole("heading", { name: "정보 출처" }).closest("[data-no-select]")).toBeNull();
  });
});

describe("쓰임새별 성분", () => {
  const taggedProduct = productDetails[0]!;

  /* 같은 말이 유수분 태그에도 있어 쓰임새 영역 안에서만 친다. */
  const usageRow = (name: string) => {
    const section = screen.getByRole("heading", { name: "쓰임새별 성분" }).closest("section")!;

    return within(section).getByText(name).closest("li")!;
  };

  it("서버의 작용 이름 대신 디자인이 정한 짧은 이름을 쓴다", () => {
    render(<ProductDetail product={taggedProduct} />);

    expect(usageRow("수분")).toBeInTheDocument();
  });

  it("성분 칩마다 성분 설명으로 가는 링크를 둔다", () => {
    render(<ProductDetail product={taggedProduct} />);

    const row = within(usageRow("수분"));

    expect(row.getByRole("link", { name: "부틸렌글라이콜" })).toHaveAttribute("href", "/ingredients/2");
    expect(row.getByRole("link", { name: "판테놀" })).toHaveAttribute("href", "/ingredients/6");
  });

  it("성분 칩을 누르면 화면을 떠나지 않고 성분 시트를 연다", async () => {
    render(<ProductDetail product={taggedProduct} />);

    await userEvent.click(within(usageRow("수분")).getByRole("link", { name: "판테놀" }));

    const sheet = await screen.findByRole("dialog", { name: "판테놀" });

    expect(await within(sheet).findByText("성분 6 설명")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "판테놀 자세히 보기" })).toHaveAttribute(
      "href",
      "/ingredients/6?from=ingredient_sheet",
    );
  });

  it("시트를 열고 닫으면 연 대상과 닫은 방법을 남긴다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={taggedProduct} />);

    await userEvent.click(within(usageRow("수분")).getByRole("link", { name: "판테놀" }));
    const sheet = await screen.findByRole("dialog", { name: "판테놀" });
    await userEvent.click(within(sheet).getByRole("button", { name: "닫기" }));

    const target = { sheet_type: "ingredient", product_id: taggedProduct.id, ingredient_id: 6 };
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", target);
    expect(track).toHaveBeenCalledWith("ingredient_sheet_closed", {
      ...target,
      close_method: "close_button",
      open_seconds: expect.any(Number),
    });
  });
});

describe("성분군 칩", () => {
  const bundledProduct = {
    ...productDetails[0]!,
    selectedPart: {
      ...productDetails[0]!.selectedPart!,
      skinEffectGroups: [
        {
          id: "1",
          code: "HYDRATION_RELATED" as const,
          name: "보습",
          ingredientIds: [2, 3, 6],
          items: [
            {
              ingredientGroup: { code: "GLYCOLS", name: "글라이콜 계열" },
              ingredients: [
                { id: 2, koreanName: "부틸렌글라이콜" },
                { id: 3, koreanName: "글리세린" },
              ],
            },
            { ingredientGroup: null, ingredients: [{ id: 6, koreanName: "판테놀" }] },
          ],
        },
      ],
    },
  };

  const usageSection = () => screen.getByRole("heading", { name: "쓰임새별 성분" }).closest("section")!;

  it("같은 성분군 성분을 개수를 붙인 칩 하나로 묶고 성분군 설명으로 잇는다", () => {
    render(<ProductDetail product={bundledProduct} />);

    const section = within(usageSection());

    expect(section.getByRole("link", { name: "글라이콜 2종" })).toHaveAttribute(
      "href",
      "/ingredient-groups/GLYCOLS?from=product_detail",
    );
    expect(section.getByRole("link", { name: "판테놀" })).toHaveAttribute("href", "/ingredients/6");
  });

  it("성분군 칩을 누르면 이 제품에 든 성분을 담은 성분군 시트를 연다", async () => {
    render(<ProductDetail product={bundledProduct} />);

    await userEvent.click(within(usageSection()).getByRole("link", { name: "글라이콜 2종" }));

    const sheet = within(await screen.findByRole("dialog", { name: "글라이콜" }));

    expect(sheet.getByText("2종")).toBeInTheDocument();
    expect(await sheet.findByText("수분을 붙잡는 글라이콜 성분이에요.")).toBeInTheDocument();
    expect(sheet.getByRole("link", { name: /부틸렌글라이콜/ })).toHaveAttribute(
      "href",
      "/ingredients/2?from=ingredient_group_sheet",
    );
    expect(sheet.getByRole("link", { name: /글리세린/ })).toHaveAttribute(
      "href",
      "/ingredients/3?from=ingredient_group_sheet",
    );
    expect(sheet.getByRole("link", { name: "글라이콜 성분군 자세히 보기" })).toHaveAttribute(
      "href",
      "/ingredient-groups/GLYCOLS?from=ingredient_group_sheet",
    );
  });
});

describe("주의 성분 확인", () => {
  const itemOf = (text: string) => screen.getByText(text).closest("li");

  it("들어 있는 기준 수를 머리에 알리고 앞에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const list = screen.getByRole("heading", { name: "주의 성분 확인" }).closest("section")!.querySelector("ul")!;

    expect(screen.getByText("6개 중 1개 포함")).toHaveClass("text-[#C53030]");
    expect(list.firstElementChild).toHaveTextContent("향료/알레르기 성분 있음");
  });

  it("들어 있지 않은 기준은 없음으로 표시한다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(itemOf("건조 알코올 없음")).toBeInTheDocument();
  });

  const part = untaggedProductDetail.selectedPart!;
  const [first, second] = part.ingredients;
  const excludeCodes = [
    {
      code: "FRAGRANCE_ALLERGENS",
      name: "향료/알레르기 성분",
      description: "착향 목적의 성분이에요.",
      ingredients: [{ id: first!.id, koreanName: first!.koreanName, englishName: first!.englishName }],
    },
    {
      code: "DRYING_ALCOHOLS",
      name: "건조 알코올",
      description: "피부를 건조하게 할 수 있는 알코올이에요.",
      ingredients: [{ id: -1, koreanName: "에탄올", englishName: "Alcohol" }],
    },
  ];

  it("기준을 누르면 성분군 시트를 열고 이 제품에 든 해당 성분을 보여 준다", async () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "향료/알레르기 성분 있음" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("향료/알레르기 성분")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: new RegExp(first!.koreanName) })).toBeInTheDocument();
    expect(within(sheet).queryByText(second!.koreanName)).not.toBeInTheDocument();
  });

  it("들어 있지 않은 기준은 성분 목록 없이 성분군 설명만 보여 준다", async () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "건조 알코올 없음" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).queryByRole("heading", { name: "이 제품에 든 성분" })).not.toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: /성분군 자세히 보기/ })).toHaveAttribute(
      "href",
      "/ingredient-groups/DRYING_ALCOHOLS?from=caution_sheet",
    );
  });

  it("기준 시트를 열고 자세히 보기로 떠나면 주의 성분 시트로 남긴다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "건조 알코올 없음" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("link", { name: /성분군 자세히 보기/ }));

    const target = { sheet_type: "caution", product_id: untaggedProductDetail.id, group_code: "DRYING_ALCOHOLS" };
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", target);
    expect(track).toHaveBeenCalledWith("ingredient_sheet_closed", {
      ...target,
      close_method: "detail_link",
      open_seconds: expect.any(Number),
    });
  });

  it("성분군 코드를 찾지 못한 기준은 누를 수 없게 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    expect(screen.queryByRole("link", { name: "합성 색소 없음" })).not.toBeInTheDocument();
    expect(screen.getByText(/합성 색소/)).toBeInTheDocument();
  });

  it("들어 있는 기준이 없으면 모두 없다고 알린다", () => {
    const product = {
      ...untaggedProductDetail,
      selectedPart: {
        ...untaggedProductDetail.selectedPart!,
        excludeGroups: untaggedProductDetail.selectedPart!.excludeGroups.map((group) => ({
          ...group,
          contains: false,
        })),
      },
    };
    render(<ProductDetail product={product} />);

    expect(screen.getByText("6개 모두 없음")).toHaveClass("text-[#0A6B52]");
  });
});

describe("구성품 탭", () => {
  const setProduct = {
    ...productDetails[0]!,
    productParts: [
      { id: 11, name: "아쿠아 세럼", cautionCount: 0 },
      { id: 12, name: "인텐스 크림", cautionCount: 2 },
    ],
    selectedPart: { ...productDetails[0]!.selectedPart!, id: 12, name: "인텐스 크림" },
  };

  it("다른 구성품 탭을 누르면 바꾼 구성품과 이전 구성품을 남긴다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={setProduct} />);

    const tabs = within(screen.getByRole("tablist", { name: "구성품" }));
    await userEvent.click(tabs.getByRole("tab", { name: "인텐스 크림, 주의 성분 있음" }));
    await userEvent.click(tabs.getByRole("tab", { name: "아쿠아 세럼, 주의 성분 없음" }));

    const selections = vi.mocked(track).mock.calls.filter(([event]) => event === "product_part_selected");
    // 이미 고른 탭을 다시 누른 것은 남기지 않는다.
    expect(selections).toEqual([
      ["product_part_selected", { product_id: setProduct.id, part_id: 11, previous_part_id: 12 }],
    ]);
  });

  it("구성품이 하나면 탭을 두지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.queryByRole("tablist", { name: "구성품" })).not.toBeInTheDocument();
  });

  it("구성품마다 그 구성품을 고른 주소로 가는 탭을 두고 고른 탭을 표시한다", () => {
    render(<ProductDetail product={setProduct} />);

    const tabs = within(screen.getByRole("tablist", { name: "구성품" }));

    expect(tabs.getByRole("tab", { name: "아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute(
      "href",
      "/products/1?partId=11",
    );
    expect(tabs.getByRole("tab", { name: "인텐스 크림, 주의 성분 있음" })).toHaveAttribute("aria-selected", "true");
    expect(tabs.getByRole("tab", { name: "아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute("aria-selected", "false");
  });

  it("고른 구성품의 성분 정보를 그 탭이 이름 붙인 패널에 담는다", () => {
    render(<ProductDetail product={setProduct} />);

    expect(screen.getByRole("tabpanel", { name: "인텐스 크림, 주의 성분 있음" })).toContainElement(
      screen.getByRole("heading", { name: "주의 성분 확인" }),
    );
  });

  it("탭 주소에 진입 경로를 이어 붙여 조회 이벤트가 다시 나가지 않게 한다", () => {
    render(<ProductDetail product={setProduct} entryPoint="saved" />);

    const tabs = within(screen.getByRole("tablist", { name: "구성품" }));

    expect(tabs.getByRole("tab", { name: "아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute(
      "href",
      "/products/1?partId=11&from=saved",
    );
  });

  /** jsdom 은 배치를 하지 않아 폭이 모두 0 이다. 바와 탭 내용의 폭을 정해 둔다. */
  const layOut = ({ bar, content }: { readonly bar: number; readonly content: number }) => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(bar);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-tab-content") ? content : 0;
    });
  };

  afterEach(() => vi.restoreAllMocks());

  it("탭 내용이 바에 들어가면 폭을 똑같이 나눈다", () => {
    // 내용 85 + 여백 24 를 두 번 더하면 218 이고, 390 화면에서 양옆 16 을 뺀 358 안에 든다.
    layOut({ bar: 390, content: 85 });
    render(<ProductDetail product={setProduct} />);

    const tab = screen.getByRole("tab", { name: "아쿠아 세럼, 주의 성분 없음" });

    expect(tab).toHaveClass("flex-1", "basis-0");
    expect(screen.getByRole("tablist").parentElement).toHaveClass("px-4");
  });

  it("탭 내용이 바를 넘치면 내용 폭 그대로 두고 가로로 밀게 한다", () => {
    layOut({ bar: 390, content: 200 });
    render(<ProductDetail product={setProduct} />);

    const tab = screen.getByRole("tab", { name: "아쿠아 세럼, 주의 성분 없음" });

    expect(tab).not.toHaveClass("flex-1");
    expect(screen.getByRole("tablist").parentElement).toHaveClass("px-1", "overflow-x-auto");
  });

  it("고른 구성품이 없으면 성분 구역을 그리지 않는다", () => {
    render(<ProductDetail product={{ ...untaggedProductDetail, productParts: [], selectedPart: null }} />);

    expect(screen.queryByRole("heading", { name: "주의 성분 확인" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "정보 출처" })).toBeInTheDocument();
  });
});

describe("성분이 비슷한 제품", () => {
  const similar = [
    {
      id: 3,
      name: "다이브인 저분자 히알루론산 토너",
      brand: { id: 2, name: "토리든", englishName: "TORRIDEN", imageUrl: "" },
      imageUrl: "",
      partId: 3,
      containsExcludedIngredient: false,
    },
    {
      id: 2,
      name: "어성초 77 수딩 토너",
      brand: { id: 3, name: "아누아", englishName: "ANUA", imageUrl: "" },
      imageUrl: "",
      partId: 21,
      containsExcludedIngredient: true,
    },
  ];

  it("비슷한 제품이 없으면 섹션을 그리지 않는다", () => {
    render(<ProductDetail product={productDetails[0]!} similarProducts={[]} />);

    expect(screen.queryByRole("heading", { name: "성분이 비슷한 제품" })).not.toBeInTheDocument();
  });

  it("비교한 구성품으로 여는 링크를 두고 진입 경로를 남긴다", () => {
    render(<ProductDetail product={productDetails[0]!} similarProducts={similar} />);

    const section = within(screen.getByRole("heading", { name: "성분이 비슷한 제품" }).closest("section")!);

    expect(section.getByRole("link", { name: /어성초 77 수딩 토너/ })).toHaveAttribute(
      "href",
      "/products/2?partId=21&from=similar_product",
    );
  });

  it("주의 성분이 들었는지 칩으로 알린다", () => {
    render(<ProductDetail product={productDetails[0]!} similarProducts={similar} />);

    const section = within(screen.getByRole("heading", { name: "성분이 비슷한 제품" }).closest("section")!);

    expect(within(section.getByRole("link", { name: /다이브인/ })).getByText("주의 없음")).toBeInTheDocument();
    expect(within(section.getByRole("link", { name: /어성초/ })).getByText("주의")).toBeInTheDocument();
  });
});
