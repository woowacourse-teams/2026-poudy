import type { Metadata } from "next";

import { CurationCarousel } from "@/components/home/CurationCarousel";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { PopularKeywords } from "@/components/home/PopularKeywords";
import { PopularProducts } from "@/components/home/PopularProducts";
import { SkinTypeMenu } from "@/components/home/SkinTypeMenu";
import { OPERATOR } from "@/components/legal/operator";
import { NoticeBanner } from "@/components/notices/NoticeBanner";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  fetchCategories,
  fetchMainBanners,
  fetchProductRankings,
  fetchSearchKeywordRankings,
  fetchSkinTypes,
} from "@/lib/api/products";
import { isCurationBanner } from "@/lib/domain/banner";
import { absoluteUrl, INSTAGRAM_URL, SITE_ALTERNATE_NAME, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/*
 * 인기 검색어와 인기 제품이 10분마다 바뀌므로 그 주기로 다시 만든다.
 *
 * 이 값이 없으면 라우트 기본값인 `false` 가 적용되어 빌드 때 만든 화면이 다음 배포까지
 * 그대로 남는다. 각 fetch 에 준 `revalidate` 는 그 요청의 데이터만 담아 둘 뿐,
 * 화면을 다시 만드는 주기를 정하지는 않는다.
 */
export const revalidate = 600;

const organizationId = absoluteUrl("/#organization");
const websiteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: SITE_ALTERNATE_NAME,
      alternateName: [SITE_NAME],
      description: SITE_DESCRIPTION,
      url: absoluteUrl("/"),
      inLanguage: "ko-KR",
      publisher: { "@id": organizationId },
    },
    {
      "@type": "Organization",
      "@id": organizationId,
      name: SITE_ALTERNATE_NAME,
      alternateName: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/logo.webp"),
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: OPERATOR.officer.email,
        availableLanguage: ["ko"],
      },
      sameAs: [INSTAGRAM_URL, "https://play.google.com/store/apps/details?id=com.poudy.app&pcampaignid=web_share"],
    },
  ],
};

/**
 * 한 곳이라도 무너지면 홈 전체가 빈 화면이 된다. 영역마다 따로 받아서
 * 실패한 자리만 비우고 나머지는 그대로 그린다.
 *
 * 실패를 빈 목록과 가려야 하는 영역(사람들이 보는 제품, S51a)은 실패를 null 로 받아 오류 줄과 다시 시도를 둔다.
 */
const orNull = async <T,>(load: () => Promise<{ items: readonly T[] }>): Promise<readonly T[] | null> =>
  load()
    .then((response) => response.items)
    .catch(() => null);

const orEmpty = async <T,>(load: () => Promise<{ items: readonly T[] }>): Promise<readonly T[]> =>
  orNull(load).then((items) => items ?? []);

export default async function Home() {
  const [curations, keywords, skinTypes, rankings, categories] = await Promise.all([
    orEmpty(fetchMainBanners),
    orEmpty(fetchSearchKeywordRankings),
    orEmpty(fetchSkinTypes),
    orNull(() => fetchProductRankings()),
    orEmpty(fetchCategories),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c") }}
      />

      <NoticeBanner />
      <HomeTopBar />

      {/*
        명세 S20 은 영역 사이를 32, 끝 여백을 40 으로 둔다(LAYOUT).
        캐러셀은 앞뒤 카드가 화면 끝까지 걸치도록 화면 폭 전체를 쓰고, 나머지 영역만 거터 안에 둔다.
      */}
      <main className="flex flex-1 flex-col gap-8 pb-10">
        <CurationCarousel items={curations.filter(isCurationBanner)} />
        <div className="flex flex-col gap-8 px-gutter">
          <PopularKeywords items={keywords} />
          <SkinTypeMenu items={skinTypes} />
          <PopularProducts initialItems={rankings} categories={categories} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
