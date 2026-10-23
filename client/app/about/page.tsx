import { Icon } from "@poudy/design-system/icon";
import type { IconName } from "@poudy/design-system/icon";
import type { Metadata } from "next";

import { AboutFaq } from "@/components/about/AboutFaq";
import { AboutReveal } from "@/components/about/AboutReveal";
import { SnippetImage } from "@/components/about/SnippetImage";
import { StartLink } from "@/components/about/StartLink";
import { StatDial } from "@/components/about/StatDial";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "써 본 화장품을 선반에 모으면 나와 안 맞는 성분을 찾아 드려요. 성분으로 화장품을 찾고 전성분을 확인하는 파우디의 사용법을 소개합니다.",
  alternates: { canonical: "/about" },
};

/*
 * 디자인 S56-M·T·D. 모바일(600px 미만) · 태블릿(600~1023px) · 데스크톱(1024px 이상) 세 판이다.
 * 태블릿은 `min-[600px]:`, 데스크톱은 `lg:` 로 쓴다. 명세가 태블릿을 600 부터 그려 Tailwind 기본 sm(640)과 다르다.
 *
 * 데스크톱의 큰 글자(32·40·44)는 명세가 웹 판 전용 예외로 두어 아직 토큰이 없다(S56-T·D 주석).
 * 쓰는 곳마다 꼬리표를 달지 않도록 여기에 한 번만 적는다.
 */
// eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: S56 웹 판 섹션 제목 32 토큰이 없다 · 만료 2026-11-30
const DESKTOP_TITLE = "lg:text-[32px]";
// eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: S56 웹 판 큰 글자 40·44 토큰이 없다 · 만료 2026-11-30
const HERO_TITLE = "min-[600px]:text-[40px] lg:text-[44px]";
// eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: S56 웹 판 숫자 44 토큰이 없다 · 만료 2026-11-30
const DESKTOP_STAT = "lg:text-[44px]";

/*
 * 글자를 키워도 낱말이 갈라지지 않게 칸이 글자를 따라 넓어지는 계산식이다(text-scale-check). 간격 스케일로는
 * 글자 크기를 따라가는 폭을 쓸 수 없다.
 *
 * - 선반 단계(태블릿): 설명 칸은 기본 배율에서 260(16px 의 16.25배)이고 글자와 함께 넓어진다. 조각 판이 240 보다
 *   좁아지면 조각을 다음 줄로 내린다.
 * - 부가 기능: 두 칸이 기본이고, 칸이 아이콘(44)·간격(16)과 가장 긴 낱말(20px 글자 9.5개)을 담지 못하면 한 칸으로 내린다.
 */
// eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 글자를 따라 넓어지는 설명 칸 폭(em) 토큰이 없다 · 만료 2026-11-30
const STEP_TEXT_BASIS = "min-[600px]:basis-[16.25em]";
const FEATURE_COLUMNS =
  // eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 글자 확대 시 칸 수를 줄이는 계산식 토큰이 없다 · 만료 2026-11-30
  "min-[600px]:grid-cols-[repeat(auto-fit,minmax(min(100%,max(calc(50%_-_16px),calc(60px_+_9.5em))),1fr))] lg:grid-cols-[repeat(auto-fit,minmax(min(100%,max(calc(50%_-_32px),calc(60px_+_9.5em))),1fr))]";

/** 섹션 좌우 여백과 데스크톱 본문 폭(960). 바탕은 화면 끝까지 칠하고 내용만 가운데 폭에 묶는다. */
const SECTION_X = "px-gutter min-[600px]:px-10";
const CONTAINER = "mx-auto w-full max-w-240";

/** 섹션 제목. 머리말이 없는 섹션(숫자·부가 기능·안심 안내·질문·시작)이 쓴다. */
const SECTION_TITLE = `text-24 leading-tight font-bold text-text-primary min-[600px]:text-28 ${DESKTOP_TITLE}`;
/** 분홍 머리말. 섹션이 무엇을 다루는지 제목보다 먼저 짚는다. */
const EYEBROW = "text-13 leading-snug font-bold text-brand-text min-[600px]:text-16";

