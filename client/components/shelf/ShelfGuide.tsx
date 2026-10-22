"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useRouter } from "next/navigation";

import { ShelfFaq } from "./ShelfFaq";
import { ShelfIllustration, type ShelfIllustrationName } from "./ShelfIllustration";
import { ShelfProductRow } from "./ShelfProductRow";

import { SubTopBar } from "@/components/navigation/SubTopBar";

/*
 * 소개 페이지의 견본. 실제 선반이 아니라 화면이 어떻게 보이는지 보여 주는 그림이라 누를 수 없게(inert) 둔다.
 */
const SAMPLE_IMAGE = "/images/products/roundlab-1025-toner.png";

type SampleProduct = Pick<ShelfProductResponse["product"], "id" | "brandName" | "name">;

const sampleItem = (product: SampleProduct, rating: ShelfProductResponse["rating"]): ShelfProductResponse => ({
  product: { ...product, marks: [], imageUrl: SAMPLE_IMAGE, sensorySupported: true },
  usageStatus: "IN_USE",
  rating,
  possiblyUnsuitable: false,
  registeredAt: "2026-10-10T16:30:00+09:00",
});

const SAMPLE_SHELF: readonly ShelfProductResponse[] = [
  sampleItem(
    { id: 1, brandName: "닥터지", name: "블랙 스네일 토너" },
    { preference: "GOOD", moistureLevel: 2.5, oilLevel: 1 },
  ),
  sampleItem(
    { id: 2, brandName: "라운드랩", name: "1025 독도 크림" },
    { preference: "BAD", moistureLevel: 1.5, oilLevel: 2 },
  ),
];

/** 히어로. 소개의 한 줄 요약과 실제 선반 화면의 미리보기(S54d). */
function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 bg-brand-soft px-8 pt-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="flex flex-col items-center gap-1">
          <span className="text-section leading-snug font-bold text-text-primary">나만의 기준이 되는 곳, 내 선반</span>
          <span className="text-hero leading-tight font-bold text-text-primary">써 본 화장품이 쌓일수록</span>
          <span className="text-hero leading-tight font-bold text-brand-text">나에게 맞는 화장품이 보여요</span>
        </h1>
        <p className="text-body leading-snug text-text-secondary">
          잘 맞았던 제품도, 아쉬웠던 제품도
          <br />
          모두 다음 선택에 도움이 돼요.
        </p>
      </div>
      <div inert className="flex w-full flex-col rounded-t-4xl bg-background px-3 pt-3">
        <p className="pt-5 pb-1 text-caption leading-snug font-semibold text-text-secondary">사용 중 · 3</p>
        {SAMPLE_SHELF.map((item) => (
          <ShelfProductRow key={item.product.id} item={item} />
        ))}
      </div>
    </section>
  );
}

type InfoCardProps = {
  readonly title: string;
  readonly description: string;
  readonly illustration: ShelfIllustrationName;
};

/** 회색 카드 한 장. 굵은 제목과 설명을 왼쪽에, 2D 그림(68)을 오른쪽에 둔다(기능 카드 · 안심 안내). */
function InfoCard({ title, description, illustration }: InfoCardProps) {
  return (
    /*
      글자를 크게 키워 글 칸이 10em 보다 좁아지면 그림을 글 아래 오른쪽으로 내려, 제목이 낱말마다 줄을 넘기지 않게 한다.
      카드 안쪽 폭(@container)이 '그림 68 + 간격 12 + 글 10em'보다 좁으면 글이 한 줄을 다 차지한다.
    */
    <div className="@container rounded-xl bg-surface p-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="flex min-w-0 grow basis-full flex-col gap-0.5 break-keep @min-[calc(80px_+_10em)]:basis-0">
          <span className="text-bar leading-snug font-bold whitespace-pre-line text-text-primary">{title}</span>
          <span className="text-body leading-snug whitespace-pre-line text-text-secondary">{description}</span>
        </p>
        <ShelfIllustration name={illustration} size={68} />
      </div>
    </div>
  );
}

const FEATURES: readonly InfoCardProps[] = [
  {
    title: "내가 써 본 화장품을 기억해요",
    description: "좋았던 제품도 아쉬웠던 제품도\n한곳에 모아 두세요.",
    illustration: "record",
  },
  {
    title: "내 피부에 맞는\n성분의 힌트를 찾아요",
    description: "평가가 쌓이면 제품들의 성분을\n비교해 공통점을 살펴볼 수 있어요.",
    illustration: "ingredientHint",
  },
  {
    title: "다음 화장품은 내 기준으로 골라요",
    description: "내 평가를 반영한 성분 필터로\n제품을 더 쉽게 찾아보세요.",
    illustration: "myPick",
  },
];

