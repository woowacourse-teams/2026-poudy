"use client";

import type { IngredientAnalysisResponse, ProductSuggestionResponse, ShelfProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { useRouter } from "next/navigation";

import { IngredientAnalysisCard } from "./IngredientAnalysisCard";
import { RatingChoice } from "./RatingChoice";
import { ShelfAddRow } from "./ShelfAddRow";
import { ShelfFaq } from "./ShelfFaq";
import { ShelfProductRow } from "./ShelfProductRow";

// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { Icon } from "@/components/ui/icons/Icon";
import type { IconId } from "@/components/ui/icons/sprite";
import { TopBar } from "@/components/ui/TopBar";

/*
 * 소개 페이지의 견본. 실제 선반이 아니라 화면이 어떻게 보이는지 보여 주는 그림이라 누를 수 없게(inert) 둔다.
 */
const SAMPLE_IMAGE = "/images/products/roundlab-1025-toner.png";

type SampleProduct = Pick<ShelfProductResponse["product"], "id" | "brandName" | "name">;

const sampleItem = (product: SampleProduct, rating: ShelfProductResponse["rating"]): ShelfProductResponse => ({
  product: { ...product, badges: [], imageUrl: SAMPLE_IMAGE, sensorySupported: true },
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

const SAMPLE_SUGGESTION: ProductSuggestionResponse = {
  id: 3,
  name: "1025 독도 선크림",
  brandName: "라운드랩",
  badges: [],
  imageUrl: SAMPLE_IMAGE,
  match: { field: "PRODUCT_NAME", text: "1025 독도 선크림", startIndex: 0, endIndexExclusive: 0 },
};

const SAMPLE_ANALYSIS: IngredientAnalysisResponse = {
  badProductCount: 2,
  items: ["리모넨", "향료", "페녹시에탄올"].map((koreanName, index) => ({
    id: index + 1,
    koreanName,
    formulationRoles: [],
    groupCodes: [],
    products: [],
    inFilter: false,
    isNew: false,
  })),
};

function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 bg-brand-soft px-8 pt-8">
      <h1 className="flex flex-col items-center gap-1 text-center">
        <span className="text-section font-bold text-text-primary">안 맞았던 제품만 알려 주면</span>
        <span className="text-hero font-bold text-text-primary">함께 든 성분을 찾아 주는</span>
        <span className="flex items-center gap-1 text-hero font-bold text-brand-text">
          <Icon name="archive" size={24} strokeWidth={2} className="text-brand-strong" />내 선반
        </span>
      </h1>
      <div inert className="flex w-full flex-col rounded-t-4xl bg-background px-3 pt-3">
        <p className="pt-2 pb-1 text-caption font-semibold text-text-secondary">사용 중 · 3</p>
        {SAMPLE_SHELF.map((item) => (
          <ShelfProductRow key={item.product.id} item={item} />
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { lead: "제품을 올리고", title: "잘 맞았는지만 골라요", tone: "success", icon: "thumb-up" },
  { lead: "안 맞은 제품이 2개 이상이면", title: "함께 든 성분을 찾아 드려요", tone: "brand", icon: "search" },
  { lead: "고른 성분을 검색에서 제외하면", title: "검색할 때마다 빼고 보여 드려요", tone: "info", icon: "filter" },
] as const satisfies readonly {
  readonly lead: string;
  readonly title: string;
  readonly tone: string;
  readonly icon: IconId;
}[];

function Features() {
  return (
    <section className="flex flex-col items-center gap-5 px-gutter py-10">
      <h2 className="text-center text-hero font-bold text-text-primary">
        <span className="text-brand-text">선반</span>으로 달라지는
        <br />
        화장품 고르기
      </h2>
      <ul className="flex w-full flex-col gap-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex items-center gap-3 rounded-xl bg-surface p-5">
            <p className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-title text-text-secondary">{feature.lead}</span>
              <span className="text-bar font-bold text-text-primary">{feature.title}</span>
            </p>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                feature.tone === "success" && "bg-success-soft text-success-text",
                feature.tone === "brand" && "bg-brand-soft text-brand-text",
                feature.tone === "info" && "bg-info-soft text-info-text",
              )}
            >
              <Icon name={feature.icon} size={24} strokeWidth={2} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Privacy() {
  return (
    <section className="flex flex-col items-center gap-5 px-gutter py-10">
      <p className="rounded-full bg-action px-3 py-1 text-body-sm font-semibold text-action-text">나만 보는 선반</p>
      <h2 className="text-center text-hero font-bold text-text-primary">
        올린 제품과 평가는
        <br />
        나만 볼 수 있어요
      </h2>
      <div className="flex w-full flex-col items-center gap-3 rounded-4xl bg-brand-soft px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-background text-brand-strong"
        >
          <Icon name="lock" size={28} strokeWidth={2} />
        </span>
        <ul className="flex flex-col items-center gap-1 text-center text-body text-text-secondary">
          <li>· 다른 사람에게는 보이지 않아요</li>
          <li>· 평가는 언제든 고치거나 지울 수 있어요</li>
          <li>· 선반에서 빼면 남긴 평가도 함께 지워져요</li>
        </ul>
      </div>
    </section>
  );
}

type StepProps = {
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
};

function Step({ order, title, description, children }: StepProps) {
  return (
    <li className="flex flex-col gap-3">
      <div className="flex gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-xs bg-surface text-body-sm leading-none font-bold text-text-primary">
          {order}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-bar font-bold text-text-primary">{title}</h3>
          <p className="text-body text-text-secondary">{description}</p>
        </div>
      </div>
      <div inert>{children}</div>
    </li>
  );
}

function HowTo() {
  return (
    <section className="flex flex-col gap-6 px-gutter py-10">
      <h2 className="text-center text-hero font-bold text-text-primary">사용 방법</h2>
      <ol className="flex flex-col gap-6">
        <Step order={1} title="선반에 제품을 추가해요" description="지금 쓰는 제품도, 예전에 쓴 제품도 괜찮아요.">
          <div className="rounded-4xl bg-surface px-5 py-6">
            {/* eslint-disable-next-line shadcn/no-raw-colors -- design-exception: 린트가 그림자 토큰 shadow-raised 를 색 이름으로 잘못 읽는다 · 만료 2026-11-30 */}
            <div className="rounded-xl bg-background px-4 py-2 shadow-raised">
              <ShelfAddRow product={SAMPLE_SUGGESTION} keyword="" />
            </div>
          </div>
        </Step>
        <Step
          order={2}
          title="잘 맞았는지 골라요"
          description="촉촉함·번들거림도 남기면 유수분 레벨을 다듬는 데 쓰여요."
        >
          <div className="rounded-4xl bg-surface px-5 py-6">
            {/* eslint-disable-next-line shadcn/no-raw-colors -- design-exception: 린트가 그림자 토큰 shadow-raised 를 색 이름으로 잘못 읽는다 · 만료 2026-11-30 */}
            <div className="rounded-xl bg-background p-4 shadow-raised">
              <RatingChoice value="BAD" onValueChange={() => undefined} showLabel={false} />
            </div>
          </div>
        </Step>
        <Step
          order={3}
          title="안 맞을 수 있는 성분을 확인해요"
          description="안 맞은 제품들에 함께 든 성분을 보여 드려요. 검색에서 제외하면 검색할 때마다 그 성분이 든 제품을 빼고 보여 드려요."
        >
          <IngredientAnalysisCard analysis={SAMPLE_ANALYSIS} filterCount={0} askSkinType={false} />
        </Step>
      </ol>
    </section>
  );
}

/** 선반 소개(/shelf/guide, S54d). 누구나 볼 수 있고, 맨 아래에서 제품 추가로 이어진다. */
export function ShelfGuide() {
  const router = useRouter();

  return (
    <>
      <TopBar title="내 선반 소개" variant="sub" titleAs="p" />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Features />
        <Privacy />
        <HowTo />
        <ShelfFaq />
      </main>
      {/* TODO(#729): 하단 행동 영역(BottomActionBar)이 들어오면 그 안에 둔다. 지금은 화면 끝에 붙인다. */}
      <div className="sticky bottom-0 border-t border-border bg-background px-gutter pt-3 pb-safe">
        <Button size="lg" className="w-full" onClick={() => router.push("/shelf/add")}>
          제품 추가하러 가기
        </Button>
      </div>
    </>
  );
}
