/**
 * @vitest-environment jsdom
 */
import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { act, render as renderElement, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductDetail } from "./ProductDetail";

import { track } from "@/lib/analytics/track";
import { fetchIngredientGroup } from "@/lib/api/products";
import { addShelfProduct, removeShelfProduct } from "@/lib/api/shelf";
import { SIGNED_OUT_USER_PRODUCT, type UserProductState } from "@/lib/domain/user-product";
import { productDetails, untaggedProductDetail } from "@/mocks/fixtures";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("@/lib/api/shelf", () => ({
  fetchIngredientAnalysis: vi.fn(async () => ({ badProductCount: 0, items: [] })),
  addShelfProduct: vi.fn(),
  fetchShelf: vi.fn(async () => ({ usages: [], items: [] })),
  updateShelfProduct: vi.fn(),
  removeShelfProduct: vi.fn(async () => undefined),
  fetchRatingPreview: vi.fn(() => Promise.reject(new Error("미리보기는 이 테스트에서 보지 않는다"))),
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
  it("개인화 → 고민별 성분 → 주의 확인 → 전성분 버튼 순서이며 구성품 전환 시 열린 전성분 시트를 닫는다", async () => {
    vi.mocked(track).mockClear();
    const base = productDetails[0];
    const product = {
      ...base,
      selectedPart: {
        ...base.selectedPart!,
        concernGroups: [
          {
            code: "DRYNESS",
            name: "건조·당김",
            effects: [
              {
                code: "HYDRATION_RELATED",
                name: "수분 관련",
              },
            ],
            items: [{ type: "INGREDIENT" as const, id: 6, koreanName: "판테놀" }],
          },
        ],
      },
    };
    const { rerender } = render(<ProductDetail product={product} />);
    const section = screen.getByRole("heading", { name: "이런 고민을 위한 성분이 있어요" }).closest("section")!;
    const caution = screen.getByRole("heading", { name: "민감하다면 살펴볼 성분" }).closest("section")!;
    const personal = document.querySelector('[data-shelf-intro="unsuitable"]')!;
    const opener = screen.getByRole("button", { name: `전체 성분 ${product.selectedPart.ingredients.length}개 보기` });
    expect(personal.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.compareDocumentPosition(caution) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(caution.compareDocumentPosition(opener) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(opener);
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", {
      sheet_type: "full_ingredients",
      product_id: product.id,
    });
    expect(screen.getByRole("dialog", { name: /전체 성분/ })).toBeInTheDocument();
    rerender(
      <ProductDetail product={{ ...product, selectedPart: { ...product.selectedPart, id: 1234, ingredients: [] } }} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전체 성분 0개 보기" })).toBeInTheDocument();
    expect(vi.mocked(track).mock.calls.filter(([event]) => event === "product_viewed")).toHaveLength(1);
  });
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
        auth_state: "signed_out",
        has_my_filter: false,
      }),
    );
  });

  it("상세에서 보관할 때도 상세 진입 경로를 남긴다", async () => {
    render(
      <ProductDetail
        product={untaggedProductDetail}
        entryPoint="home_category"
        userProduct={{ ...SIGNED_OUT_USER_PRODUCT, status: "ready", myFilterEmpty: false }}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "위시리스트에 추가" })[0]);

    expect(track).toHaveBeenCalledWith("wishlist_product_added", {
      product_id: untaggedProductDetail.id,
      source: "product_detail",
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

  it("전체 성분 보기 버튼을 본문 폭에 꽉 채운다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const toggle = screen.getByRole("button", { name: "전체 성분 24개 보기" });

    expect(toggle).toHaveClass("w-full", "bg-button-secondary");
  });

  it("열기 전에도 전성분 전체를 본문에 감춰 두고 시트에서 같은 순서로 표시한다", async () => {
    const { container } = render(<ProductDetail product={untaggedProductDetail} />);

    const links = container.querySelectorAll('a[href^="/ingredients/"]');
    expect(links).toHaveLength(untaggedProductDetail.selectedPart?.ingredients.length ?? 0);
    expect(links[0]?.closest("[hidden]")).not.toBeNull();
    expect(screen.queryByRole("list", { name: "전성분" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "전체 성분 24개 보기" }));
    const sheet = await screen.findByRole("dialog", { name: "전체 성분 24개" });
    expect(
      within(sheet)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(untaggedProductDetail.selectedPart!.ingredients.map((ingredient) => `/ingredients/${ingredient.id}`));
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

    const caution = screen.getByRole("heading", { name: "민감하다면 살펴볼 성분" }).closest("section");
    const source = screen.getByRole("heading", { name: "정보 출처" }).closest("section");

    expect(caution?.parentElement).toHaveClass("gap-6");
    expect(source).toHaveClass("bg-layer");
  });
});

