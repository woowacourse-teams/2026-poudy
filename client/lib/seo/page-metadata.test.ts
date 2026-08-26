import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrand: vi.fn(),
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
import OpenGraphImage from "@/app/opengraph-image";
import ProductDetailPage, { generateMetadata as productMetadata } from "@/app/products/[productId]/page";
import { metadata as productsMetadata } from "@/app/products/page";
import { metadata as savedMetadata } from "@/app/saved/page";
import { SOCIAL_IMAGE_CACHE_CONTROL } from "@/lib/seo/social-image";

afterEach(() => {
  vi.clearAllMocks();
});

describe("색인 메타데이터", () => {
  it("조건 제품과 저장함은 색인하지 않는다", () => {
    expect(productsMetadata.robots).toMatchObject({ index: false });
    expect(savedMetadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("목록 화면의 canonical 에서 쿼리스트링을 제외한다", () => {
    expect(categoriesMetadata.alternates?.canonical).toBe("/categories");
    expect(brandsMetadata.alternates?.canonical).toBe("/brands");
  });

  it("카테고리 상세 canonical 에 ID만 남긴다", async () => {
    const metadata = await categoryMetadata({
      params: Promise.resolve({ categoryId: "42" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates?.canonical).toBe("/categories/42");
  });
});

describe("공유 메타데이터", () => {
  it("루트가 절대 주소 기준과 기본 Open Graph·Twitter 값을 가진다", () => {
    const description = "화장품 전성분 기반 성분 분석 및 맞춤형 뷰티 정보 서비스, Poudy";

    expect(rootMetadata.metadataBase?.toString()).toBe("http://localhost:3000/");
    expect(rootMetadata.description).toBe(description);
    expect(rootMetadata.openGraph).toMatchObject({ title: "Poudy", description, type: "website", locale: "ko_KR" });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary_large_image", title: "Poudy", description });
  });

  it("제품 사진이 있으면 제품 미리보기에 쓴다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 101,
      name: "수분 세럼",
      brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
      imageUrl: "https://images.example/product.png",
    });

    const metadata = await productMetadata({
      params: Promise.resolve({ productId: "101" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates?.canonical).toBe("/products/101");
    expect(metadata.openGraph?.images).toEqual(["https://images.example/product.png"]);
    expect(metadata.twitter?.images).toEqual(["https://images.example/product.png"]);
  });

  it("제품 사진이 없으면 기본 미리보기로 떨어진다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 102,
      name: "진정 크림",
      brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
      imageUrl: "",
    });

    const metadata = await productMetadata({
      params: Promise.resolve({ productId: "102" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.openGraph?.images).toEqual(["/opengraph-image"]);
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
    expect(brand.alternates?.canonical).toBe("/brands/7");
    expect(brand.openGraph?.images).toEqual(["/brands/7/opengraph-image"]);
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

  it("제품 상세 본문에 판매 정보 없는 Product JSON-LD를 넣는다", async () => {
    api.fetchProductDetail.mockResolvedValue({
      id: 103,
      name: "장벽 크림",
      brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
      imageUrl: "https://images.example/cream.png",
      ingredients: [{ id: 1 }, { id: 2 }],
    });

    const element = await ProductDetailPage({
      params: Promise.resolve({ productId: "103" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain('"@type":"Product"');
    expect(markup).toContain('"name":"전성분 수","value":2');
    expect(markup).not.toContain('"offers"');
  });
});
