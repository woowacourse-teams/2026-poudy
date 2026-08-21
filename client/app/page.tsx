import Image from "next/image";
import Link from "next/link";

import { RecentFilters, SavedPreview } from "@/components/home/PersonalSections";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { Icon } from "@/components/ui/icons/Icon";
import { TopBar } from "@/components/ui/TopBar";
import { EXCLUDE_CODES } from "@/lib/domain/filter";

/*
 * S01 홈. 구조는 design/v1.pen 을 그대로 따른다.
 * 서비스 안내 문구만 말투를 다듬어 디자인과 다르다.
 * 최근 검색과 저장 제품만 브라우저에서 채운다.
 */

const ACTIONS = [
  {
    href: "/search/products",
    icon: "search",
    label: "제품명·브랜드로 찾기",
    detail: "이름을 알 때 가장 빠르게",
    tone: "dark",
  },
  {
    href: "/search/ingredients",
    icon: "sliders",
    label: "성분·조건으로 찾기",
    detail: "원하는 조건을 골라 탐색",
    tone: "light",
  },
] as const;

const TRUST = [
  {
    title: "출처가 있어요",
    detail: "근거를 함께 적어요",
    icon: "badge-check",
    bg: "bg-brand-soft",
    tint: "text-brand",
  },
  {
    title: "과장하지 않아요",
    detail: "좋다고 말하지 않아요",
    icon: "info",
    bg: "bg-info-soft",
    tint: "text-info",
  },
  {
    title: "조건은 직접 골라요",
    detail: "딱 맞는 것만 골라요",
    icon: "sliders",
    bg: "bg-success-soft",
    tint: "text-success",
  },
] as const;

/** 디자인의 빠른 필터 메뉴. 라벨이 뜻을 전하므로 그림에는 대체 텍스트를 비운다. */
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
      <TopBar title="oudy" variant="root" showLogo />

      <main className="flex flex-1 flex-col gap-[18px] px-4 pt-4 pb-3.5">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[18px] font-bold text-text-primary">궁금한 제품이나 성분이 있나요?</h2>
            <p className="text-[12px] text-text-secondary">제품과 성분을 한 번에 찾아보세요.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((action) => {
              const dark = action.tone === "dark";
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex h-full flex-col gap-2.5 rounded-2xl p-3.5 ${dark ? "bg-action" : "bg-surface"}`}
                >
                  <span className="flex items-center justify-between">
                    <Icon name={action.icon} size={28} className={dark ? "text-action-text" : "text-text-primary"} />
                    <Icon name="chevron-right" size={18} className={dark ? "text-white/60" : "text-text-secondary"} />
                  </span>
                  <span className="flex flex-1 flex-col justify-between gap-2">
                    <span className={`text-[15px] font-bold ${dark ? "text-action-text" : "text-text-primary"}`}>
                      {action.label}
                    </span>
                    <span className={`text-[11px] ${dark ? "text-white/70" : "text-text-secondary"}`}>
                      {action.detail}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="sr-only">서비스 안내</h2>
          <ul className="grid grid-cols-3 gap-2">
            {TRUST.map((item) => (
              <li
                key={item.title}
                // 문구가 길면 줄이 넘어간다. 넘어간 줄까지 가운데로 맞춘다.
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center ${item.bg}`}
              >
                <Icon name={item.icon} size={18} className={item.tint} />
                <span className="text-[12px] font-medium text-text-primary">{item.title}</span>
                <span className="text-[11px] text-text-secondary">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[16px] font-bold text-text-primary">이 성분 빼고 찾기</h2>
          <ul className="grid grid-cols-3 gap-3">
            {EXCLUDE_CODES.map((code) => (
              <li key={code}>
                <Link href={`/products?excludeCodes=${code}`} className="flex flex-col items-center gap-1.5">
                  <Image
                    src={QUICK_FILTERS[code].image}
                    alt=""
                    width={60}
                    height={60}
                    className="size-[60px] rounded-[18px] object-cover"
                  />
                  <span className="text-center text-[11px] font-semibold text-text-primary">
                    {QUICK_FILTERS[code].label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <RecentFilters />
        <SavedPreview />

        {/* 법정 문서는 이용자가 쉽게 찾을 수 있어야 한다. 모든 화면이 홈으로 돌아온다. */}
        <footer className="border-t border-border pt-4 text-center text-[11px] text-text-secondary">
          <p className="flex justify-center gap-3">
            <Link href="/privacy" className="underline">
              개인정보 처리방침
            </Link>
            <Link href="/terms" className="underline">
              이용약관
            </Link>
          </p>
        </footer>
      </main>

      <BottomNavigation />
    </>
  );
}