/** 관찰하는 요소와 알림. 표식이 상단 내비 아래로 지나간 것을 흉내 낼 때 쓴다. */
const observed = new Map<Element, IntersectionObserverCallback>();

/** 표식이 화면 위 `top` 에 온 것으로 알린다. 아래 끝(`top + height`)이 상단 내비(44) 위로 올라가면 지나간 것이다. */
const moveMarker = (marker: Element | null | undefined, top: number, height = 0) => {
  const notify = marker ? observed.get(marker) : undefined;
  if (!notify) throw new Error("관찰하지 않는 표식이다.");
  act(() => {
    notify(
      [{ boundingClientRect: { top, bottom: top + height }, rootBounds: { top: 44 } } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
};

/** 제품명 바로 뒤의 표식 */
const summaryMarker = () => screen.getByRole("heading", { level: 1 }).nextElementSibling;

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

  it("저장 버튼 줄은 제품 요약 아래에 두고, 하단 고정 바는 처음에 숨긴다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const [row, bar] = screen
      .getAllByRole("button", { name: "비교함에 담기" })
      .map((button) => button.parentElement as HTMLElement);
    expect(within(row).getByRole("button", { name: "파우치에 저장" })).toBeInTheDocument();
    expect(row).not.toHaveClass("sticky");
    expect(bar).toHaveClass("sticky", "bottom-0");
    expect(bar).toHaveAttribute("inert");
  });

  it("저장 버튼 줄이 상단 내비 아래로 다 지나가면 하단 고정 바가 나타나고, 다시 보이면 숨는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const [row, bar] = screen
      .getAllByRole("button", { name: "비교함에 담기" })
      .map((button) => button.parentElement as HTMLElement);

    // 줄의 위 끝만 내비 아래로 들어가면 아직 지나가지 않은 것이다.
    moveMarker(row, 20, 48);
    expect(bar).toHaveAttribute("inert");

    moveMarker(row, -10, 48);
    expect(bar).not.toHaveAttribute("inert");

    moveMarker(row, 300, 48);
    expect(bar).toHaveAttribute("inert");
  });
});

