import type { IngredientDetailResponse } from "@poudy/api/api.zod";

import { fetchIngredientDetail, fetchIngredients } from "@/lib/api/products";
import { FIRST_PAGE } from "@/lib/domain/filter";
import { formatEnglishName } from "@/lib/domain/format";
import { absoluteUrl, SITE_ALTERNATE_NAME, SITE_NAME } from "@/lib/seo/site";
import { escapeXml } from "@/lib/seo/sitemap";

export const RSS_ITEM_COUNT = 50;

/** 성분 상세 화면과 같은 수만큼 포함 제품을 싣는다. */
const RSS_PRODUCT_COUNT = 3;

/**
 * 성분 상세는 다른 화면에서 링크하지 않아 검색 로봇이 사이트맵으로만 찾을 수 있다.
 * 성분 사이트맵과 같은 순서(제품에 쓰인 성분)의 앞쪽부터 싣는다.
 */
export const rssIngredients = async (): Promise<readonly IngredientDetailResponse[]> => {
  const { items } = await fetchIngredients({ page: FIRST_PAGE, size: RSS_ITEM_COUNT, usedInProducts: true });
  return Promise.all(items.map(({ id }) => fetchIngredientDetail(id, RSS_PRODUCT_COUNT)));
};

const rfc822 = (dateTime: string): string => new Date(dateTime).toUTCString();

const htmlSection = (title: string, lines: readonly string[]): string => {
  if (lines.length === 0) return "";
  return `<h2>${escapeXml(title)}</h2><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
};

const productLinks = ({ products }: IngredientDetailResponse): readonly string[] =>
  products.map(({ id, name, brand }) => {
    const link = escapeXml(absoluteUrl(`/products/${id}`));
    return `<a href="${link}">${escapeXml(`${brand.name} ${name}`)}</a>`;
  });

/** 출처 문구에는 논문 주소처럼 다른 도메인 주소가 글자로 들어 있다. */
const withoutUrls = (value: string): string => value.replace(/\s*https?:\/\/\S+/g, "").trim();

const textSection = (title: string, values: readonly string[]): string =>
  htmlSection(
    title,
    values
      .map(withoutUrls)
      .filter((value) => value !== "")
      .map((value) => escapeXml(value)),
  );

/**
 * 네이버 서치어드바이저는 item 마다 본문 전체를 요구하고, 피드 안의 주소는 모두 소유 확인한 도메인이어야 한다.
 * 그래서 성분 상세 화면의 본문을 싣되 이미지 주소와 출처의 외부 주소는 뺀다.
 */
const ingredientHtml = (ingredient: IngredientDetailResponse): string => {
  let englishName = "";
  if (ingredient.englishName) englishName = `<p>영문 이름: ${escapeXml(formatEnglishName(ingredient.englishName))}</p>`;
  let description = "";
  if (ingredient.description)
    description = `<h2>성분 설명</h2><p>${escapeXml(withoutUrls(ingredient.description))}</p>`;

  return [
    `<h1>${escapeXml(ingredient.koreanName)}</h1>`,
    englishName,
    description,
    textSection(
      "배합 목적",
      ingredient.formulationRoles.map(({ name }) => name),
    ),
    textSection(
      "성분 작용",
      ingredient.skinEffects.map(({ name }) => name),
    ),
    htmlSection(`이 성분이 든 제품 ${ingredient.productCount}개`, productLinks(ingredient)),
    textSection("정보 출처", ingredient.infoSources),
    textSection("성분 작용 출처", ingredient.effectSources),
    `<p>업데이트 날짜: ${escapeXml(ingredient.updatedAt.slice(0, "YYYY-MM-DD".length))}</p>`,
    "<p>성분 설명은 일반적인 참고 정보이며, 개인의 피부 반응이나 제품의 실제 사용감을 보장하지 않습니다.</p>",
  ].join("");
};

const itemXml = (ingredient: IngredientDetailResponse): string => {
  const link = escapeXml(absoluteUrl(`/ingredients/${ingredient.id}`));
  return [
    "<item>",
    `<title>${escapeXml(`${ingredient.koreanName} 성분 정보`)}</title>`,
    `<link>${link}</link>`,
    `<description>${escapeXml(ingredientHtml(ingredient))}</description>`,
    `<guid isPermaLink="true">${link}</guid>`,
    `<pubDate>${rfc822(ingredient.updatedAt)}</pubDate>`,
    "</item>",
  ].join("");
};

/** pubDate 와 lastBuildDate 는 성분 데이터가 바뀐 날(updatedAt)이다. */
export const rssXml = (ingredients: readonly IngredientDetailResponse[]): string => {
  const latest = ingredients
    .map(({ updatedAt }) => updatedAt)
    .sort((left, right) => Date.parse(left) - Date.parse(right))
    .at(-1);
  let lastBuildDate = "";
  if (latest !== undefined) lastBuildDate = `<lastBuildDate>${rfc822(latest)}</lastBuildDate>`;

  const channel = [
    `<title>${escapeXml(`${SITE_ALTERNATE_NAME}(${SITE_NAME}) 화장품 성분 정보`)}</title>`,
    `<link>${escapeXml(absoluteUrl("/"))}</link>`,
    `<description>${escapeXml(`${SITE_ALTERNATE_NAME}에 등록된 화장품 성분의 상세 정보 페이지입니다.`)}</description>`,
    "<language>ko-KR</language>",
    lastBuildDate,
    ingredients.map(itemXml).join(""),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${channel}</channel></rss>`;
};

export const rssResponse = (body: string): Response =>
  new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
