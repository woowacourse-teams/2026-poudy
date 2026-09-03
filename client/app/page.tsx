import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { RecentFilters, SavedPreview } from "@/components/home/PersonalSections";
import { OPERATOR } from "@/components/legal/operator";
import { Icon } from "@/components/ui/icons/Icon";
import { TopBar } from "@/components/ui/TopBar";
import { EXCLUDE_CODES } from "@/lib/domain/filter";
import { absoluteUrl, SITE_ALTERNATE_NAME, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const INSTAGRAM_URL = "https://www.instagram.com/poudy.official";

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

const ACTIONS = [
  {
    href: "/search/products",
    icon: "search",
    label: "제품명·브랜드로 찾기",
    tone: "dark",
  },
  {
    href: "/search/ingredients",
    icon: "sliders",
    label: "성분·조건으로 찾기",
    tone: "light",
  },
] as const;

const QUICK_FILTERS: Record<(typeof EXCLUDE_CODES)[number], { label: string; image: string }> = {
  FRAGRANCE_ALLERGENS: { label: "향료·알레르기", image: "/images/quick-filters/fragrance-allergens.png" },
  DRYING_ALCOHOLS: { label: "건조 알코올", image: "/images/quick-filters/drying-alcohols.png" },
  HARSH_PRESERVATIVES: { label: "자극성 방부제", image: "/images/quick-filters/harsh-preservatives.png" },
  SULFATES: { label: "설페이트", image: "/images/quick-filters/sulfates.png" },
  CYCLIC_SILICONES: { label: "실리콘", image: "/images/quick-filters/cyclic-silicones.png" },
  SYNTHETIC_COLORANTS: { label: "합성 색소", image: "/images/quick-filters/synthetic-colorants.png" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c") }}
      />
      <TopBar title="oudy" variant="root" showLogo />

      <main className="flex flex-1 flex-col gap-7 px-4 pt-4 pb-3.5">
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-bold text-text-primary">궁금한 제품이나 성분이 있나요?</h2>

          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((action) => {
              const dark = action.tone === "dark";
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  data-tone={action.tone}
                  className={`action-card flex h-full flex-col gap-5 rounded-2xl p-3.5 ${dark ? "bg-action" : "bg-surface"}`}
                >
                  <span className="flex items-center justify-between">
                    <Icon name={action.icon} size={28} className={dark ? "text-action-text" : "text-text-primary"} />
                    <Icon
                      name="chevron-right"
                      size={18}
                      className={`action-card-arrow ${dark ? "text-white/60" : "text-text-secondary"}`}
                    />
                  </span>
                  <span className={`text-[15px] font-bold ${dark ? "text-action-text" : "text-text-primary"}`}>
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[16px] font-bold text-text-primary">이 성분 빼고 찾기</h2>
          <ul className="grid grid-cols-3 gap-3">
            {EXCLUDE_CODES.map((code) => (
              <li key={code}>
                <Link
                  href={`/products?excludeCodes=${code}`}
                  className="quick-filter-link flex flex-col items-center gap-1"
                >
                  {/*
                    그림은 60px 로 그려지지만 그 값을 그대로 적으면 next/image 가 1배와
                    2배, 곧 64px 와 128px 사본만 만든다. 3배 화면은 180px 가 필요한데
                    128px 를 늘려 쓰게 되어 가장자리가 뭉개진다.
                    두 배로 적어 2배 사본이 256px 가 되게 한다. 그리는 크기는 아래
                    className 이 정하므로 화면은 달라지지 않는다.
                  */}
                  <Image
                    src={QUICK_FILTERS[code].image}
                    alt=""
                    width={120}
                    height={120}
                    loading="eager"
                    className="quick-filter-tile size-17 rounded-[20px] bg-linear-to-br from-[#FBFBFC] to-[#EFF0F3] p-1"
                  />
                  <span className="text-center text-[13px] font-semibold text-text-primary">
                    {QUICK_FILTERS[code].label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <RecentFilters />
        <SavedPreview />
      </main>

      <footer className="flex flex-col items-center gap-2 bg-surface-subtle px-4 py-9 text-center text-[11px] text-text-secondary">
        <p className="flex items-center justify-center gap-2">
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="underline">
            이용약관
          </Link>
        </p>

        <ul className="flex items-center gap-2">
          <li>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`${OPERATOR.serviceName} 인스타그램 (새 창)`}
              className="flex size-9 items-center justify-center"
            >
              <Icon name="instagram" size={18} />
            </a>
          </li>
          <li>
            <a
              href={`mailto:${OPERATOR.officer.email}`}
              aria-label={`${OPERATOR.serviceName} 에 메일 보내기`}
              className="flex size-9 items-center justify-center"
            >
              <Icon name="mail" size={18} />
            </a>
          </li>
        </ul>

        <p className="text-[10px]">
          당신의 피부를 생각하는 {OPERATOR.name} <span aria-hidden="true">💗</span>
        </p>
      </footer>
    </>
  );
}
