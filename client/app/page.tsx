import type { Metadata } from "next";
import Link from "next/link";

import { CurationCarousel } from "@/components/home/CurationCarousel";
import { PopularKeywords } from "@/components/home/PopularKeywords";
import { PopularProducts } from "@/components/home/PopularProducts";
import { SkinTypeMenu } from "@/components/home/SkinTypeMenu";
import { Icon } from "@/components/ui/icons/Icon";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { TopBar } from "@/components/ui/TopBar";
import {
  fetchCategories,
  fetchCurations,
  fetchProductRankings,
  fetchSearchKeywordRankings,
  fetchSkinTypes,
} from "@/lib/api/products";
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
      name: SITE_NAME,
      alternateName: [SITE_ALTERNATE_NAME],
      description: SITE_DESCRIPTION,
      url: absoluteUrl("/"),
      inLanguage: "ko-KR",
      publisher: { "@id": organizationId },
    },
    {
      "@type": "Organization",
      "@id": organizationId,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      description: SITE_DESCRIPTION,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/favicon.png"),
      sameAs: [INSTAGRAM_URL],
    },
  ],
};

/**
 * 한 곳이라도 무너지면 홈 전체가 빈 화면이 된다. 영역마다 따로 받아서
 * 실패한 자리만 비우고 나머지는 그대로 그린다.
 */
const orEmpty = async <T,>(load: () => Promise<{ items: readonly T[] }>): Promise<readonly T[]> =>
  load()
    .then((response) => response.items)
    .catch(() => []);

export default async function Home() {
  const [curations, keywords, skinTypes, rankings, categories] = await Promise.all([
    orEmpty(fetchCurations),
    orEmpty(fetchSearchKeywordRankings),
    orEmpty(fetchSkinTypes),
    orEmpty(() => fetchProductRankings()),
    orEmpty(fetchCategories),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c") }}
      />

      <TopBar
        title={SITE_NAME}
        variant="root"
        showLogo
        logoOnly
        right={
          <Link href="/search/products" aria-label="검색" className="flex size-11 items-center justify-center">
            <Icon name="search" size={22} className="text-text-primary" />
          </Link>
        }
      />

      {/* 디자인(S01)은 영역 사이를 32, 아래 여백을 40 으로 둔다. */}
      <main className="flex flex-1 flex-col gap-8 px-4 pt-1 pb-10">
        <CurationCarousel items={curations} />
        <PopularKeywords items={keywords} />
        <SkinTypeMenu items={skinTypes} />
        <PopularProducts initialItems={rankings} categories={categories} />
      </main>

      <SiteFooter />
    </>
  );
}
