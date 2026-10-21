/**
 * @vitest-environment jsdom
 */
import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { act, render as renderElement, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductDetail } from "./ProductDetail";

import { track } from "@/lib/analytics/track";
import { fetchIngredientGroup } from "@/lib/api/products";
import { addShelfProduct, removeShelfProduct } from "@/lib/api/shelf";
import type { UserProductState } from "@/lib/api/user-product.server";
import { productDetails, untaggedProductDetail } from "@/mocks/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("@/lib/api/shelf", () => ({
  addShelfProduct: vi.fn(),
  updateShelfProduct: vi.fn(),
  removeShelfProduct: vi.fn(async () => undefined),
}));

/** 공유가 주소 복사로 끝나면 토스트로 알리므로 앱처럼 ToastProvider 안에 그린다. */
const render = (ui: React.ReactElement) => renderElement(ui, { wrapper: ToastProvider });

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
  it("유수분 미제공 제품은 본문과 상단 내비의 제품 요약에 유수분 태그를 표시하지 않는다", () => {
    const { container } = render(
      <ProductDetail product={{ ...productDetails[0], moistureLevel: null, oilLevel: null }} />,
    );
    expect(container.querySelector("main section")).not.toHaveTextContent("수분");
    expect(container.querySelector("main section")).not.toHaveTextContent("유분");
    expect(container.querySelector("header")).not.toHaveTextContent("수분");
    expect(container.querySelector("header")).not.toHaveTextContent("유분");
  });

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
    render(
      <ProductDetail
        product={untaggedProductDetail}
        entryPoint="home_category"
        userProduct={{ status: "ready", wishlisted: false, shelved: false }}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "위시리스트에 담기" })[0]);

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
    const compactImage = container.querySelector("header img");
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

    const toggle = screen.getByRole("button", { name: "나머지 18개 성분 펼쳐보기" });

    expect(toggle).toHaveClass("w-full", "bg-button-secondary");
  });

  it("펼치기 전에도 전성분 전체를 본문에 그려 두고 보이기만 감춘다", () => {
    const { container } = render(<ProductDetail product={untaggedProductDetail} />);

    const links = container.querySelectorAll('a[href^="/ingredients/"]');
    // 여섯째는 주의 성분이라 접힌 동안에도 보인다. 그 뒤의 일곱째부터 감춘다.
    const seventh = links[6]?.closest("li");

    expect(links).toHaveLength(untaggedProductDetail.selectedPart?.ingredients.length ?? 0);
    expect(links[0]?.closest("li")).not.toHaveAttribute("hidden");
    expect(links[5]?.closest("li")).not.toHaveAttribute("hidden");
    expect(seventh).toHaveAttribute("hidden");

    act(() => screen.getByRole("button", { name: "나머지 18개 성분 펼쳐보기" }).click());

    expect(seventh).not.toHaveAttribute("hidden");
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

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveClass("fb-dim");
    expect(within(path).getByRole("link", { name: "선크림 카테고리 제품" })).toHaveClass("fb-dim");
    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveClass("fb-dim");
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
    expect(source).toHaveClass("bg-layer");
  });
});

/** 관찰하는 요소와 알림. 표식이 상단 내비 아래로 지나간 것을 흉내 낼 때 쓴다. */
const observed = new Map<Element, IntersectionObserverCallback>();