const SHELF_STEPS = [
  {
    title: "써 본 제품을 담아요",
    description: "지금 쓰는 제품도, 예전에 쓴 제품도 괜찮아요.",
    image: {
      alt: "제품 추가 화면. '독도'로 찾은 결과에서 라운드랩 1025 독도 토너는 추가 버튼이, 1025 독도 크림은 선반에 있음 표시가 보인다.",
      narrow: { src: "/images/about/shelf-add-narrow.webp", width: 326, height: 216 },
      wide: { src: "/images/about/shelf-add-wide.webp", width: 272, height: 216 },
    },
  },
  {
    title: "잘 맞았는지 골라요",
    description: "촉촉함·번들거림도 남기면 유수분 정보를 다듬는 데 쓰여요.",
    image: {
      alt: "'이 제품, 잘 맞았나요?' 질문 아래 잘 맞았어요와 안 맞았어요 버튼이 있고, 안 맞았어요가 골라져 있다.",
      narrow: { src: "/images/about/shelf-rate-narrow.webp", width: 326, height: 109 },
      wide: { src: "/images/about/shelf-rate-wide.webp", width: 272, height: 109 },
    },
  },
  {
    title: "안 맞을 수 있는 성분을 찾아 드려요",
    description:
      "안 맞았던 제품들에 함께 든 성분을 알려 드려요. 원인이라고 단정하지 않고, 먼저 살펴볼 성분을 보여 드려요.",
    image: {
      alt: "안 맞았던 블랙 스네일 토너와 인텐시브 크림에 함께 든 성분으로 향료를 짚어 준다.",
      narrow: { src: "/images/about/shelf-ingredients-narrow.webp", width: 326, height: 185 },
      wide: { src: "/images/about/shelf-ingredients-wide.webp", width: 272, height: 185 },
    },
  },
] as const;

const FEATURES: readonly { readonly icon: IconName; readonly title: string; readonly description: string }[] = [
  {
    icon: "share",
    title: "공유 한 번으로 전성분 열기",
    description: "쇼핑 앱에서 파우디로 공유하면 그 제품의 전성분이 바로 열려요.",
  },
  { icon: "book", title: "성분마다 무슨 역할인지", description: "배합 목적과 설명을 참고자료와 함께 보여 드려요." },
  { icon: "scale", title: "용량별 가격 비교", description: "용량마다 정가와 ml당 가격을 한눈에 비교해요." },
  { icon: "grid", title: "브랜드·카테고리로 둘러보기", description: "원하는 제품 유형만 골라 둘러볼 수 있어요." },
];

const ASSURANCES: readonly { readonly icon: IconName; readonly title: string; readonly description: string }[] = [
  {
    icon: "lock",
    title: "나만 볼 수 있어요",
    description: "등록한 제품과 평가는 다른 사람에게 공개되지 않아요. 선반에서 빼면 남긴 평가도 함께 지워져요.",
  },
  {
    icon: "shield-check",
    title: "원인이라고 단정하지 않아요",
    description: "안 맞았던 제품에 함께 든 성분 중, 먼저 살펴볼 만한 성분을 알려 드려요.",
  },
  {
    icon: "file-text",
    title: "공개된 전성분표를 바탕으로",
    description: "브랜드가 공개한 전성분을 정리했고, 성분 설명에는 참고자료를 함께 달아요.",
  },
];

type SplitSectionProps = {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: React.ReactNode;
  readonly description: string;
  /** 모바일 바탕. 모바일은 섹션 바탕을 흰색과 회색으로 번갈아 칠하고, 태블릿부터는 흰 바탕에 회색 판을 둔다. */
  readonly mobileSurface: boolean;
  readonly children: React.ReactNode;
};

