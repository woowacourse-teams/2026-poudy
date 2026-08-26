import Image from "next/image";
import Link from "next/link";

import { RecentFilters, SavedPreview } from "@/components/home/PersonalSections";
import { OPERATOR } from "@/components/legal/operator";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { Icon } from "@/components/ui/icons/Icon";
import { TopBar } from "@/components/ui/TopBar";
import { EXCLUDE_CODES } from "@/lib/domain/filter";

/*
 * 공식 인스타그램. 주소에 붙어 오는 `igsh` 는 어디서 눌렀는지 따라다니는 값이라
 * 떼어 내고 계정 주소만 남긴다.
 */
const INSTAGRAM_URL = "https://www.instagram.com/poudy.official";

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

/**
 * 디자인의 빠른 필터 메뉴. 라벨이 뜻을 전하므로 그림에는 대체 텍스트를 비운다.
 *
 * 그림 여섯 장은 채도와 금지 표시를 맞춰 한 벌로 다시 그린 것이다.
 * 배경이 없는 그림이라 화면의 배경색 위에 그대로 얹힌다.
 * 다시 만들 때 지킬 규칙은 저장소 밖의 `icon-prompt.md` 에 적어 두었다.
 */
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

      {/* 영역마다 하는 이야기가 달라 한 덩어리로 읽히지 않도록 사이를 넉넉히 벌린다. */}
      <main className="flex flex-1 flex-col gap-7 px-4 pt-4 pb-3.5">
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
                  // 어두운 카드는 그림자를 더 진하게 깐다. 그 구분을 CSS 가 읽을 수 있게 남긴다.
                  data-tone={action.tone}
                  className={`action-card flex h-full flex-col gap-2.5 rounded-2xl p-3.5 ${dark ? "bg-action" : "bg-surface"}`}
                >
                  <span className="flex items-center justify-between">
                    <Icon name={action.icon} size={28} className={dark ? "text-action-text" : "text-text-primary"} />
                    <Icon
                      name="chevron-right"
                      size={18}
                      className={`action-card-arrow ${dark ? "text-white/60" : "text-text-secondary"}`}
                    />
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
                // 넘어간 줄까지 가운데로 맞춘다. 카드 높이는 격자가 서로 맞춰 준다.
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center ${item.bg}`}
              >
                <Icon name={item.icon} size={18} className={item.tint} />
                {/*
                  좁은 화면에서는 `조건은 직접 골라요` 만 제목이 두 줄로 넘어간다.
                  그러면 그 카드만 설명이 한 줄 아래에서 시작해 셋이 어긋나 보인다.
                  제목 자리를 늘 두 줄로 잡아 두어 설명이 같은 높이에 서게 한다.
                */}
                <span className="min-h-[2lh] text-[12px] font-medium text-text-primary">{item.title}</span>
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
                <Link
                  href={`/products?excludeCodes=${code}`}
                  className="quick-filter-link flex flex-col items-center gap-1"
                >
                  {/*
                    그림에 배경이 없어 바탕을 여기서 깐다. 색을 코드가 쥐고 있으므로
                    그림을 다시 그리지 않고도 바꿀 수 있다.

                    안쪽 여백만큼 바탕을 키운다. `p-*` 로 안을 파면 그림이 그만큼
                    작아져 카드 안에서 왜소해진다.

                    기울기는 그림의 조명과 같은 좌상 -> 우하 방향이다. 반대로 흐르면
                    바탕이 그림과 다른 곳에서 빛을 받는 것처럼 보인다.
                  */}
                  <Image
                    src={QUICK_FILTERS[code].image}
                    alt=""
                    width={60}
                    height={60}
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

      {/* 법정 문서는 이용자가 쉽게 찾을 수 있어야 한다. 본문의 꼬리말이 아니라 화면 전체의 꼬리말이라 main 밖에 둔다. */}
      {/*
        배경색이 이미 본문과의 경계를 만든다. 위쪽 선까지 두면 경계가 겹쳐 보인다.
        본문에서 눈을 뺏지 않도록 흰색에 가깝게 아주 옅은 회색만 깐다.
      */}
      <footer className="flex flex-col items-center gap-2 bg-[#FAFAFB] px-4 py-9 text-center text-[11px] text-text-secondary">
        {/* 두 링크의 길이가 달라 사이만 띄우면 한쪽으로 쏠려 보인다. 가운뎃점으로 묶어 한 줄로 읽히게 한다. */}
        <p className="flex items-center justify-center gap-2">
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="underline">
            이용약관
          </Link>
        </p>

        {/*
          아이콘만 있는 링크라 이름을 읽을 수 없다. 무엇으로 가는지 aria-label 로 밝힌다.
          누르는 자리는 눈에 보이는 아이콘보다 넓게 잡아 손가락으로 짚기 쉽게 한다.
        */}
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

        {/* 누가 만든 서비스인지 밝힌다. 연락처는 바로 위 메일 아이콘이 이미 들고 있다. */}
        {/* 하트는 꾸밈이라 뜻을 전하지 않는다. 화면 낭독기가 `분홍 하트` 라고 읽지 않게 감춘다. */}
        <p className="text-[10px]">
          당신의 피부를 생각하는 {OPERATOR.name} <span aria-hidden="true">💗</span>
        </p>
      </footer>

      <BottomNavigation />
    </>
  );
}