/** 표식이 화면 위 `top` 에 온 것으로 알린다. 상단 내비(44) 위로 올라가면 지나간 것이다. */
const moveMarker = (marker: Element | null | undefined, top: number) => {
  const notify = marker ? observed.get(marker) : undefined;
  if (!notify) throw new Error("관찰하지 않는 표식이다.");
  act(() => {
    notify(
      [{ boundingClientRect: { top }, rootBounds: { top: 44 } } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
};

/** 제품명 바로 뒤의 표식 */
const summaryMarker = () => screen.getByRole("heading", { level: 1 }).nextElementSibling;
/** 본문 저장 버튼 묶음 바로 뒤의 표식 */
const saveMarker = () =>
  screen.getAllByRole("button", { name: "위시리스트에 담기" })[0]?.parentElement?.nextElementSibling;
/** 하단 고정 행동 바 */
const saveBar = () => screen.getAllByRole("button", { name: "위시리스트에 담기" })[1]?.closest("[data-shown], [inert]");

/** 용량이 둘인 제품(1025 독도 토너). 이름이 긴 제품을 확인하는 데 쓴다. */
const multiVariantProduct = productDetails[0];

describe("스크롤 후 제품 요약과 하단 행동 바(S24-1)", () => {
  beforeEach(() => {
    observed.clear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(element: Element) {
          observed.set(element, this.callback);
        }
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

  it("뒤로가기를 단 상단 내비를 화면 위에 붙인다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByText("제품 상세").closest("header")).toHaveClass("sticky", "top-0");
    // jsdom 에는 사이트 안 방문 기록이 없어 뒤로가기 자리에 홈으로 가는 링크가 선다.
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("제품명이 지나가기 전에는 내비 제목을 보이고 제품 요약은 감춘다", () => {
    const { container } = render(<ProductDetail product={multiVariantProduct} />);

    expect(screen.getByText("제품 상세")).not.toHaveAttribute("aria-hidden");
    expect(container.querySelector("header [data-swapped]")).not.toBeInTheDocument();
  });

  it("제품명이 상단 내비 아래로 지나가면 제목 자리에 제품 사진과 이름을 보인다", () => {
    const { container } = render(<ProductDetail product={multiVariantProduct} />);

    moveMarker(summaryMarker(), -1);

    const header = container.querySelector("header") as HTMLElement;
    expect(header.querySelector("[data-swapped]")).toBeInTheDocument();
    expect(screen.getByText("제품 상세")).toHaveAttribute("aria-hidden", "true");
    expect(within(header).getByText(multiVariantProduct.name)).toHaveClass("truncate");
    expect(header.querySelector("img")).toHaveAttribute("width", "28");
  });

  it("되돌아와 제품명이 다시 보이면 내비 제목으로 돌아간다", () => {
    const { container } = render(<ProductDetail product={multiVariantProduct} />);

    moveMarker(summaryMarker(), -1);
    moveMarker(summaryMarker(), 200);

    expect(container.querySelector("header [data-swapped]")).not.toBeInTheDocument();
  });

  it("저장 버튼 묶음이 지나가기 전에는 하단 바를 숨기고 손도 포커스도 받지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(saveBar()).toHaveAttribute("inert");
    expect(saveBar()).not.toHaveAttribute("data-shown");
  });

  it("저장 버튼 묶음이 상단 내비 아래로 지나가면 같은 버튼을 하단 바에 보인다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    moveMarker(saveMarker(), -1);

    expect(saveBar()).not.toHaveAttribute("inert");
    expect(saveBar()).toHaveAttribute("data-shown");
    expect(within(saveBar() as HTMLElement).getByRole("button", { name: "선반에 저장" })).toBeInTheDocument();
  });
});

describe("제품 저장(S39f~S39k)", () => {
  /** 담김 여부는 서버가 그릴 때 받은 회원 상태로 넘어온다(#836). */
  const member = (shelved: boolean): UserProductState => ({ status: "ready", wishlisted: false, shelved });

  const shelfItem: ShelfProductResponse = {
    product: {
      id: untaggedProductDetail.id,
      name: untaggedProductDetail.name,
      brandName: "셀퓨전씨",
      marks: [],
      imageUrl: "",
      sensorySupported: true,
    },
    usageStatus: "IN_USE",
    rating: { preference: null, moistureLevel: null, oilLevel: null },
    possiblyUnsuitable: false,
    registeredAt: "2026-10-01T00:00:00+09:00",
  };

  it("로그인 전에 선반에 저장하려 하면 로그인 안내 시트를 연다", async () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    await userEvent.click(screen.getAllByRole("button", { name: "선반에 저장" })[0]!);

    expect(await screen.findByRole("dialog", { name: "로그인하고 선반에 저장할까요?" })).toBeInTheDocument();
    expect(addShelfProduct).not.toHaveBeenCalled();
  });

  it("선반에 담으면 이벤트를 남기고 바로 평가 시트를 연다", async () => {
    vi.mocked(track).mockClear();
    vi.mocked(addShelfProduct).mockResolvedValue(shelfItem);
    render(<ProductDetail product={untaggedProductDetail} userProduct={member(false)} entryPoint="saved" />);

    await userEvent.click(screen.getAllByRole("button", { name: "선반에 저장" })[0]!);

    expect(addShelfProduct).toHaveBeenCalledWith({ productId: untaggedProductDetail.id, usageStatus: "IN_USE" });
    expect(await screen.findByText("써 보니 어땠나요?")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("shelf_product_added", {
      product_id: untaggedProductDetail.id,
      source: "product_detail",
      entry_point: "saved",
    });
  });

  it("선반에 있는 제품은 '선반에 저장됨'으로 두고, 누르면 빼기를 확인한 뒤 뺀다", async () => {
    render(<ProductDetail product={untaggedProductDetail} userProduct={member(true)} />);

    await userEvent.click((await screen.findAllByRole("button", { name: "선반에 저장됨" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: `${untaggedProductDetail.name}을 선반에서 뺄까요?` });
    await userEvent.click(within(dialog).getByRole("button", { name: "빼기" }));

    expect(removeShelfProduct).toHaveBeenCalledWith(untaggedProductDetail.id);
    expect((await screen.findAllByRole("button", { name: "선반에 저장" }))[0]).toBeInTheDocument();
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
  const bundleOf = (title: string) => screen.getByText(title).parentElement!;

  it("들어 있는 기준을 개수와 함께 '들어 있어요' 묶음에 모아 위에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const contained = bundleOf("들어 있어요");
    const missing = bundleOf("찾지 못했어요");

    expect(contained).toHaveTextContent("들어 있어요1종");
    expect(within(contained).getByRole("link", { name: "향료/알레르기 성분" })).toBeInTheDocument();
    expect(contained.compareDocumentPosition(missing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("들어 있지 않은 기준은 '찾지 못했어요' 묶음에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const missing = bundleOf("찾지 못했어요");

    expect(missing).toHaveTextContent("찾지 못했어요5종");
    expect(within(missing).getByRole("link", { name: "건조 알코올" })).toBeInTheDocument();
  });

  const part = untaggedProductDetail.selectedPart!;
  const [first, second] = part.ingredients;
  const excludeCodes = [
    {
      code: "FRAGRANCE_ALLERGENS",
      name: "이전 향료 표시명",
      englishName: null,
      description: "착향 목적의 성분이에요.",
      ingredients: [{ id: first!.id, koreanName: first!.koreanName, englishName: first!.englishName }],
    },
    {
      code: "DRYING_ALCOHOLS",
      name: "건조 알코올",
      englishName: null,
      description: "피부를 건조하게 할 수 있는 알코올이에요.",
      ingredients: [{ id: -1, koreanName: "에탄올", englishName: "Alcohol" }],
    },
  ];

  it("두 응답의 표시명이 달라도 코드로 연결해 시트에 제품의 해당 성분을 보여 준다", async () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "향료/알레르기 성분" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("향료/알레르기 성분")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: new RegExp(first!.koreanName) })).toBeInTheDocument();
    expect(within(sheet).queryByText(second!.koreanName)).not.toBeInTheDocument();
  });

  it("들어 있는 기준 옆에 이 제품의 해당 성분을 칩으로 두고 성분 설명으로 잇는다", () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    const contained = bundleOf("들어 있어요");

    expect(within(contained).getByRole("link", { name: first!.koreanName })).toHaveAttribute(
      "href",
      `/ingredients/${first!.id}`,
    );
  });

  it("걸린 성분 칩을 누르면 화면을 떠나지 않고 그 성분의 시트를 연다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(within(bundleOf("들어 있어요")).getByRole("link", { name: first!.koreanName }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", {
      sheet_type: "ingredient",
      product_id: untaggedProductDetail.id,
      ingredient_id: first!.id,
    });
  });

  it("성분군 목록을 받지 못해 걸린 성분을 모르면 칩을 두지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(within(bundleOf("들어 있어요")).getAllByRole("link")).toHaveLength(1);
  });

  it("들어 있지 않은 기준은 성분 목록 없이 성분군 설명만 보여 준다", async () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "건조 알코올" }));

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

    await userEvent.click(screen.getByRole("link", { name: "건조 알코올" }));
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

  it("제외 성분군 목록이 비어 있어도 상세 응답의 코드로 성분군 설명을 연다", async () => {
    vi.mocked(fetchIngredientGroup).mockClear();
    render(<ProductDetail product={untaggedProductDetail} />);

    const link = screen.getByRole("link", { name: "합성 색소" });
    expect(link).toHaveAttribute("href", "/ingredient-groups/SYNTHETIC_COLORANTS?from=product_detail");
    await userEvent.click(link);

    const sheet = await screen.findByRole("dialog");
    expect(fetchIngredientGroup).toHaveBeenCalledWith("SYNTHETIC_COLORANTS");
    expect(within(sheet).getByText("수분을 붙잡는 글라이콜 성분이에요.")).toBeInTheDocument();
    expect(within(sheet).queryByRole("heading", { name: "이 제품에 든 성분" })).not.toBeInTheDocument();
  });

  it("들어 있는 기준이 없으면 '찾지 못했어요' 묶음만 둔다", () => {
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

    expect(screen.queryByText("들어 있어요")).not.toBeInTheDocument();
    expect(bundleOf("찾지 못했어요")).toHaveTextContent("찾지 못했어요6종");
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
    await userEvent.click(tabs.getByRole("tab", { name: "02 인텐스 크림, 주의 성분 있음" }));
    await userEvent.click(tabs.getByRole("tab", { name: "01 아쿠아 세럼, 주의 성분 없음" }));

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

    expect(tabs.getByRole("tab", { name: "01 아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute(
      "href",
      "/products/1?partId=11",
    );
    expect(tabs.getByRole("tab", { name: "02 인텐스 크림, 주의 성분 있음" })).toHaveAttribute("aria-selected", "true");
    expect(tabs.getByRole("tab", { name: "01 아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute("aria-selected", "false");
  });

  it("고른 구성품의 성분 정보를 그 탭이 이름 붙인 패널에 담는다", () => {
    render(<ProductDetail product={setProduct} />);

    expect(screen.getByRole("tabpanel", { name: "02 인텐스 크림, 주의 성분 있음" })).toContainElement(
      screen.getByRole("heading", { name: "주의 성분 확인" }),
    );
  });

  it("탭 주소에 진입 경로를 이어 붙여 조회 이벤트가 다시 나가지 않게 한다", () => {
    render(<ProductDetail product={setProduct} entryPoint="saved" />);

    const tabs = within(screen.getByRole("tablist", { name: "구성품" }));

    expect(tabs.getByRole("tab", { name: "01 아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute(
      "href",
      "/products/1?partId=11&from=saved",
    );
  });

  it("다 들어가면 폭을 나누고 넘치면 내용 폭대로 밀게 탭을 둔다", () => {
    render(<ProductDetail product={setProduct} />);

    // 들어가는지는 CSS 가 정한다. 똑같이 나눈 몫이 내용보다 좁아지면 내용 폭에서 멈추고 목록이 넘친다.
    expect(screen.getByRole("tab", { name: "01 아쿠아 세럼, 주의 성분 없음" })).toHaveClass(
      "flex-1",
      "basis-0",
      "min-w-max",
    );
    expect(screen.getByRole("tablist")).toHaveClass("overflow-x-auto");
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
      marks: [],
      imageUrl: "",
      price: 23000,
      volumeValue: 300,
      volumeUnit: "ml",
      priceDifference: 5000,
      moistureLevel: 2,
      oilLevel: 1,
      partId: 3,
      containsExcludedIngredient: false,
    },
    {
      id: 2,
      name: "어성초 77 수딩 토너",
      brand: { id: 3, name: "아누아", englishName: "ANUA", imageUrl: "" },
      marks: [],
      imageUrl: "",
      price: 25000,
      volumeValue: 250,
      volumeUnit: "ml",
      priceDifference: 7000,
      moistureLevel: 2,
      oilLevel: 1,
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
