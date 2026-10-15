import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { StatDial } from "@/components/about/StatDial";
import { PRESS_SCALE } from "@/components/ui/press";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "서비스 소개",
  description: "피하고 싶은 성분과 원하는 성분만 고르면 맞는 화장품을 모아 보여 주는 파우디의 사용법을 소개합니다.",
  alternates: { canonical: "/about" },
};

/*
 * 숫자는 서버가 집계하지 않고 이 화면에 적어 둔다. 기준 달이 바뀌면 함께 고친다.
 * 사용자 수처럼 작아 보일 수 있는 숫자는 싣지 않는다(디자인 S56).
 */
const STATS_AS_OF = "2026년 10월";
const STATS = [
  { label: "등록된 제품", value: 1240 },
  { label: "정리한 성분", value: 22013 },
  { label: "브랜드", value: 39 },
] as const;

const STEPS = [
  {
    title: "원하는 성분과\n피하고 싶은 성분을 골라요",
    description: "성분 이름으로 찾거나, 자주 피하는 성분을\n눌러서 바로 조건에 추가해요",
    image: "/images/about/step1-conditions.webp",
    alt: "탐색 조건 화면. 원하는 성분에 나이아신아마이드와 판테놀, 피하고 싶은 성분에 히알루론산이 담겨 있고, 아래에 472개 제품 보기 버튼이 있다.",
  },
  {
    title: "조건에 맞는 제품만\n한 번에 모아 봐요",
    description: "카테고리·브랜드·피부 타입으로 더 좁혀 볼 수 있어요",
    image: "/images/about/step2-products.webp",
    alt: "조건 일치 제품 화면. 포함·제외 조건 칩 아래로 조건에 맞는 제품 472개가 나열되어 있다.",
  },
  {
    title: "전성분과 주의 성분을\n표기 순서 그대로",
    description: "주의 성분이 들었는지, 성분마다 어떤 역할인지 확인해요",
    image: "/images/about/step3-ingredients.webp",
    alt: "제품 상세의 주의 성분 확인. 들어 있는 주의 성분 1종(향료/알레르기 성분)과 찾지 못한 5종, 아래로 전체 성분 목록이 있다.",
  },
] as const;

/* 사용법 섹션의 바탕을 번갈아 칠해 단계마다 끊어 읽히게 한다. */
const STEP_BACKGROUNDS = ["bg-background", "bg-surface", "bg-background"] as const;

const FEATURES = [
  {
    title: "공유 한 번으로\n전성분 열기",
    description: "쇼핑 앱에서 파우디로 공유하면 바로 열려요",
    image: "/images/about/feature-share.webp",
    alt: "휴대폰 공유 대상 목록에서 Poudy가 선택된 모습",
  },
  {
    title: "성분마다\n무슨 역할인지",
    description: "배합 목적과 설명을 출처와 함께",
    image: "/images/about/feature-ingredient-role.webp",
    alt: "성분 설명의 '무슨 역할을 하나요?' 카드. 성분의 역할 설명과 습윤제·피부 컨디셔닝제 태그가 있다.",
  },
  {
    title: "브랜드·카테고리로\n둘러보기",
    description: "원하는 제품 유형만 골라 봐요",
    image: "/images/about/feature-brand-category.webp",
    alt: "카테고리 화면의 브랜드 탭. 가나다순 브랜드 목록과 브랜드별 제품 수가 있다.",
  },
  {
    title: "용량별 가격 비교",
    description: "용량마다 정가와 단가를 한눈에 비교해요",
    image: "/images/about/feature-price.webp",
    alt: "1025 독도 토너의 용량별 정가와 mL당 가격 표",
  },
] as const;

/* 디자인의 브랜드 글자색. 지금 토큰에는 같은 자리가 없어 값을 그대로 쓴다. */
const BRAND_TEXT = "text-[#C23A60]";

