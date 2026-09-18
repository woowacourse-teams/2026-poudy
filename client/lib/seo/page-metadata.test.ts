import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrand: vi.fn(),
  fetchCategories: vi.fn(),
  fetchProductDetail: vi.fn(),
  fetchIngredientDetail: vi.fn(),
}));
const seo = vi.hoisted(() => ({
  socialImage: vi.fn<(content: { readonly title: string; readonly logoSrc?: string }) => Response>(
    () => new Response(),
  ),
}));

vi.mock("@/lib/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/products")>()),
  ...api,
}));
vi.mock("@/lib/seo/social-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo/social-image")>()),
  socialImage: seo.socialImage,
  // 로고는 배포된 주소에서 받아 온다. 여기서는 무엇을 넘겼는지만 보므로 받지 않는다.
  socialImageLogoSrc: async () => "data:image/png;base64,",
}));
vi.mock("next/font/google", () => ({
  Foldit: () => ({ variable: "--font-foldit" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
  Noto_Sans_KR: () => ({ variable: "--font-noto-sans-kr" }),
}));
vi.mock("@/components/product/ProductDetail", () => ({ ProductDetail: () => null }));
/* 홈은 구조화 데이터만 본다. 집계 영역은 그리지 않고 조회도 하지 않는다. */
vi.mock("@/components/home/CurationCarousel", () => ({ CurationCarousel: () => null }));
vi.mock("@/components/home/PopularKeywords", () => ({ PopularKeywords: () => null }));
vi.mock("@/components/home/PopularProducts", () => ({ PopularProducts: () => null }));
vi.mock("@/components/home/SkinTypeMenu", () => ({ SkinTypeMenu: () => null }));
vi.mock("@/components/ui/BottomNavigation", () => ({ BottomNavigation: () => null }));
vi.mock("@/components/ui/TopBar", () => ({ TopBar: () => null }));

import BrandOpenGraphImage, { revalidate as brandImageRevalidate } from "@/app/brands/[brandId]/opengraph-image";
import { generateMetadata as brandMetadata } from "@/app/brands/[brandId]/page";
import { metadata as brandsMetadata } from "@/app/brands/page";
import { generateMetadata as categoryMetadata } from "@/app/categories/[categoryId]/page";
import { metadata as categoriesMetadata } from "@/app/categories/page";
import IngredientOpenGraphImage, {
  revalidate as ingredientImageRevalidate,
} from "@/app/ingredients/[ingredientId]/opengraph-image";
import { generateMetadata as ingredientMetadata } from "@/app/ingredients/[ingredientId]/page";
import { metadata as rootMetadata } from "@/app/layout";
import OpenGraphImage, { alt as rootImageAlt } from "@/app/opengraph-image";
import Home, { metadata as homeMetadata } from "@/app/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import ProductDetailPage, { generateMetadata as productMetadata } from "@/app/products/[productId]/page";
import { metadata as productsMetadata } from "@/app/products/page";
import { metadata as savedMetadata } from "@/app/saved/page";
import { metadata as ingredientSearchMetadata } from "@/app/search/ingredients/page";
import { metadata as productSearchMetadata } from "@/app/search/products/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo/site";
import { SOCIAL_IMAGE_CACHE_CONTROL } from "@/lib/seo/social-image";

afterEach(() => {
  vi.clearAllMocks();
});

describe("색인 메타데이터", () => {
  it("조건 제품은 색인하지 않는다", () => {
    expect(productsMetadata.robots).toMatchObject({ index: false });
  });

  it("법정 문서는 따라가되 색인하지 않는다", () => {
    expect(privacyMetadata.robots).toMatchObject({ index: false, follow: true });
    expect(termsMetadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("홈 canonical 을 하위 화면에 상속하지 않는다", () => {
    expect(rootMetadata.alternates).toBeUndefined();
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(privacyMetadata.alternates).toBeUndefined();
    expect(termsMetadata.alternates).toBeUndefined();
  });

  it("목록 화면의 canonical 에서 쿼리스트링을 제외한다", () => {
    expect(categoriesMetadata.alternates?.canonical).toBe("/categories");
    expect(brandsMetadata.alternates?.canonical).toBe("/brands");
  });

  it("사이트링크 후보는 고유 제목·설명·canonical 을 가지고 색인을 허용한다", () => {
    expect(productSearchMetadata).toMatchObject({
      title: "제품 검색",
      description: "제품명이나 브랜드로 화장품과 전성분 정보를 찾아보세요.",
      alternates: { canonical: "/search/products" },
    });
    expect(ingredientSearchMetadata).toMatchObject({
      title: "성분 검색",
      description: "포함하거나 제외할 성분을 골라 조건에 맞는 화장품을 찾아보세요.",
      alternates: { canonical: "/search/ingredients" },
    });
    expect(categoriesMetadata).toMatchObject({
      title: "카테고리",
      description: "카테고리별 화장품과 전성분 정보를 확인해 보세요.",
      alternates: { canonical: "/categories" },
    });
    expect(brandsMetadata).toMatchObject({
      title: "브랜드",
      description: "브랜드별 화장품과 전성분 정보를 확인해 보세요.",
      alternates: { canonical: "/brands" },
    });
    expect(savedMetadata).toMatchObject({
      title: "보관함",
      description: "Poudy에서 저장한 화장품을 한곳에서 확인해 보세요.",
      alternates: { canonical: "/saved" },
    });

    expect(productSearchMetadata.robots).toBeUndefined();
    expect(ingredientSearchMetadata.robots).toBeUndefined();
    expect(categoriesMetadata.robots).toBeUndefined();
    expect(savedMetadata.robots).toBeUndefined();
  });

  it("카테고리 상세에 카테고리 이름으로 고유한 제목과 설명을 만든다", async () => {
    api.fetchCategories.mockResolvedValue({
      items: [
        {
          id: 4,
          name: "메이크업",
          children: [{ id: 42, name: "립 메이크업" }],
        },
      ],
    });

    const metadata = await categoryMetadata({
      params: Promise.resolve({ categoryId: "42" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata).toMatchObject({
      title: "립 메이크업 화장품",
      description: "립 메이크업 카테고리의 화장품과 전성분 정보를 확인해 보세요.",
      alternates: { canonical: "/categories/42" },
    });
    expect(metadata.openGraph).toMatchObject({
      title: "립 메이크업 화장품",
      url: "/categories/42",
      siteName: "Poudy",
      locale: "ko_KR",
    });
  });
});

describe("공유 메타데이터", () => {
  it("루트가 절대 주소 기준과 기본 Open Graph·Twitter 값을 가진다", () => {
    expect(rootMetadata.metadataBase?.toString()).toBe("http://localhost:3000/");
    expect(rootMetadata.title).toEqual({ default: SITE_TITLE, template: `%s | ${SITE_NAME}` });
    expect(rootMetadata.description).toBe(SITE_DESCRIPTION);
    expect(rootMetadata.verification).toEqual({
      other: { "naver-site-verification": "f61dfe971733b0d1d2e8b1a8e3cda559b5b62264" },
    });
    expect(rootMetadata.openGraph).toMatchObject({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      type: "website",
      locale: "ko_KR",
    });
    expect(rootMetadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    });
    expect(rootImageAlt).toBe(SITE_DESCRIPTION);
  });

  it("홈에서 사이트와 운영 주체를 Poudy·파우디 이름으로 연결한다", async () => {
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain('"@type":"WebSite"');
    expect(markup).toContain('"@id":"http://localhost:3000/#website"');
    expect(markup).toContain('"name":"Poudy"');
    expect(markup).toContain('"alternateName":["파우디"]');
    expect(markup).toContain('"inLanguage":"ko-KR"');
    expect(markup).toContain('"@type":"Organization"');
    expect(markup).toContain('"@id":"http://localhost:3000/#organization"');
    expect(markup).toContain('"alternateName":"파우디"');
    expect(markup).toContain('"logo":"http://localhost:3000/favicon.png"');
    expect(markup).toContain('"sameAs":["https://www.instagram.com/poudy.official"]');
    expect(markup).toContain(`"description":"${SITE_DESCRIPTION}"`);
    expect(markup).toContain('"url":"http://localhost:3000/"');
    expect(markup).toContain(SITE_DESCRIPTION);
  });

  it("제품 사진이 있으면 제품 미리보기에 쓴다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 101,
      name: "수분 세럼",
      brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
      imageUrl: "https://images.example/product.png",
      ingredients: [],
      skinEffectGroups: [],
    });

    const metadata = await productMetadata({
      params: Promise.resolve({ productId: "101" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates?.canonical).toBe("/products/101");
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://images.example/product.png", alt: "파우디 수분 세럼 제품 이미지" },
    ]);
    expect(metadata.twitter?.images).toEqual([
      { url: "https://images.example/product.png", alt: "파우디 수분 세럼 제품 이미지" },
    ]);
  });

  it("제품 사진이 없으면 기본 미리보기로 떨어진다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 102,
      name: "진정 크림",
      brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
      imageUrl: "",
      ingredients: [],
      skinEffectGroups: [],
    });

    const metadata = await productMetadata({
      params: Promise.resolve({ productId: "102" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.openGraph?.images).toEqual([{ url: "/opengraph-image", alt: SITE_DESCRIPTION }]);
  });

  it("성분과 브랜드 상세가 전용 미리보기와 canonical 을 가진다", async () => {
    api.fetchIngredientDetail.mockResolvedValue({ koreanName: "판테놀", description: "피부 보습을 돕는 성분입니다." });
    api.fetchBrand.mockResolvedValue({ name: "파우디" });

    const [ingredient, brand] = await Promise.all([
      ingredientMetadata({ params: Promise.resolve({ ingredientId: "12" }), searchParams: Promise.resolve({}) }),
      brandMetadata({ params: Promise.resolve({ brandId: "7" }), searchParams: Promise.resolve({}) }),
    ]);

    expect(ingredient.alternates?.canonical).toBe("/ingredients/12");
    expect(ingredient.openGraph?.images).toEqual(["/ingredients/12/opengraph-image"]);
    expect(ingredient.openGraph).toMatchObject({ url: "/ingredients/12" });
    expect(brand.alternates?.canonical).toBe("/brands/7");
    expect(brand.openGraph?.images).toEqual(["/brands/7/opengraph-image"]);
    expect(brand.openGraph).toMatchObject({ url: "/brands/7" });
  });

  it("상세 조회에 실패해도 canonical 은 남긴다", async () => {
    api.fetchBrand.mockRejectedValue(new Error("down"));
    api.fetchProductDetail.mockRejectedValue(new Error("down"));
    api.fetchIngredientDetail.mockRejectedValue(new Error("down"));

    const [brand, product, ingredient] = await Promise.all([
      brandMetadata({ params: Promise.resolve({ brandId: "7" }), searchParams: Promise.resolve({ page: "2" }) }),
      productMetadata({
        params: Promise.resolve({ productId: "101" }),
        searchParams: Promise.resolve({ from: "search_results" }),
      }),
      ingredientMetadata({ params: Promise.resolve({ ingredientId: "12" }), searchParams: Promise.resolve({}) }),
    ]);

    expect(brand).toEqual({ alternates: { canonical: "/brands/7?page=2" } });
    expect(product).toEqual({ alternates: { canonical: "/products/101" } });
    expect(ingredient).toEqual({ alternates: { canonical: "/ingredients/12" } });
  });

  it("브랜드·카테고리 목록의 뒤쪽 장은 자기 주소를 canonical 로 둔다", async () => {
    api.fetchBrand.mockResolvedValue({ name: "파우디" });
    api.fetchCategories.mockResolvedValue({ items: [{ id: 4, name: "메이크업", children: [] }] });

    const [brand, category, first] = await Promise.all([
      brandMetadata({
        params: Promise.resolve({ brandId: "7" }),
        searchParams: Promise.resolve({ page: "3", sort: "PRICE_ASC" }),
      }),
      categoryMetadata({ params: Promise.resolve({ categoryId: "4" }), searchParams: Promise.resolve({ page: "2" }) }),
      brandMetadata({ params: Promise.resolve({ brandId: "7" }), searchParams: Promise.resolve({ page: "1" }) }),
    ]);

    // 필터 조건은 남기지 않고 장만 남긴다. 첫 장은 쿼리 없이 둔다.
    expect(brand.alternates?.canonical).toBe("/brands/7?page=3");
    expect(brand.openGraph).toMatchObject({ url: "/brands/7?page=3" });
    expect(category.alternates?.canonical).toBe("/categories/4?page=2");
    expect(first.alternates?.canonical).toBe("/brands/7");
  });

  it("제품 설명문에 브랜드·제품명과 본문 성분 요약을 담고 og:url 을 canonical 과 맞춘다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 104,
      name: "약콩 판테놀 마스크",
      brand: { id: 2, name: "라운드랩", englishName: "Round Lab", imageUrl: "" },
      imageUrl: "",
      ingredients: [{ id: 1 }, { id: 2 }, { id: 3 }],
      skinEffectGroups: [{ name: "수분" }, { name: "피부 장벽" }],
    });

    const metadata = await productMetadata({
      params: Promise.resolve({ productId: "104" }),
      searchParams: Promise.resolve({}),
    });

    const description = "라운드랩 약콩 판테놀 마스크의 전성분 3개와 수분·피부 장벽 관련 성분을 확인하세요.";
    expect(metadata.description).toBe(description);
    expect(metadata.openGraph).toMatchObject({ description, url: "/products/104", siteName: "Poudy", locale: "ko_KR" });
    expect(metadata.alternates?.canonical).toBe("/products/104");
  });

  it("상세 공유 이미지를 하루 동안 응답 캐시에 넣는다", () => {
    expect(ingredientImageRevalidate).toBe(86400);
    expect(brandImageRevalidate).toBe(86400);
  });

  it("생성형 공유 이미지에 페이지별 하단 제목과 서비스 로고를 넣는다", async () => {
    api.fetchIngredientDetail.mockResolvedValue({ koreanName: "판테놀", description: "피부 보습을 돕는 성분입니다." });
    api.fetchBrand.mockResolvedValue({ name: "파우디" });

    await Promise.all([
      IngredientOpenGraphImage({ params: Promise.resolve({ ingredientId: "12" }) }),
      BrandOpenGraphImage({ params: Promise.resolve({ brandId: "7" }) }),
      OpenGraphImage(),
    ]);

    const contents = seo.socialImage.mock.calls.map(([content]) => content);
    expect(contents).toContainEqual({
      title: "판테놀",
      logoSrc: expect.stringMatching(/^data:image\/png;base64,/),
      cacheControl: SOCIAL_IMAGE_CACHE_CONTROL,
    });
    expect(contents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "파우디",
          logoSrc: expect.stringMatching(/^data:image\/png;base64,/),
          cacheControl: SOCIAL_IMAGE_CACHE_CONTROL,
        }),
        expect.objectContaining({
          title: "내 피부에 맞는\n화장품 탐색, Poudy",
          logoSrc: expect.stringMatching(/^data:image\/png;base64,/),
        }),
      ]),
    );
  });

  it("저장함은 상속된 공유 미리보기를 제거한다", () => {
    expect(savedMetadata.openGraph).toBeNull();
    expect(savedMetadata.twitter).toBeNull();
  });

  it("판매 정보가 없는 제품 상세에는 Product JSON-LD 를 넣지 않는다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 103,
      name: "장벽 크림",
      brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
      imageUrl: "https://images.example/cream.png",
      categories: [],
      variants: [],
      ingredients: [{ id: 1 }, { id: 2 }],
    });

    const element = await ProductDetailPage({
      params: Promise.resolve({ productId: "103" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('"@type":"BreadcrumbList"');
    expect(markup).not.toContain('"@type":"Product"');
  });
});