/** 설명(왼쪽) | 화면 조각(오른쪽) 두 단 섹션. 모바일에서는 설명 아래에 조각을 둔다. */
function SplitSection({ id, eyebrow, title, description, mobileSurface, children }: SplitSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={`${SECTION_X} py-10 min-[600px]:bg-background min-[600px]:py-24 ${mobileSurface ? "bg-surface" : "bg-background"}`}
    >
      <div
        className={`${CONTAINER} flex flex-col gap-6 min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-8 lg:gap-16`}
      >
        <div
          data-about-reveal="0"
          className="flex flex-col gap-2 min-[600px]:w-72.5 min-[600px]:shrink-0 min-[600px]:gap-3 lg:w-95"
        >
          <p className={EYEBROW}>{eyebrow}</p>
          <h2 id={id} className={`text-24 leading-tight font-bold text-text-primary ${DESKTOP_TITLE}`}>
            {title}
          </h2>
          <p className="text-15 leading-normal text-text-body min-[600px]:text-16 lg:text-18">{description}</p>
        </div>
        <div data-about-reveal="1" className="min-w-0 min-[600px]:flex-1">
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * 디자인 S56 서비스 소개. 메인 기능인 '선반을 통한 개인화'를 맨 앞에 두고, 성분 탐색과 전성분이 그 뒤를 받친다.
 *
 * 화면 조각은 실제 화면을 그대로 옮긴 그림이다. 선반 행이나 성분 조건 편집 같은 실제 컴포넌트는 로그인과
 * 서버 데이터에 묶여 있어, 소개 화면에서 가짜 데이터로 띄우면 그 화면이 바뀔 때마다 이곳이 깨진다.
 *
 * 넓은 화면에서는 앱 틀(448px) 밖으로 나와 화면 전체를 쓴다(`data-desktop-page`). 소개 화면은 PC 로 처음
 * 들어오는 사람도 많아서다. 서버 데이터를 받지 않으므로 문구와 숫자는 모두 여기에 적어 둔다.
 */
export default function AboutPage() {
  return (
    <>
      {/* 본문에 진짜 제목(h1)이 있으므로 바 제목은 문서 구조에서 내린다. */}
      <TopBar title="서비스 소개" variant="sub" titleAs="p" />

      <main data-desktop-page className="flex flex-1 flex-col break-keep">
        {/* 히어로. 버튼은 두지 않는다(시작하기 섹션에만, 2026-10-15 결정). */}
        <section className={`${SECTION_X} overflow-hidden bg-brand-soft pt-10 min-[600px]:pt-16 lg:pt-18`}>
          <div
            className={`${CONTAINER} flex flex-col items-center gap-4 min-[600px]:gap-8 lg:flex-row lg:items-end lg:gap-10`}
          >
            <div className="flex flex-col items-center gap-4 text-center min-[600px]:gap-5 lg:w-110 lg:shrink-0 lg:items-start lg:pb-24 lg:text-left">
              <p data-about-rise="0" className={`about-rise ${EYEBROW}`}>
                내 경험으로 고르는 화장품
              </p>
              <h1
                data-about-rise="1"
                className={`about-rise text-28 leading-tight font-bold text-text-primary ${HERO_TITLE}`}
              >
                다들 좋다는데,
                <br />왜 나한테는 안 맞을까요?
              </h1>
              <p data-about-rise="2" className="about-rise text-16 leading-normal text-text-body min-[600px]:text-18">
                써 본 화장품을 선반에 모으면
                <br />
                나와 안 맞는 성분을 찾아 드려요
              </p>
            </div>
            <div data-about-rise="3" className="about-rise flex w-full justify-center lg:flex-1 lg:justify-end">
              <SnippetImage
                eager
                alt="내 선반 화면. 사용 중인 제품 목록 위에 '안 맞을 수 있는 성분' 카드가 겹쳐 있고, 아직 제외하지 않은 성분으로 향료와 리모넨을 보여 준다."
                narrow={{ src: "/images/about/hero-mobile.webp", width: 358, height: 340 }}
                tablet={{ src: "/images/about/hero-tablet.webp", width: 460, height: 380 }}
                wide={{ src: "/images/about/hero-desktop.webp", width: 480, height: 400 }}
                className="block h-auto max-w-full"
              />
            </div>
          </div>
        </section>

        {/* 파우디는 지금. 숫자는 2026년 10월 기준이고, 화면에 들어오면 다이얼로 굴러 들어온다. */}
        <section aria-labelledby="about-stats" className={`${SECTION_X} py-10 min-[600px]:py-24`}>
          <div className={`${CONTAINER} flex flex-col gap-5 min-[600px]:gap-8`}>
            <h2 id="about-stats" className={SECTION_TITLE}>
              파우디는 지금
            </h2>
            <div className="grid grid-cols-2 gap-2 min-[600px]:flex min-[600px]:gap-5">
              <dl className="contents">
                {[
                  { label: "등록된 제품", value: 1240, tone: "bg-brand-soft" },
                  { label: "정리한 성분", value: 22013, tone: "bg-surface" },
                ].map(({ label, value, tone }) => (
                  <div
                    key={label}
                    className={`flex min-h-32 flex-col-reverse justify-between gap-2 rounded-2xl p-4 min-[600px]:min-h-42 min-[600px]:w-45 min-[600px]:shrink-0 min-[600px]:p-6 lg:min-h-50 lg:w-60 ${tone}`}
                  >
                    <dt className="text-14 leading-snug text-text-body min-[600px]:text-16">{label}</dt>
                    <dd className={`text-28 leading-tight font-bold text-text-primary tabular-nums ${DESKTOP_STAT}`}>
                      <StatDial value={value} />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="col-span-2 flex flex-col justify-between gap-1 rounded-2xl bg-surface p-4 min-[600px]:min-h-42 min-[600px]:flex-1 min-[600px]:gap-2 min-[600px]:p-6 lg:min-h-50">
                <p className="text-16 leading-snug font-bold text-text-primary min-[600px]:text-18 lg:text-24">
                  39개 브랜드의 공개된 전성분표를
                  <br />
                  바탕으로 정리했어요
                </p>
                <p className="text-12 leading-snug text-text-muted min-[600px]:text-13">2026년 10월 기준</p>
              </div>
            </div>
          </div>
        </section>

        {/* 선반 3단계. 모바일은 조각 아래 설명, 태블릿은 설명 | 조각 두 단, 데스크톱은 세 칸. */}
        <section aria-labelledby="about-shelf" className={`${SECTION_X} py-10 min-[600px]:py-28`}>
          <div className={`${CONTAINER} flex flex-col gap-8 min-[600px]:gap-12`}>
            <div data-about-reveal="0" className="flex flex-col gap-2 min-[600px]:max-w-140 min-[600px]:gap-3">
              <p className={EYEBROW}>선반</p>
              <h2 id="about-shelf" className={SECTION_TITLE}>
                써 볼수록
                <br className="min-[600px]:hidden" /> 나에게 맞춰져요
              </h2>
              <p className="text-15 leading-normal text-text-body min-[600px]:text-18">
                잘 맞았는지만 고르면 돼요. 쌓인 기록이 다음 화장품을 고르는 기준이 돼요.
              </p>
            </div>
            <ol className="flex flex-col gap-10 min-[600px]:gap-12 lg:grid lg:grid-cols-3 lg:gap-6">
              {SHELF_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  data-about-reveal={`lg-${index}`}
                  className="flex flex-col gap-4 min-[600px]:flex-row min-[600px]:flex-wrap min-[600px]:items-center min-[600px]:gap-8 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-4"
                >
                  <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-surface px-4 py-6 min-[600px]:order-last min-[600px]:min-h-75 min-[600px]:min-w-60 min-[600px]:flex-1 lg:order-none lg:min-h-80 lg:min-w-0 lg:flex-none">
                    <SnippetImage {...step.image} className="block h-auto max-w-full" />
                  </div>
                  <div
                    className={`flex max-w-full gap-3 min-[600px]:shrink-0 min-[600px]:grow-0 min-[600px]:text-16 ${STEP_TEXT_BASIS} lg:basis-auto`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-text-primary text-14 leading-none font-bold text-background"
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="text-18 leading-snug font-bold text-text-primary">{step.title}</h3>
                      <p className="text-15 leading-normal text-text-secondary min-[600px]:text-16">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <SplitSection
          id="about-my-filter"
          eyebrow="나만의 필터"
          title={
            <>
              찾은 성분은
              <br />
              검색할 때 빼고 보여 드려요
            </>
          }
          description="선반에서 고른 성분을 나만의 필터에 넣어 두면, 성분으로 찾을 때 한 번에 제외할 수 있어요."
          mobileSurface
        >
          <div className="flex justify-center lg:min-h-100 lg:items-center lg:rounded-2xl lg:bg-surface lg:p-10">
            <SnippetImage
              alt="나만의 필터 적용이 켜져 있고, 필터에 넣은 성분 3개가 든 제품을 제외한다는 안내 아래 나만의 필터·성분 2·카테고리 칩이 있다."
              narrow={{ src: "/images/about/my-filter-narrow.webp", width: 358, height: 108 }}
              wide={{ src: "/images/about/my-filter-wide.webp", width: 420, height: 148 }}
              className="block h-auto max-w-full"
            />
          </div>
        </SplitSection>

        <SplitSection
          id="about-ingredient-search"
          eyebrow="성분으로 찾기"
          title={
            <>
              원하는 성분은 넣고,
              <br />
              피하고 싶은 성분은 빼고
            </>
          }
          description="성분 이름으로 찾거나 자주 피하는 성분을 눌러 조건을 만들면, 조건에 맞는 제품만 모아 보여 드려요."
          mobileSurface={false}
        >
          {/* 카드 아래쪽은 판 밖으로 잘라, 조건이 더 이어지는 화면의 일부처럼 보이게 한다. */}
          <div className="flex h-75 justify-center overflow-hidden rounded-2xl bg-surface px-3 pt-4 min-[600px]:h-100 min-[600px]:px-6 min-[600px]:pt-6 lg:px-10 lg:pt-10">
            <SnippetImage
              alt="탐색 조건 편집 화면. 원하는 성분에 판테놀 계열과 세라마이드, 피하고 싶은 성분에 히알루론산이 담겨 있고 자주 피하는 성분 2개가 골라져 있다."
              narrow={{ src: "/images/about/ingredient-search-narrow.webp", width: 334, height: 412 }}
              wide={{ src: "/images/about/ingredient-search-wide.webp", width: 420, height: 420 }}
              className="block h-auto max-w-full self-start"
            />
          </div>
        </SplitSection>

        <SplitSection
          id="about-full-ingredients"
          eyebrow="전성분"
          title={
            <>
              전성분과 주의 성분을
              <br />
              표기 순서 그대로
            </>
          }
          description="주의 성분이 들었는지 기준별로 먼저 알려 드리고, 성분마다 어떤 역할인지도 확인할 수 있어요."
          mobileSurface
        >
          {/* 모바일은 회색 섹션 위 흰 판, 태블릿은 회색 판 위 흰 카드다. 데스크톱 그림은 흰 카드까지 담고 있다. */}
          <div className="flex justify-center rounded-2xl bg-background px-4 py-5 min-[600px]:bg-surface min-[600px]:p-6 lg:min-h-110 lg:items-center lg:p-10">
            <div className="min-[600px]:rounded-2xl min-[600px]:bg-background min-[600px]:p-5 lg:bg-transparent lg:p-0">
              <SnippetImage
                alt="주의 성분 확인. 향료/알레르기 성분이 들어 있다고 알려 주고, 실리콘 자극원·건조 알코올 등 5종은 찾지 못했다고 보여 준다."
                narrow={{ src: "/images/about/full-ingredients-narrow.webp", width: 326, height: 268 }}
                wide={{ src: "/images/about/full-ingredients-wide.webp", width: 420, height: 308 }}
                className="block h-auto max-w-full"
              />
            </div>
          </div>
        </SplitSection>

        <section
          aria-labelledby="about-features"
          className={`${SECTION_X} bg-background py-10 min-[600px]:bg-surface min-[600px]:py-24`}
        >
          <div className={`${CONTAINER} flex flex-col gap-6 min-[600px]:gap-12`}>
            <h2 id="about-features" data-about-reveal="0" className={SECTION_TITLE}>
              이런 것도 할 수 있어요
            </h2>
            <ul
              className={`grid gap-6 min-[600px]:gap-x-8 min-[600px]:gap-y-10 min-[600px]:text-20 lg:gap-x-16 ${FEATURE_COLUMNS}`}
            >
              {FEATURES.map((feature, index) => (
                <li key={feature.title} data-about-reveal={index % 2} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
                    <Icon name={feature.icon} size={24} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-16 leading-snug font-bold text-text-primary min-[600px]:text-20">
                      {feature.title}
                    </h3>
                    <p className="text-15 leading-normal text-text-secondary min-[600px]:text-16">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="about-assurance"
          className={`${SECTION_X} bg-surface py-10 min-[600px]:bg-background min-[600px]:py-24`}
        >
          <div className={`${CONTAINER} flex flex-col gap-4 min-[600px]:gap-10`}>
            <h2 id="about-assurance" data-about-reveal="0" className={SECTION_TITLE}>
              안심하고 쓰세요
            </h2>
            <ul className="flex flex-col gap-4 min-[600px]:gap-3 lg:grid lg:grid-cols-3 lg:gap-5">
              {ASSURANCES.map((item, index) => (
                <li
                  key={item.title}
                  data-about-reveal={`lg-${index}`}
                  className="flex gap-3 rounded-2xl bg-background p-5 min-[600px]:bg-surface min-[600px]:p-6 lg:flex-col lg:gap-4"
                >
                  {/*
                    아이콘은 카드와 반대 면색의 판에 얹는다(모바일 흰 카드 위 회색 판, 태블릿부터 회색 카드 위 흰 판).
                    데스크톱은 세 칸이라 아이콘을 위로 올려 글이 카드 폭을 다 쓰고, 카드 높이는 가장 긴 칸에 맞춘다.
                  */}
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-text-secondary min-[600px]:bg-background">
                    <Icon name={item.icon} size={24} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-16 leading-snug font-bold text-text-primary min-[600px]:text-18">
                      {item.title}
                    </h3>
                    <p className="text-15 leading-normal text-text-secondary">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="about-faq" className={`${SECTION_X} bg-surface py-10 min-[600px]:py-24`}>
          <div className={`${CONTAINER} flex flex-col gap-4 min-[600px]:gap-6 lg:max-w-160`}>
            <h2 id="about-faq" data-about-reveal="0" className={`${SECTION_TITLE} min-[600px]:text-center`}>
              자주 묻는 질문
            </h2>
            <div data-about-reveal="1">
              <AboutFaq />
            </div>
          </div>
        </section>

        <section aria-labelledby="about-start" className={`${SECTION_X} py-10 min-[600px]:pt-24 min-[600px]:pb-30`}>
          <div className={`${CONTAINER} flex flex-col gap-4 min-[600px]:items-center min-[600px]:gap-10`}>
            <h2 id="about-start" data-about-reveal="0" className={`${SECTION_TITLE} min-[600px]:text-center`}>
              나에게 맞는 방법으로
              <br className="min-[600px]:hidden" /> 시작해 보세요
            </h2>
            <div className="flex w-full flex-col gap-4 min-[600px]:flex-row min-[600px]:gap-5">
              <div
                data-about-reveal="0"
                className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 min-[600px]:min-h-60 min-[600px]:flex-1 min-[600px]:justify-between min-[600px]:p-6 lg:min-h-55 lg:items-end lg:p-8"
              >
                <div className="flex flex-col gap-1 self-stretch">
                  <h3 className="text-18 leading-snug font-bold text-text-primary min-[600px]:text-20 lg:text-24">
                    써 본 화장품이 있다면
                  </h3>
                  <p className="text-15 leading-normal text-text-secondary min-[600px]:text-16">
                    선반에 담고 잘 맞았는지 고르면
                    <br />
                    나와 안 맞는 성분을 찾아 드려요.
                  </p>
                </div>
                <StartLink href="/shelf" variant="primary">
                  내 선반 만들기
                </StartLink>
              </div>
              <div
                data-about-reveal="1"
                className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 min-[600px]:min-h-60 min-[600px]:flex-1 min-[600px]:justify-between min-[600px]:p-6 lg:min-h-55 lg:items-end lg:p-8"
              >
                <div className="flex flex-col gap-1 self-stretch">
                  <h3 className="text-18 leading-snug font-bold text-text-primary min-[600px]:text-20 lg:text-24">
                    처음 둘러본다면
                  </h3>
                  <p className="text-15 leading-normal text-text-secondary min-[600px]:text-16">
                    로그인 없이도 성분으로 화장품을 찾을 수 있어요.
                  </p>
                </div>
                <StartLink href="/search/ingredients" variant="secondary">
                  성분으로 찾아보기
                </StartLink>
              </div>
            </div>
          </div>
        </section>
        <AboutReveal />
      </main>

      <SiteFooter />
    </>
  );
}