describe("제품 저장(S39f~S39k)", () => {
  /** 담김 여부는 서버가 그릴 때 받은 회원 상태로 넘어온다(#836). */
  const member = (shelved: boolean): UserProductState => ({
    ...SIGNED_OUT_USER_PRODUCT,
    status: "ready",
    myFilterEmpty: false,
    shelved,
  });

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

  it("로그인 전에 파우치에 저장하려 하면 로그인 안내 시트를 연다", async () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    await userEvent.click(screen.getAllByRole("button", { name: "파우치에 저장" })[0]!);

    expect(await screen.findByRole("dialog", { name: "로그인하고 파우치에 저장할까요?" })).toBeInTheDocument();
    expect(addShelfProduct).not.toHaveBeenCalled();
  });

  it("[파우치에 저장]을 누르면 담지 않고 평가 시트만 열고, 그냥 닫으면 담지 않는다", async () => {
    vi.mocked(addShelfProduct).mockClear();
    render(<ProductDetail product={untaggedProductDetail} userProduct={member(false)} entryPoint="saved" />);

    await userEvent.click(screen.getAllByRole("button", { name: "파우치에 저장" })[0]!);
    expect(await screen.findByRole("radiogroup", { name: "지금 쓰고 있나요?" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("radiogroup", { name: "지금 쓰고 있나요?" })).not.toBeInTheDocument(),
    );
    expect(addShelfProduct).not.toHaveBeenCalled();
  });

  it("평가 시트의 [나중에]를 누르면 고른 사용 상태와 계측 출처를 담기 API에 넘긴다", async () => {
    vi.mocked(track).mockClear();
    vi.mocked(addShelfProduct).mockResolvedValue(shelfItem);
    render(<ProductDetail product={untaggedProductDetail} userProduct={member(false)} entryPoint="saved" />);

    await userEvent.click(screen.getAllByRole("button", { name: "파우치에 저장" })[0]!);
    await userEvent.click(await screen.findByRole("button", { name: "나중에" }));

    expect(addShelfProduct).toHaveBeenCalledWith(
      {
        productId: untaggedProductDetail.id,
        usageStatus: "IN_USE",
        preference: null,
        moistureLevel: null,
        oilLevel: null,
      },
      { source: "product_detail", entryPoint: "saved", ratingFlowId: expect.any(String) },
    );
    expect(await screen.findByText("파우치에 저장했어요. 평가는 파우치에서 언제든 할 수 있어요")).toBeInTheDocument();
  });

  it("평가까지 마쳐 담으면 [파우치 보기] 토스트로 파우치에 갈 수 있다", async () => {
    vi.mocked(addShelfProduct).mockResolvedValue(shelfItem);
    push.mockClear();
    // jsdom 에 없다. 토스트가 돌려줄 포커스 자리를 찾을 때 쓴다.
    HTMLElement.prototype.checkVisibility = () => true;
    render(<ProductDetail product={untaggedProductDetail} userProduct={member(false)} />);

    await userEvent.click(screen.getAllByRole("button", { name: "파우치에 저장" })[0]!);
    await userEvent.click(await screen.findByRole("button", { name: "잘 맞았어요" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(await screen.findByRole("button", { name: "건너뛰기" }));

    expect(await screen.findByText("파우치에 저장했어요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "파우치 보기" }));
    expect(push).toHaveBeenCalledWith("/pouch");
  });

  it("파우치에 있는 제품은 '파우치에 보관됨'으로 두고, 누르면 빼기를 확인한 뒤 뺀다", async () => {
    render(<ProductDetail product={untaggedProductDetail} userProduct={member(true)} />);

    await userEvent.click((await screen.findAllByRole("button", { name: "파우치에 보관됨" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: `${untaggedProductDetail.name}을 파우치에서 뺄까요?` });
    await userEvent.click(within(dialog).getByRole("button", { name: "빼기" }));

    await waitFor(() =>
      expect(removeShelfProduct).toHaveBeenCalledWith(untaggedProductDetail.id, {
        source: "product_detail",
        entryPoint: "direct",
      }),
    );
    expect((await screen.findAllByRole("button", { name: "파우치에 저장" }))[0]).toBeInTheDocument();
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
  it("민감하다면 살펴볼 성분과 전체 성분에 선택을 막는 표시를 단다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { name: "민감하다면 살펴볼 성분" }).closest("section")).toHaveAttribute(
      "data-no-select",
    );
    expect(screen.getByRole("button", { name: "전체 성분 24개 보기" }).closest("section")).toHaveAttribute(
      "data-no-select",
    );
  });

  it("고민별 성분에도 선택을 막는 표시를 단다", () => {
    render(<ProductDetail product={productDetails[0]} />);

    expect(screen.getByRole("heading", { name: "이런 고민을 위한 성분이 있어요" }).closest("section")).toHaveAttribute(
      "data-no-select",
    );
  });

  it("제품 이름과 정보 출처는 그대로 선택된다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { level: 1 }).closest("[data-no-select]")).toBeNull();
    expect(screen.getByRole("heading", { name: "정보 출처" }).closest("[data-no-select]")).toBeNull();
  });
});

describe("고민별 성분", () => {
  const taggedProduct = productDetails[0]!;

  /** 고민 그림을 눌러 근거 성분 시트를 연다. */
  const openConcern = async (name: RegExp) => {
    const section = screen.getByRole("heading", { name: "이런 고민을 위한 성분이 있어요" }).closest("section")!;
    await userEvent.click(within(section).getByRole("button", { name }));
    return within(await screen.findByRole("dialog"));
  };

  it("서버가 준 순서대로 고민 그림을 두고, 고민명과 성분 수만 적는다", () => {
    render(<ProductDetail product={taggedProduct} />);

    const section = screen.getByRole("heading", { name: "이런 고민을 위한 성분이 있어요" }).closest("section")!;
    const cards = within(section).getAllByRole("button");
    expect(cards.map((card) => card.textContent)).toEqual(["건조·당김성분 10종", "거친 피부결성분 6종"]);
    expect(cards[0]).toHaveAttribute("aria-haspopup", "dialog");
    expect(cards[0]).not.toHaveTextContent("보습");
    expect(cards[0]!.querySelector("img")?.getAttribute("src")).toContain("dry-tight.webp");
    expect(cards[0]!.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("고민 그림을 누르면 고민 문장을 제목으로 단 근거 성분 시트를 열고 첫 칩을 고른다", async () => {
    render(<ProductDetail product={taggedProduct} />);

    const sheet = await openConcern(/건조·당김/);

    expect(screen.getByRole("dialog", { name: "건조하고 당기는 피부를 위한 성분 10종" })).toBeInTheDocument();
    const chips = within(sheet.getByRole("list", { name: "근거 성분" })).getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "부틸렌글라이콜",
      "글리세린",
      "펜틸렌글라이콜",
      "프로판다이올",
      "판테놀",
      "세라마이드 5종",
    ]);
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
    expect(chips[1]).toHaveAttribute("aria-pressed", "false");
    expect(sheet.getByRole("heading", { name: "부틸렌글라이콜" })).toBeInTheDocument();
    expect(await sheet.findByText("성분 2 설명")).toBeInTheDocument();
  });

  it("칩을 고르면 시트를 닫지 않고 아래 설명과 자세히 보기 링크만 바꾼다", async () => {
    render(<ProductDetail product={taggedProduct} />);

    const sheet = await openConcern(/건조·당김/);
    await userEvent.click(sheet.getByRole("button", { name: "판테놀" }));

    expect(sheet.getByRole("button", { name: "판테놀" })).toHaveAttribute("aria-pressed", "true");
    expect(sheet.getByRole("heading", { name: "판테놀" })).toBeInTheDocument();
    expect(await sheet.findByText("성분 6 설명")).toBeInTheDocument();
    expect(sheet.getByRole("link", { name: "판테놀 자세히 보기" })).toHaveAttribute("href", "/ingredients/6");
    expect(sheet.queryByRole("link", { name: "부틸렌글라이콜 자세히 보기" })).not.toBeInTheDocument();
  });

  it("다른 고민을 열면 그 고민의 첫 칩부터 고른다", async () => {
    render(<ProductDetail product={taggedProduct} />);

    const dry = await openConcern(/건조·당김/);
    await userEvent.click(dry.getByRole("button", { name: "판테놀" }));
    await userEvent.click(dry.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const rough = await openConcern(/거친 피부결/);
    expect(screen.getByRole("dialog", { name: "피부결이 거친 피부를 위한 성분 6종" })).toBeInTheDocument();
    expect(rough.getByRole("button", { name: "부틸렌글라이콜" })).toHaveAttribute("aria-pressed", "true");
  });

  it("자세히 보기 링크는 긴 이름만 줄이고 뒤 문구는 끝까지 보여 준다", async () => {
    const longName = "효모/로도박터/락토바실러스/류코노스톡/스트렙토미세스 그리세우스/아스퍼질러스/바실러스발효여과물";
    const longNamed = {
      ...taggedProduct,
      selectedPart: {
        ...taggedProduct.selectedPart!,
        ingredients: taggedProduct.selectedPart!.ingredients.map((ingredient) =>
          ingredient.id === 6 ? { ...ingredient, koreanName: longName } : ingredient,
        ),
        concernGroups: [
          {
            code: "DRYNESS",
            name: "건조·당김",
            effects: [{ code: "HYDRATION_RELATED", name: "보습" }],
            items: [{ type: "INGREDIENT" as const, id: 6, koreanName: longName }],
          },
        ],
      },
    };
    render(<ProductDetail product={longNamed} />);

    const sheet = await openConcern(/건조·당김/);
    const link = sheet.getByRole("link", { name: `${longName} 자세히 보기` });

    expect(link).toHaveAttribute("href", "/ingredients/6");
    expect(within(link).getByText(longName)).toHaveClass("truncate");
    expect(within(link).getByText("자세히 보기")).not.toHaveClass("truncate");
  });

  it("시트를 열고 닫으면 연 고민과 닫은 방법을 남긴다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={taggedProduct} />);

    const sheet = await openConcern(/건조·당김/);
    await userEvent.click(sheet.getByRole("button", { name: "닫기" }));

    const target = { sheet_type: "concern", product_id: taggedProduct.id, concern_code: "DRYNESS" };
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", target);
    expect(track).toHaveBeenCalledWith("ingredient_sheet_closed", {
      ...target,
      close_method: "close_button",
      open_seconds: expect.any(Number),
    });
  });

  it("서버가 새 고민을 더해 그림이 없으면 빈 원과 고민 이름으로 시트 제목을 만든다", async () => {
    render(
      <ProductDetail
        product={{
          ...taggedProduct,
          selectedPart: {
            ...taggedProduct.selectedPart!,
            concernGroups: [
              {
                code: "REDNESS",
                name: "붉은기",
                effects: [],
                items: [{ type: "INGREDIENT" as const, id: 6, koreanName: "판테놀" }],
              },
            ],
          },
        }}
      />,
    );

    const card = screen.getByRole("button", { name: /붉은기/ });
    expect(card.querySelector("img")).toBeNull();
    await userEvent.click(card);
    expect(await screen.findByRole("dialog", { name: "붉은기 고민을 위한 성분 1종" })).toBeInTheDocument();
  });
});

describe("근거 성분 시트의 성분군", () => {
  const bundledProduct = {
    ...productDetails[0]!,
    selectedPart: {
      ...productDetails[0]!.selectedPart!,
      concernGroups: [
        {
          code: "DRYNESS",
          name: "건조·당김",
          effects: [{ code: "HYDRATION_RELATED", name: "보습" }],
          items: [
            {
              type: "INGREDIENT_GROUP" as const,
              code: "GLYCOLS",
              name: "글라이콜 계열",
              ingredients: [
                { id: 2, koreanName: "부틸렌글라이콜" },
                { id: 3, koreanName: "글리세린" },
              ],
            },
            { type: "INGREDIENT" as const, id: 6, koreanName: "판테놀" },
          ],
        },
      ],
    },
  };

  /** 고민 그림을 눌러 근거 성분 시트를 연다. 첫 칩이 성분군이라 성분군 설명이 바로 보인다. */
  const openConcern = async (name = /건조·당김/) => {
    await userEvent.click(screen.getByRole("button", { name }));
    return within(await screen.findByRole("dialog"));
  };

  it("고민마다 같은 성분군의 구성 성분이 다르면 그 고민의 실제 성분만 표시한다", async () => {
    render(
      <ProductDetail
        product={{
          ...bundledProduct,
          selectedPart: {
            ...bundledProduct.selectedPart,
            concernGroups: [
              {
                code: "DRYNESS",
                name: "건조·당김",
                effects: [
                  { code: "HYDRATION_RELATED", name: "보습" },
                  { code: "BARRIER_SUPPORT_RELATED", name: "피부 장벽" },
                ],
                items: [
                  {
                    type: "INGREDIENT_GROUP",
                    code: "GLYCOLS",
                    name: "글라이콜 계열",
                    ingredients: [
                      { id: 2, koreanName: "부틸렌글라이콜" },
                      { id: 3, koreanName: "글리세린" },
                      { id: 6, koreanName: "판테놀" },
                    ],
                  },
                ],
              },
              {
                code: "UNEVEN_TEXTURE",
                name: "거친 피부결",
                effects: [{ code: "HYDRATION_RELATED", name: "보습" }],
                items: [
                  {
                    type: "INGREDIENT_GROUP",
                    code: "GLYCOLS",
                    name: "글라이콜 계열",
                    ingredients: [
                      { id: 3, koreanName: "글리세린" },
                      { id: 6, koreanName: "판테놀" },
                    ],
                  },
                ],
              },
            ],
          },
        }}
      />,
    );
    const group = await openConcern(/거친 피부결/);
    expect(group.getByRole("button", { name: "글라이콜 2종" })).toHaveAttribute("aria-pressed", "true");
    expect(group.getByRole("link", { name: /글리세린/ })).toBeInTheDocument();
    expect(group.getByRole("link", { name: /판테놀/ })).toBeInTheDocument();
    expect(group.queryByRole("link", { name: /부틸렌글라이콜/ })).not.toBeInTheDocument();
  });

  it("구성품을 바꾸면 이전 구성품의 열린 시트를 닫는다", async () => {
    const { rerender } = render(<ProductDetail product={bundledProduct} />);
    await openConcern();

    rerender(
      <ProductDetail
        product={{
          ...bundledProduct,
          productParts: [{ id: 2, name: null, cautionCount: 0 }],
          selectedPart: { ...bundledProduct.selectedPart, id: 2, concernGroups: [] },
        }}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("성분군 설명에는 실제 구성 성분의 피부 작용만 표시한다", async () => {
    const product = {
      ...bundledProduct,
      selectedPart: {
        ...bundledProduct.selectedPart,
        ingredients: bundledProduct.selectedPart.ingredients.map((ingredient) =>
          [2, 3].includes(ingredient.id)
            ? { ...ingredient, skinEffects: [{ id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "보습" }] }
            : ingredient,
        ),
        concernGroups: [
          {
            ...bundledProduct.selectedPart.concernGroups[0]!,
            effects: [
              { code: "HYDRATION_RELATED", name: "보습" },
              { code: "BARRIER_SUPPORT_RELATED", name: "피부 장벽" },
            ],
          },
        ],
      },
    };
    render(<ProductDetail product={product} />);
    const group = await openConcern();
    expect(group.getByRole("link", { name: /부틸렌글라이콜/ })).toHaveAttribute("href", "/ingredients/2");
    expect(group.getByText("수분")).toBeInTheDocument();
    expect(group.queryByText("피부 장벽")).not.toBeInTheDocument();
  });

  it("같은 성분군 성분을 개수를 붙인 칩 하나로 묶고, 고르면 성분군 설명과 이 제품에 든 성분을 보인다", async () => {
    render(<ProductDetail product={bundledProduct} />);

    const sheet = await openConcern();

    expect(
      within(sheet.getByRole("list", { name: "근거 성분" }))
        .getAllByRole("button")
        .map((chip) => chip.textContent),
    ).toEqual(["글라이콜 2종", "판테놀"]);
    expect(sheet.getByRole("heading", { name: "글라이콜" })).toBeInTheDocument();
    expect(sheet.getByText("2종")).toBeInTheDocument();
    expect(await sheet.findByText("수분을 붙잡는 글라이콜 성분이에요.")).toBeInTheDocument();
    expect(sheet.getByText("Glycols")).toBeInTheDocument();
    expect(sheet.getByRole("link", { name: /부틸렌글라이콜/ })).toHaveAttribute("href", "/ingredients/2");
    expect(sheet.getByRole("link", { name: /글리세린/ })).toHaveAttribute("href", "/ingredients/3");
    expect(sheet.getByRole("link", { name: "글라이콜 계열 자세히 보기" })).toHaveAttribute(
      "href",
      "/ingredient-groups/GLYCOLS",
    );
  });

  it("성분 타일을 누르면 화면을 떠나지 않고 그 성분의 시트로 바꾼다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={bundledProduct} />);

    const group = await openConcern();
    await userEvent.click(group.getByRole("link", { name: /글리세린/ }));

    expect(await screen.findByRole("dialog", { name: "글리세린" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("ingredient_sheet_closed", {
      sheet_type: "concern",
      product_id: bundledProduct.id,
      concern_code: "DRYNESS",
      close_method: "detail_link",
      open_seconds: expect.any(Number),
    });
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", {
      sheet_type: "ingredient",
      product_id: bundledProduct.id,
      ingredient_id: 3,
    });
  });
});

describe("민감하다면 살펴볼 성분", () => {
  const passedBundle = (count: number) => screen.getByText(`통과한 기준 ${count}가지`).parentElement!;

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

  /** 들어 있는 기준 행. 두 응답의 표시명이 달라도 상세 응답의 이름으로 보인다. */
  const containedRow = () => screen.getByRole("button", { name: /향료\/알레르기 성분/ });

  it("제목 아래에 몇 가지 기준이 들었는지 적고, 들어 있는 기준을 통과한 기준보다 위에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    expect(screen.getByText("6가지 기준 중 1가지가 들어 있어요")).toBeInTheDocument();
    expect(containedRow()).toHaveTextContent("향료/알레르기 성분1종");
    expect(containedRow().compareDocumentPosition(passedBundle(5)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("들어 있지 않은 기준은 '통과한 기준' 묶음에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(within(passedBundle(5)).getByRole("link", { name: "건조 알코올" })).toBeInTheDocument();
  });

  it("들어 있는 기준은 접어 두고, 누르면 이 제품의 해당 성분만 칩으로 펼친다", async () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    expect(containedRow()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: first!.koreanName })).not.toBeInTheDocument();

    await userEvent.click(containedRow());

    expect(containedRow()).toHaveAttribute("aria-expanded", "true");
    const content = document.getElementById(containedRow().getAttribute("aria-controls")!)!;
    expect(within(content).getByRole("link", { name: first!.koreanName })).toHaveAttribute(
      "href",
      `/ingredients/${first!.id}`,
    );
    expect(within(content).queryByText(second!.koreanName)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(containedRow());
    expect(containedRow()).toHaveAttribute("aria-expanded", "false");
  });

  it("걸린 성분 칩을 누르면 화면을 떠나지 않고 그 성분의 시트를 연다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(containedRow());
    await userEvent.click(screen.getByRole("link", { name: first!.koreanName }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("ingredient_sheet_opened", {
      sheet_type: "ingredient",
      product_id: untaggedProductDetail.id,
      ingredient_id: first!.id,
    });
  });

  it("성분군 목록을 받지 못해 걸린 성분을 모르면 펼치지 않고 기준을 누르면 성분군 시트를 연다", async () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.queryByRole("button", { name: /향료\/알레르기 성분/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "향료/알레르기 성분" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "향료/알레르기 성분" })).toBeInTheDocument();
  });

  it("들어 있지 않은 기준은 성분 목록 없이 성분군 설명만 보여 준다", async () => {
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "건조 알코올" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).queryByRole("heading", { name: "이 제품에 든 성분" })).not.toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: /계열 자세히 보기/ })).toHaveAttribute(
      "href",
      "/ingredient-groups/DRYING_ALCOHOLS",
    );
  });

  it("기준 시트를 열고 자세히 보기로 떠나면 주의 성분 시트로 남긴다", async () => {
    vi.mocked(track).mockClear();
    render(<ProductDetail product={untaggedProductDetail} excludeCodes={excludeCodes} />);

    await userEvent.click(screen.getByRole("link", { name: "건조 알코올" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("link", { name: /계열 자세히 보기/ }));

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
    expect(link).toHaveAttribute("href", "/ingredient-groups/SYNTHETIC_COLORANTS");
    await userEvent.click(link);

    const sheet = await screen.findByRole("dialog");
    expect(fetchIngredientGroup).toHaveBeenCalledWith("SYNTHETIC_COLORANTS");
    expect(within(sheet).getByText("수분을 붙잡는 글라이콜 성분이에요.")).toBeInTheDocument();
    expect(within(sheet).queryByRole("heading", { name: "이 제품에 든 성분" })).not.toBeInTheDocument();
  });

  it("들어 있는 기준이 없으면 모두 통과했다고 적고 '통과한 기준' 묶음만 둔다", () => {
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

    expect(screen.getByText("6가지 기준을 모두 통과했어요")).toBeInTheDocument();
    expect(within(passedBundle(6)).getAllByRole("link")).toHaveLength(6);
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
      screen.getByRole("heading", { name: "민감하다면 살펴볼 성분" }),
    );
  });

  it("탭 주소에 진입 경로를 이어 붙여 조회 이벤트가 다시 나가지 않게 한다", () => {
    render(<ProductDetail product={setProduct} entryPoint="saved" />);

    const tabs = within(screen.getByRole("tablist", { name: "구성품" }));

    expect(tabs.getByRole("tab", { name: "01 아쿠아 세럼, 주의 성분 없음" })).toHaveAttribute(
      "href",
      "/products/1?partId=11",
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

    expect(screen.queryByRole("heading", { name: "민감하다면 살펴볼 성분" })).not.toBeInTheDocument();
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

  it("머리의 더보기는 지금 구성품의 유사템 결과로 보낸다", () => {
    const product = productDetails[0]!;
    render(<ProductDetail product={product} similarProducts={similar} />);

    expect(screen.getByRole("link", { name: "성분이 비슷한 제품 더보기" })).toHaveAttribute(
      "href",
      `/similar-products/${product.id}?sort=UNIT_PRICE_ASC&partId=${product.selectedPart!.id}`,
    );
  });

  it("비교한 구성품으로 여는 링크를 두고 진입 경로를 남긴다", () => {
    render(<ProductDetail product={productDetails[0]!} similarProducts={similar} />);

    const section = within(screen.getByRole("heading", { name: "성분이 비슷한 제품" }).closest("section")!);

    expect(section.getByRole("link", { name: /어성초 77 수딩 토너/ })).toHaveAttribute("href", "/products/2?partId=21");
  });

  it("주의 성분이 들었는지 칩으로 알린다", () => {
    render(<ProductDetail product={productDetails[0]!} similarProducts={similar} />);

    const section = within(screen.getByRole("heading", { name: "성분이 비슷한 제품" }).closest("section")!);

    expect(within(section.getByRole("link", { name: /다이브인/ })).getByText("주의 없음")).toBeInTheDocument();
    expect(within(section.getByRole("link", { name: /어성초/ })).getByText("주의 있음")).toBeInTheDocument();
  });

  it("가격 · 대표 용량과 지금 제품과의 가격 차이를 적는다", () => {
    const cheaper = [{ ...similar[0]!, priceDifference: -3000 }, similar[1]!];
    render(<ProductDetail product={productDetails[0]!} similarProducts={cheaper} />);

    const section = within(screen.getByRole("heading", { name: "성분이 비슷한 제품" }).closest("section")!);
    const dive = within(section.getByRole("link", { name: /다이브인/ }));
    const anua = within(section.getByRole("link", { name: /어성초/ }));

    expect(dive.getByText("23,000원")).toBeInTheDocument();
    expect(dive.getByText("· 300ml")).toBeInTheDocument();
    // 더 저렴하면 초록, 더 비싸도 경고색을 쓰지 않는다(S60 ⑦).
    expect(dive.getByText("지금 제품보다 3,000원 더 저렴해요")).toHaveClass("text-success-text");
    expect(anua.getByText("지금 제품보다 7,000원 더 비싸요")).toHaveClass("text-text-secondary");
  });

  it("나만의 필터 성분이 든 제품도 '주의 있음'으로 보인다", () => {
    render(
      <ProductDetail
        product={productDetails[0]!}
        similarProducts={similar}
        userProduct={{
          ...SIGNED_OUT_USER_PRODUCT,
          status: "ready",
          myFilterEmpty: false,
          similarProducts: [{ id: 3, containsMyFilterIngredient: true }],
        }}
      />,
    );

    const section = within(screen.getByRole("heading", { name: "성분이 비슷한 제품" }).closest("section")!);
    expect(within(section.getByRole("link", { name: /다이브인/ })).getByText("주의 있음")).toBeInTheDocument();
  });
});

describe("나에게 안 맞는 성분(S60)", () => {
  const card = () => document.querySelector<HTMLElement>('[data-shelf-intro="unsuitable"]')!;
  const ready = (overrides: Partial<UserProductState>): UserProductState => ({
    ...SIGNED_OUT_USER_PRODUCT,
    status: "ready",
    myFilterEmpty: false,
    ...overrides,
  });

  it("로그인 전에는 자물쇠와 로그인 버튼을 둔다", () => {
    render(<ProductDetail product={productDetails[0]!} />);
    expect(screen.getByRole("heading", { name: "이 제품에 나와 안 맞는 성분이 있을까요?" })).toBeInTheDocument();
    expect(within(card()).getByRole("button", { name: "로그인하고 확인하기" })).toBeInTheDocument();
  });

  it("회원도 등록 제품과 평가가 없으면 자물쇠를 표시한다", async () => {
    render(<ProductDetail product={productDetails[0]!} userProduct={ready({ myFilterEmpty: true })} />);
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
  });

  it("걸린 성분을 빨간 칩으로 보이고, 누르면 성분 시트를 연다", async () => {
    const ingredient = productDetails[0]!.selectedPart!.ingredients[1]!;
    render(
      <ProductDetail
        product={productDetails[0]!}
        userProduct={ready({
          unsuitableIngredients: [
            {
              id: ingredient.id,
              koreanName: ingredient.koreanName,
              englishName: ingredient.englishName,
              formulationRoles: [],
              skinEffects: [],
            },
          ],
        })}
      />,
    );

    expect(within(card()).getByRole("heading", { name: "나에게 안 맞는 성분 1종이 들어 있어요" })).toBeInTheDocument();
    expect(within(card()).getByRole("link", { name: "파우치" })).toHaveAttribute("href", "/pouch");

    await userEvent.click(within(card()).getByRole("link", { name: ingredient.koreanName }));
    expect(await screen.findByRole("dialog", { name: ingredient.koreanName })).toBeInTheDocument();
  });

  it("이름이 긴 칩은 보이는 글자만 말줄임으로 자르고, 접근성 이름과 시트에는 전체 이름을 둔다", async () => {
    const longName = "효모/로도박터/락토바실러스/류코노스톡/스트렙토미세스 그리세우스/아스퍼질러스/바실러스발효여과물";
    const base = productDetails[0]!;
    const ingredient = { ...base.selectedPart!.ingredients[1]!, koreanName: longName };
    render(
      <ProductDetail
        product={{ ...base, selectedPart: { ...base.selectedPart!, ingredients: [ingredient] } }}
        userProduct={ready({
          unsuitableIngredients: [
            {
              id: ingredient.id,
              koreanName: longName,
              englishName: ingredient.englishName,
              formulationRoles: [],
              skinEffects: [],
            },
          ],
        })}
      />,
    );

    const chip = within(card()).getByRole("link", { name: longName });
    expect(chip).toHaveClass("max-w-full");
    expect(chip.closest("li")).toHaveClass("max-w-full");
    expect(within(chip).getByText(longName)).toHaveClass("truncate");

    await userEvent.click(chip);
    expect(await screen.findByRole("dialog", { name: longName })).toBeInTheDocument();
  });

  it("걸린 성분이 없으면 초록 안심 표시를 둔다", () => {
    render(<ProductDetail product={productDetails[0]!} userProduct={ready({})} />);

    expect(within(card()).getByRole("heading", { name: "나에게 안 맞는 성분이 없어요" })).toBeInTheDocument();
  });

  it("관리자 세션에는 나만의 필터가 없어 그리지 않는다", () => {
    render(
      <ProductDetail
        product={productDetails[0]!}
        userProduct={{ ...SIGNED_OUT_USER_PRODUCT, status: "adminSession" }}
      />,
    );

    expect(screen.queryByText("나만의 필터")).not.toBeInTheDocument();
  });
});

describe("수분감·유분감 안내(S60 ①)", () => {
  it("누르면 수분감 · 유분감이 무엇인지 알려 주고, Esc 로 닫는다", async () => {
    render(<ProductDetail product={productDetails[0]!} />);

    const button = screen.getByRole("button", { name: "수분감·유분감 설명" });
    await userEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toHaveTextContent(
      "수분감은 바른 뒤 피부에 남는 촉촉함",
    );

    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("유수분 평가 대상이 아닌 제품은 안내 버튼도 숨긴다", () => {
    render(<ProductDetail product={{ ...productDetails[0]!, moistureLevel: null, oilLevel: null }} />);

    expect(screen.queryByRole("button", { name: "수분감·유분감 설명" })).not.toBeInTheDocument();
  });
});
