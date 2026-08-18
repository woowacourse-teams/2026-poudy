import Image from "next/image";
import Link from "next/link";

import { RecentFilters, SavedPreview } from "@/components/home/PersonalSections";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { EXCLUDE_CODE_LABELS } from "@/lib/domain/exclude-codes";
import { EXCLUDE_CODES } from "@/lib/domain/filter";

/*
 * S01 홈. 문구와 카드는 정적이라 서버가 그리고,
 * 최근 탐색 조건과 저장한 제품만 브라우저에서 채운다.
 */

const ACTIONS = [
  {
    href: "/search?mode=product",
    title: "제품명·브랜드 찾기",
    detail: "이름을 알고 있다면 바로 검색해 보세요",
  },
  {
    href: "/search?mode=ingredient",
    title: "성분·조건 찾기",
    detail: "피하고 싶은 성분으로 좁혀 보세요",
  },
] as const;

/** 빠른 필터 그림. 라벨이 뜻을 전하므로 이미지에는 대체 텍스트를 비운다. */
const QUICK_FILTER_IMAGES: Record<(typeof EXCLUDE_CODES)[number], string> = {
  FRAGRANCE_ALLERGENS: "/images/quick-filters/fragrance-allergens.png",
  DRYING_ALCOHOLS: "/images/quick-filters/drying-alcohols.png",
  HARSH_PRESERVATIVES: "/images/quick-filters/harsh-preservatives.png",
  SULFATES: "/images/quick-filters/sulfates.png",
  CYCLIC_SILICONES: "/images/quick-filters/cyclic-silicones.png",
  SYNTHETIC_COLORANTS: "/images/quick-filters/synthetic-colorants.png",
};

const TRUST = [
  { title: "공식 전성분", detail: "브랜드가 공개한 성분표를 그대로 정리했어요" },
  { title: "있는 그대로", detail: "좋고 나쁨 대신 성분 구성을 보여드려요" },
  { title: "내 기준으로", detail: "피하고 싶은 성분을 직접 정할 수 있어요" },
] as const;

export default function Home() {
  return (
    <>
      <TopBar title="Poudy" variant="root" />

      <main className="flex-1">
        <section className="px-4 pt-2 pb-5">
          <h2 className="text-[22px] font-bold text-text-primary">
            성분으로 고르는
            <br />
            화장품 탐색
          </h2>
          <p className="mt-2 text-[14px] text-text-secondary">원하는 조건을 정하면 맞는 제품만 모아 보여드려요.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col gap-1 rounded-xl border border-border p-3"
              >
                <span className="text-[14px] font-semibold text-text-primary">{action.title}</span>
                <span className="text-[12px] text-text-secondary">{action.detail}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-4 pb-5">
          <h2 className="pb-3 text-[16px] font-bold text-text-primary">빠른 필터로 바로 보기</h2>
          <ul className="grid grid-cols-3 gap-2">
            {EXCLUDE_CODES.map((code) => (
              <li key={code}>
                <Link
                  href={`/products?excludeCodes=${code}`}
                  className="flex h-full flex-col items-center gap-2 rounded-xl bg-surface p-3 text-center"
                >
                  <Image src={QUICK_FILTER_IMAGES[code]} alt="" width={64} height={64} className="size-16" />
                  <span className="text-[12px] font-medium text-text-primary">
                    {EXCLUDE_CODE_LABELS[code].replace(" 제외", "")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <RecentFilters />
        <SavedPreview />

        <section className="border-t-8 border-surface px-4 py-5">
          <ul className="flex flex-col gap-3">
            {TRUST.map((item) => (
              <li key={item.title} className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-text-primary">{item.title}</span>
                <span className="text-[12px] text-text-secondary">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <BottomNavigation />
    </>
  );
}