const PRIMARY_BUTTON = `flex h-12 items-center justify-center rounded-button bg-action px-4 text-[14px] leading-[1.4] font-semibold text-action-text ${PRESS_SCALE}`;
const SECONDARY_BUTTON = `flex h-12 items-center justify-center rounded-button bg-[#EDEFF3] px-4 text-[14px] leading-[1.4] font-semibold text-text-primary ${PRESS_SCALE}`;

/**
 * 디자인 S56 서비스 소개.
 *
 * 처음 온 사람이 어떤 서비스인지(히어로와 숫자), 어떻게 쓰는지(사용법 1~3과 기능 카드),
 * 어디서 시작하는지(바로 둘러보기와 로그인)를 한 화면에서 읽게 한다. 홈 캐러셀 첫 장과
 * 푸터에서 들어온다. 서버 데이터를 받지 않아 문구와 화면 캡처를 모두 여기에 적어 둔다.
 */
export default function AboutPage() {
  return (
    <>
      {/* 본문에 진짜 제목(h1)이 있으므로 바 제목은 문서 구조에서 내린다. */}
      <TopBar title="서비스 소개" variant="sub" titleAs="p" />

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center gap-4 overflow-hidden bg-brand-soft px-4 pt-8 text-center">
          <h1 className="text-[24px] leading-[1.3] font-bold text-text-primary">
            원하는 성분으로
            <br />
            찾는 화장품
          </h1>
          {/* 누구의(피하고 싶은 성분이 있는 사람) 어떤 문제를 푸는지(맞는 제품을 모아 줌) 두 곳만 굵게 둔다. */}
          <p className="text-[13px] leading-[1.5] text-text-secondary">
            <strong className="font-bold text-text-primary">피하고 싶은 성분</strong>이 있는데
            <br />
            전성분표를 하나하나 읽기 힘들었다면
            <br />
            성분만 고르세요. <strong className="font-bold text-text-primary">맞는 제품을 모아 드려요</strong>
          </p>
          {/* 화면 캡처는 아랫부분을 잘라 다음 섹션으로 이어지는 것처럼 보이게 한다. */}
          <div className="flex h-[300px] w-full justify-center overflow-hidden pt-2">
            <Image
              src="/images/about/hero-home.webp"
              alt="파우디 홈 화면. 맨 위에 큐레이션 배너 '왜 발라도 다시 건조할까?'가 있고, 아래에 인기 검색어와 피부 타입별 찾기가 있다."
              width={261}
              height={341}
              priority
              className="h-auto w-[260px] max-w-none shrink-0 self-start"
            />
          </div>
        </section>

        <section
          aria-labelledby="about-stats"
          className="flex flex-col items-center gap-4 border-b border-border bg-background px-4 py-6"
        >
          <h2 id="about-stats" className="text-[16px] leading-[1.4] font-bold text-text-primary">
            파우디는 지금
          </h2>
          {/*
            낭독기는 이름을 먼저 읽고(등록된 제품, 1,240) 화면은 숫자를 위에 둔다.

            기본 글자 크기에서는 세 칸으로 놓는다. 글자를 키우면 숫자가 칸 밖으로 넘치므로, 칸 폭이 숫자 폭
            (약 3.75em)보다 좁아지면 다음 줄로 넘긴다. 칸 사이의 선은 각 칸 왼쪽 바깥 1px 에 긋고 목록 밖을
            잘라, 줄의 첫 칸에서는 선이 보이지 않게 한다. `dl` 안에는 묶음 `div` 만 둘 수 있어 선은 가상 요소다.
          */}
          <dl className="grid w-full grid-cols-[repeat(auto-fit,minmax(3.75em,1fr))] gap-y-4 overflow-hidden text-[24px]">
            {STATS.map(({ label, value }) => (
              <div
                key={label}
                className="relative flex flex-col-reverse items-center gap-0.5 before:absolute before:top-1/2 before:-left-px before:h-10 before:w-px before:-translate-y-1/2 before:bg-border before:content-['']"
              >
                <dt className="text-[12px] leading-[1.4] text-text-secondary">{label}</dt>
                <dd className="text-[24px] leading-[1.3] font-bold text-text-primary tabular-nums">
                  <StatDial value={value} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-center text-[12px] leading-[1.4] text-text-secondary">
            {STATS_AS_OF} 기준 · 공개된 전성분표를 바탕으로 정리했어요
          </p>
        </section>

        {STEPS.map((step, index) => (
          <section
            key={step.image}
            aria-labelledby={`about-step-${index + 1}`}
            className={`flex flex-col items-center gap-3 px-4 py-8 text-center ${STEP_BACKGROUNDS[index]}`}
          >
            <p className={`text-[12px] leading-[1.4] font-bold ${BRAND_TEXT}`}>사용법 {index + 1}</p>
            <h2
              id={`about-step-${index + 1}`}
              className="text-[16px] leading-[1.4] font-bold whitespace-pre-line text-text-primary"
            >
              {step.title}
            </h2>
            <p className="text-[13px] leading-[1.5] whitespace-pre-line text-text-secondary">{step.description}</p>
            <Image src={step.image} alt={step.alt} width={241} height={401} className="mt-3 h-auto w-[240px]" />
          </section>
        ))}

        <section aria-labelledby="about-features" className="flex flex-col gap-5 bg-text-primary px-4 py-8">
          <h2 id="about-features" className="text-[16px] leading-[1.4] font-bold text-white">
            이런 것도 할 수 있어요
          </h2>
          {/*
            두 칸씩 놓아 2·2·1 로 쌓는다. 칸의 최소 폭을 줄 폭의 절반(사이 간격 8px 을 뺀 값)으로 잡아,
            넓은 화면에서도 세 칸으로 늘어나지 않게 한다.

            글자를 키우면 '브랜드·카테고리로' 같은 제목이 칸에 들지 않아 낱말이 갈라진다. 칸 폭이 제목 폭
            (약 7.25em)과 안쪽 여백(24px)보다 좁아지면 최소 폭이 절반을 넘으므로 한 칸으로 내려간다.
          */}
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,max(calc(24px+7.25em),calc(50%-4px))),1fr))] gap-x-2 gap-y-5 text-[14px]">
            {FEATURES.map((feature) => (
              <li key={feature.image} className="flex flex-col gap-2 rounded-2xl bg-background p-3">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={151}
                  height={96}
                  className="h-24 w-full object-contain"
                />
                <h3 className="text-[14px] leading-[1.4] font-bold whitespace-pre-line text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-[12px] leading-[1.5] text-text-secondary">{feature.description}</p>
              </li>
            ))}
            <li className="col-span-full flex flex-col items-start gap-2 rounded-2xl bg-background p-3">
              <Image
                src="/images/about/feature-shelf.webp"
                alt="내 선반. 사용 중인 제품 목록에 잘 맞음과 안 맞음 평가가 표시되어 있다."
                width={334}
                height={150}
                className="h-[150px] w-full object-contain"
              />
              <span
                className={`flex min-h-5 items-center rounded bg-brand-soft px-1 text-[12px] leading-[1.4] font-semibold ${BRAND_TEXT}`}
              >
                로그인하면
              </span>
              <h3 className="text-[14px] leading-[1.4] font-bold text-text-primary">
                안 맞았던 제품으로 의심 성분 찾기
              </h3>
              <p className="text-[12px] leading-[1.5] text-text-secondary">
                써 본 제품을 선반에 올리고 잘 맞았는지 골라요. 안 맞은 제품이 2개 이상이면 함께 든 성분을 찾아 드려요
              </p>
            </li>
          </ul>
        </section>

        <section aria-labelledby="about-start" className="flex flex-col items-stretch gap-3 px-4 py-8 text-center">
          <h2 id="about-start" className="text-[16px] leading-[1.4] font-bold text-text-primary">
            지금 바로 써 보세요
          </h2>
          <p className="text-[13px] leading-[1.4] text-text-secondary">로그인하지 않아도 바로 둘러볼 수 있어요</p>
          <Link href="/" className={PRIMARY_BUTTON}>
            바로 둘러보기
          </Link>
          <Link href="/login" className={SECONDARY_BUTTON}>
            로그인
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