/** 소개의 한 단락. 가운데 큰 제목 아래에 내용을 둔다. */
function GuideSection({ title, children }: { readonly title: React.ReactNode; readonly children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 px-gutter py-10">
      <h2 className="text-center text-hero leading-tight font-bold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Features() {
  return (
    <GuideSection
      title={
        <>
          <span className="text-brand-text">내가 써 본 화장품</span>으로
          <br />더 잘 고르는 방법
        </>
      }
    >
      <ul className="flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <InfoCard {...feature} />
          </li>
        ))}
      </ul>
    </GuideSection>
  );
}

function Privacy() {
  return (
    <GuideSection
      title={
        <>
          나만 볼 수 있는
          <br />
          선반이에요
        </>
      }
    >
      <InfoCard
        title={"등록한 제품과 평가는\n다른 사람에게 공개되지 않아요"}
        description={"평가는 언제든 고치거나 지울 수 있고,\n선반에서 빼면 남긴 평가도 함께 지워져요."}
        illustration="privacy"
      />
    </GuideSection>
  );
}

const STEPS = [
  {
    title: "선반에 제품을 추가해요",
    description: "지금 쓰는 제품도,\n예전에 쓴 제품도 괜찮아요.",
    illustration: "howToAdd",
  },
  {
    title: "잘 맞았는지 골라요",
    description: "촉촉함·번들거림도 남기면\n유수분 레벨을 다듬는 데 쓰여요.",
    illustration: "howToRate",
  },
  {
    title: "안 맞을 수 있는 성분을 확인해요",
    description:
      "안 맞은 제품들에 함께 든 성분을\n보여 드려요. 검색에서 제외하면\n그 성분이 든 제품은 빼고 보여 드려요.",
    illustration: "howToCheck",
  },
] as const satisfies readonly {
  readonly title: string;
  readonly description: string;
  readonly illustration: ShelfIllustrationName;
}[];

/** 단계 사이를 잇는 점 셋. 그림 칸(100)의 가운데 아래에 둔다. 장식이다. */
function StepDots() {
  return (
    <span aria-hidden="true" className="flex h-8 w-25 flex-col items-center justify-center gap-1.25">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="size-0.75 rounded-full bg-border-strong" />
      ))}
    </span>
  );
}

/** 사용 방법. 단계마다 왼쪽에 그림 칸, 오른쪽에 '번호. 제목'과 설명을 둔다(S54d). */
function HowTo() {
  return (
    <section className="flex flex-col gap-6 px-gutter py-10">
      <h2 className="text-center text-hero leading-tight font-bold text-text-primary">사용 방법</h2>
      <ol className="flex flex-col">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col">
            {index > 0 ? <StepDots /> : null}
            {/*
              글자를 크게 키워 글 칸이 10em 보다 좁아지면 글을 그림 칸 아래로 내려, 설명의 낱말이 갈라지지 않게 한다.
              단계 폭(@container)이 '그림 칸 100 + 간격 16 + 글 10em'보다 좁으면 글이 한 줄을 다 차지한다.
            */}
            <div className="@container">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex size-25 shrink-0 items-center justify-center rounded-xl bg-surface">
                  <ShelfIllustration name={step.illustration} size={76} />
                </span>
                <p className="flex min-w-0 grow basis-full flex-col gap-0.5 break-keep @min-[calc(116px_+_10em)]:basis-0">
                  <span className="text-bar leading-snug font-bold text-text-primary">{`${index + 1}. ${step.title}`}</span>
                  <span className="text-body leading-normal whitespace-pre-line text-text-secondary">
                    {step.description}
                  </span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 선반 소개(/shelf/guide, S54d). 누구나 볼 수 있고, 맨 아래에서 제품 추가로 이어진다. */
export function ShelfGuide() {
  const router = useRouter();

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      {/* 본문 첫머리(Hero)에 진짜 제목이 있어 바 제목은 p 로 내린다. */}
      <SubTopBar title="선반 소개" titleAs="p" />
      <ScreenBody>
        <main className="flex flex-1 flex-col">
          <Hero />
          <Features />
          <Privacy />
          <HowTo />
          <ShelfFaq />
        </main>
      </ScreenBody>
      {/* data-toast-offset 은 토스트가 이 영역 위에 뜨도록 globals.css 가 높이를 고르는 데 쓴다. */}
      <div data-toast-offset="action-bar" className="contents">
        <BottomActionBar
          position="screen-end"
          action={{ label: "선반에 제품 담기", onClick: () => router.push("/shelf/add") }}
        />
      </div>
    </Screen>
  );
}
