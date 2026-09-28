import type { IngredientDetailResponse, ProductDetailResponse } from "@poudy/api/api.zod";
import type { Metadata } from "next";

import { ApiError } from "@/lib/api/client";
import { formatPrice, formatVolume } from "@/lib/domain/product-display";
import { absoluteUrl, searchEnginesAllowed } from "@/lib/seo/site";

const escape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}[\]()#+.!|~-])/g, "\\$1");
const heading = (value: string): string => escape(value.replace(/[\r\n]+/g, " "));
const section = (title: string, lines: readonly string[]): string =>
  lines.length > 0 ? `\n## ${title}\n\n${lines.join("\n")}\n` : "";

export const markdownAlternates = (canonical: string): Metadata["alternates"] => ({
  canonical,
  ...(searchEnginesAllowed() ? { types: { "text/markdown": `${canonical}/markdown` } } : {}),
});

export const productMarkdown = (product: ProductDetailResponse): string => {
  const path = `/products/${product.id}`;
  return [
    `# ${heading(`${product.brand.name} ${product.name}`)}\n`,
    `원문: ${absoluteUrl(path)}\n`,
    section(
      "용량별 가격",
      product.variants.map((variant) => `- ${escape(formatVolume(variant))}: 정가 ${formatPrice(variant.price)}`),
    ),
    section(
      "전성분",
      product.ingredients.map(
        (ingredient, index) =>
          `${index + 1}. [${heading(ingredient.koreanName)}](${absoluteUrl(`/ingredients/${ingredient.id}`)})${ingredient.englishName ? ` (${heading(ingredient.englishName)})` : ""}`,
      ),
    ),
    "\n전성분과 가격은 파우디에 등록된 정보를 기준으로 합니다. 제품이 리뉴얼되면 실제 제품의 표기와 다를 수 있으며, 가격은 판매처의 실판매 최저가를 뜻하지 않습니다.\n",
  ].join("");
};

export const ingredientMarkdown = (ingredient: IngredientDetailResponse): string =>
  [
    `# ${heading(ingredient.koreanName)}\n`,
    `원문: ${absoluteUrl(`/ingredients/${ingredient.id}`)}\n`,
    ingredient.englishName ? `영문 이름: ${heading(ingredient.englishName)}\n` : "",
    section("성분 설명", ingredient.description ? [escape(ingredient.description)] : []),
    section(
      "배합 목적",
      ingredient.formulationRoles.map((role) => `- ${heading(role.name)}`),
    ),
    section(
      "성분 작용",
      ingredient.skinEffects.map((effect) => `- ${heading(effect.name)}`),
    ),
    section(
      "정보 출처",
      ingredient.infoSources.map((source) => `- ${heading(source)}`),
    ),
    section(
      "성분 작용 출처",
      ingredient.effectSources.map((source) => `- ${heading(source)}`),
    ),
    `\n업데이트 날짜: ${ingredient.updatedAt}\n`,
    "\n성분 설명은 일반적인 참고 정보이며, 개인의 피부 반응이나 제품의 실제 사용감을 보장하지 않습니다.\n",
  ].join("");

export const markdownResponse = async <T>(
  raw: string,
  path: string,
  { fetchDetail, render }: { fetchDetail: (id: number) => Promise<T>; render: (data: T) => string },
): Promise<Response> => {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (!searchEnginesAllowed() || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return new Response(null, { status: 404, headers });
  }
  try {
    const data = await fetchDetail(Number(raw));
    return new Response(render(data), {
      headers: {
        ...headers,
        "Content-Type": "text/markdown; charset=utf-8",
        Link: `<${absoluteUrl(path)}>; rel="canonical", <${absoluteUrl("/llms.txt")}>; rel="describedby"`,
      },
    });
  } catch (error) {
    return new Response(null, {
      status: error instanceof ApiError && error.status === 404 ? 404 : 503,
      headers,
    });
  }
};
