import type { Metadata } from "next";
import { connection } from "next/server";

import { CurationCarousel } from "@/components/home/CurationCarousel";
import { HomeShortcuts } from "@/components/home/HomeShortcuts";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { PopularKeywords } from "@/components/home/PopularKeywords";
import { PopularProducts } from "@/components/home/PopularProducts";
import { SectionBand } from "@/components/home/SectionBand";
import { OPERATOR } from "@/components/legal/operator";
import { NoticeBanner } from "@/components/notices/NoticeBanner";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { YouTubeHomeSection } from "@/components/youtube/ChannelCards";
import {
  fetchCategories,
  fetchMainBanners,
  fetchProductRankings,
  fetchSearchKeywordRankings,
  fetchSkinTypes,
} from "@/lib/api/products";
import { fetchYouTubeChannelCards } from "@/lib/api/youtube";
import { isCurationBanner } from "@/lib/domain/banner";
import { absoluteUrl, INSTAGRAM_URL, SITE_ALTERNATE_NAME, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// 기존 홈 데이터의 기본 캐시 주기. 유튜버 Order는 요청마다 조회한다.
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
  await connection();
  const [curations, keywords, skinTypes, rankings, categories, youtube] = await Promise.all([
    orEmpty(fetchMainBanners),
    orEmpty(fetchSearchKeywordRankings),
    orEmpty(fetchSkinTypes),
    orNull(() => fetchProductRankings()),
    orEmpty(fetchCategories),
    fetchYouTubeChannelCards().catch(() => []),
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
        시안(H49xAq)대로 영역 사이를 16, 끝 여백을 40 으로 둔다.
        캐러셀, 바로가기 줄, 회색 띠는 화면 폭 전체를 쓰고, 나머지 영역만 거터 안에 둔다.
      */}
      <main className="flex flex-1 flex-col gap-4 pb-10">
        <CurationCarousel items={curations.filter(isCurationBanner)} />
        <div className="px-gutter">
          <PopularKeywords items={keywords} />
        </div>
        <HomeShortcuts items={skinTypes} />
        <SectionBand />
        <YouTubeHomeSection items={youtube} />
        <div className="px-gutter">
          <PopularProducts initialItems={rankings} categories={categories} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
