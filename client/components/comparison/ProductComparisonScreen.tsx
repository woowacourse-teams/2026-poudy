"use client";

import type { ProductComparisonItemResponse, ProductComparisonPartResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { Screen } from "@poudy/design-system/screen";
import { Select } from "@poudy/design-system/select";
import { TopBar } from "@poudy/design-system/top-bar";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode, type Ref } from "react";

import { COMPARISON_ADD_PATH } from "./paths";

import { EffectTag } from "@/components/ingredient/EffectTag";
import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { ProductImage } from "@/components/ui/ProductImage";
import { slashBreakable } from "@/components/ui/slash-breakable";
import { formatPrice, formatVolume } from "@/lib/domain/format";
import {
  attributeMarks,
  COMPARISON_MAX,
  COMPARISON_RESULT_PATH,
  comparisonHref,
  comparisonPartName,
  containedCautionNames,
  hasMyFilterVerdict,
  representativeVariant,
  type ComparisonSelection,
} from "@/lib/domain/product-comparison";
import { levelLabel } from "@/lib/domain/product-display";
import { useComparisonTray } from "@/lib/hooks/useComparisonTray";
import { clearComparisonTray, removeComparisonItem, selectComparisonPart } from "@/lib/storage/comparison-tray";

type Product = ProductComparisonItemResponse;
type Part = ProductComparisonPartResponse;

/** 하위 상단 내비의 높이. 머리가 이 선 아래로 지나가면 줄어든 머리를 붙인다. */
const TOP_BAR_HEIGHT = 44;

/*
 * 세 칸의 틀. 칸 하나에 제품명의 긴 낱말이 들어가는 폭 6em 을 지키고, 그만큼 들어가지 않으면 칸 수를 줄인다.
 * 글자를 키워도 낱말이 칸을 넘거나 갈라지지 않는다. 틀은 화면 폭 전체이고 칸은 좌우 여백과 칸 사이를 뺀 나머지를 나누므로,
 * 기준을 글자를 따라 커지는 몫(em)과 고정된 몫으로 나눈다. 3열은 여백 32 + 사이 16, 2열은 여백 32 + 사이 8 이다.
 * em 은 틀(@container)의 글자 크기를 따른다.
 */
const COLUMNS = "grid grid-cols-1 gap-2 @min-[calc(12em_+_40px)]:grid-cols-2 @min-[calc(18em_+_48px)]:grid-cols-3";
/** 칸이 줄어 위아래로 쌓이면 어느 제품의 값인지 줄 위치로 알 수 없어 칸마다 제품명을 보인다. 넉넉하면 낭독에만 읽힌다. */
const CELL_LABEL =
  "sr-only text-caption leading-snug font-medium text-text-secondary @max-[calc(18em_+_48px)]:not-sr-only";
/** 세 칸이 나란할 때만 있는 자리. 두 개만 비교할 때 세 번째 칸을 비워 둔다. */
const BLANK_CELL = "@max-[calc(18em_+_48px)]:hidden";

/** 응답을 기다리는 동안 먼저 보여 줄 변화. 뺀 제품은 바로 사라지고, 고른 구성품 이름은 바로 바뀐다. */
type PendingChange = {
  readonly removed: readonly number[];
  readonly parts: Readonly<Record<number, number>>;
};

const NO_CHANGE: PendingChange = { removed: [], parts: {} };

const merge = (current: PendingChange, next: Partial<PendingChange>): PendingChange => ({
  removed: [...current.removed, ...(next.removed ?? [])],
  parts: { ...current.parts, ...next.parts },
});

/** 주소에 적을 제품과 구성품. 구성품이 하나뿐인 제품은 고를 것이 없어 적지 않는다. */
const selectionOf = (product: Product, parts: PendingChange["parts"]): ComparisonSelection => {
  const partId = parts[product.id] ?? product.selectedPart?.id;
  return product.productParts.length > 1 && partId !== undefined
    ? { productId: product.id, partId }
    : { productId: product.id };
};

/**
 * 제품 비교(시안 v2 V3 · V3-s · V3-a). 주소의 제품을 서버가 받아 요청 순서대로 세 칸에 나란히 놓는다.
 * 주소가 비교의 기준이라 다시 열어도 같은 비교가 나온다. 비교함(기기 저장)은 제품을 빼거나 구성품을 고를 때 함께 맞춘다.
 *
 * - 머리: 사진 오른쪽 위 ×로 그 칸을 뺀다. 구성품이 여럿이면 칸 안에서 고른다. 빈 칸은 '제품 담기'로 제품 검색을 연다.
 * - 스크롤: 머리가 상단 내비 아래로 지나가면 사진 없는 줄어든 머리를 내비 밑에 붙인다. 높이를 줄이면 그만큼 본문이 튀므로
 *   제 자리의 머리는 그대로 지나가게 두고 줄어든 머리를 따로 얹는다.
 * - 하나만 남으면 비교할 수 없어 남은 제품의 상세로 옮긴다. 뒤로가기로 이 화면에 돌아오지 않게 기록을 바꾼다.
 */
export function ProductComparisonScreen({
  products,
  missingProduct = false,
}: {
  readonly products: readonly Product[];
  /** 주소의 제품 중 없어진 것이 있다. */
  readonly missingProduct?: boolean;
}) {
  const router = useRouter();
  const back = useSubScreenBack();
  const { items } = useComparisonTray();
  const [updating, startUpdate] = useTransition();
  const [change, addChange] = useOptimistic(NO_CHANGE, merge);
  const [partSheetProductId, setPartSheetProductId] = useState<number>();
  const [shownPartSheetProductId, setShownPartSheetProductId] = useState<number>();
  const mainRef = useRef<HTMLElement>(null);

  const visible = products.filter((product) => !change.removed.includes(product.id));
  const emptySlots = COMPARISON_MAX - visible.length;
  const sheetProduct = visible.find((product) => product.id === shownPartSheetProductId);

  // 제품 없이 들어왔는데 비교함에 담은 것이 있으면 그 제품으로 연다.
  const shouldOpenTray = products.length === 0 && !missingProduct && items.length > 0;
  useEffect(() => {
    if (shouldOpenTray) router.replace(comparisonHref(items));
  }, [shouldOpenTray, items, router]);

  const remove = (productId: number) => {
    const rest = visible.filter((product) => product.id !== productId);
    removeComparisonItem(productId);
    // 누른 버튼이 사라지므로 포커스를 본문으로 옮긴다.
    mainRef.current?.focus();
    startUpdate(() => {
      addChange({ removed: [productId] });
      router.replace(
        rest.length === 1
          ? `/products/${rest[0].id}`
          : comparisonHref(rest.map((product) => selectionOf(product, change.parts))),
        { scroll: false },
      );
    });
  };

  const selectPart = (productId: number, partId: number) => {
    setPartSheetProductId(undefined);
    selectComparisonPart(productId, partId);
    const parts = { ...change.parts, [productId]: partId };
    startUpdate(() => {
      addChange({ parts: { [productId]: partId } });
      router.replace(comparisonHref(visible.map((product) => selectionOf(product, parts))), { scroll: false });
    });
  };

  const openPartSheet = (productId: number) => {
    setShownPartSheetProductId(productId);
    setPartSheetProductId(productId);
  };

  const clearAndStartOver = () => {
    clearComparisonTray();
    router.replace(COMPARISON_RESULT_PATH);
  };

  const body = () => {
    if (missingProduct)
      return (
        <ErrorState
          variant="screen"
          className="flex-1"
          title="비교함에 없어진 제품이 있어요"
          description="비교함을 비우고 다시 담아 주세요."
          action={
            <Button variant="secondary" onClick={clearAndStartOver}>
              비교함 비우기
            </Button>
          }
        />
      );
    if (products.length === 0)
      return (
        <EmptyState
          className="flex-1"
          icon={<Icon name="scale" size={28} />}
          title="비교함이 비어 있어요"
          description={"제품 사진의 '＋ 비교함'을 누르면\n최대 3개까지 나란히 비교할 수 있어요"}
          action={
            <Button variant="secondary" onClick={() => router.push(COMPARISON_ADD_PATH)}>
              제품 둘러보기
            </Button>
          }
        />
      );

    return (
      <>
        <ComparisonHeads
          products={visible}
          parts={change.parts}
          emptySlots={emptySlots}
          onRemove={remove}
          onOpenPart={openPartSheet}
          partSheetProductId={partSheetProductId}
        />
        {/* 구성품을 바꾸는 동안 아래 값은 앞 구성품의 것이라 흐리게 둔다. */}
        <div className={cn("transition-opacity duration-(--duration-fast)", updating && "opacity-50")}>
          <Rows products={visible} emptySlots={emptySlots} />
        </div>
      </>
    );
  };

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <TopBar variant="sub" title={<ComparisonTitle products={visible} />} back={back} />
      <main
        ref={mainRef}
        tabIndex={-1}
        aria-busy={updating}
        className="@container flex flex-1 flex-col text-14 outline-none"
      >
        {body()}
      </main>

      <BottomSheet open={partSheetProductId !== undefined} onClose={() => setPartSheetProductId(undefined)}>
        <BottomSheetHeader title="구성 고르기" onClose={() => setPartSheetProductId(undefined)} />
        {sheetProduct ? (
          <BottomSheetBody>
            <RadioGroup
              aria-label={`${sheetProduct.name} 구성`}
              variant="list"
              value={String(partIdOf(sheetProduct, change.parts))}
              onValueChange={(value) => selectPart(sheetProduct.id, Number(value))}
            >
              {sheetProduct.productParts.map((part, index) => (
                <RadioGroupItem key={part.id} value={String(part.id)}>
                  {comparisonPartName(part.name, index)}
                </RadioGroupItem>
              ))}
            </RadioGroup>
            <div aria-hidden="true" className="pb-safe" />
          </BottomSheetBody>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

/** 지금 고른 구성품. 방금 고른 값을 응답을 기다리지 않고 바로 보인다. */
const partIdOf = (product: Product, parts: PendingChange["parts"]): number | undefined =>
  parts[product.id] ?? product.selectedPart?.id;

const partNameOf = (product: Product, parts: PendingChange["parts"]): string => {
  const id = partIdOf(product, parts);
  const index = product.productParts.findIndex((part) => part.id === id);
  return comparisonPartName(product.productParts[index]?.name ?? null, Math.max(index, 0));
};

/**
 * 제 자리의 머리가 상단 내비 아래로 다 지나갔는지. 머리의 일부라도 화면에 보이는 동안에는 지나간 것으로 보지 않는다.
 * 머리 전체를 지켜보므로 빠르게 스크롤해도 맨 위로 돌아온 것을 놓치지 않는다.
 */
const useHeadPassed = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const head = ref.current;
    if (!head || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPassed(!entry.isIntersecting), {
      rootMargin: `-${TOP_BAR_HEIGHT}px 0px 0px 0px`,
    });
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  return { ref, passed };
};

/** 상단 제목. 제품 이름을 'vs.'로 잇는다. 자리가 모자라면 이름마다 말줄임해 비교하는 제품이 모두 보이게 한다. */
function ComparisonTitle({ products }: { readonly products: readonly Product[] }) {
  if (products.length < 2) return "제품 비교";

  return (
    <span className="flex min-w-0 items-center gap-1">
      {products.map((product, index) => (
        <Fragment key={product.id}>
          {index > 0 ? <span className="shrink-0 font-normal text-text-secondary">vs.</span> : null}
          <span className="min-w-0 truncate">{product.name}</span>
        </Fragment>
      ))}
    </span>
  );
}

/** 제 자리의 머리와, 그 머리가 지나간 뒤에 내비 밑에 붙는 줄어든 머리. */
function ComparisonHeads(props: Omit<Parameters<typeof Head>[0], "headRef">) {
  const { ref, passed } = useHeadPassed<HTMLDivElement>();

  return (
    <>
      <CompactHead
        products={props.products}
        parts={props.parts}
        emptySlots={props.emptySlots}
        shown={passed}
        onOpenPart={props.onOpenPart}
      />
      <Head {...props} headRef={ref} />
    </>
  );
}

function Head({
  products,
  parts,
  emptySlots,
  onRemove,
  onOpenPart,
  partSheetProductId,
  headRef,
}: {
  readonly products: readonly Product[];
  readonly parts: PendingChange["parts"];
  readonly emptySlots: number;
  readonly headRef: Ref<HTMLDivElement>;
  readonly onRemove: (productId: number) => void;
  readonly onOpenPart: (productId: number) => void;
  readonly partSheetProductId: number | undefined;
}) {
  return (
    <div ref={headRef} className="border-b border-border px-gutter pt-2 pb-3">
      <ul className={COLUMNS}>
        {products.map((product) => (
          <li key={product.id} className="flex min-w-0 flex-col gap-1">
            <div className="relative flex h-26 items-center justify-center rounded-lg bg-surface">
              <ProductImage
                src={product.imageUrl}
                alt={`${product.brand.name} ${product.name} 제품 이미지`}
                size={104}
                sizes="84px"
                className="size-4/5"
              />
              <IconButton
                variant="thumbnail-remove"
                label={`${product.name} 빼기`}
                icon={<Icon name="x" size={14} bold />}
                className="absolute top-0 right-0 items-start justify-end"
                onClick={() => onRemove(product.id)}
              />
            </div>
            <p className="text-caption leading-snug font-medium text-text-secondary">{product.brand.name}</p>
            <p className="text-body-sm leading-snug font-bold text-text-primary">{product.name}</p>
            {product.productParts.length > 1 ? (
              <Select
                aria-label={`${product.name} 구성`}
                placeholder="구성 고르기"
                value={partNameOf(product, parts)}
                size="sm"
                reserveMessage={false}
                expanded={partSheetProductId === product.id}
                onOpen={() => onOpenPart(product.id)}
              />
            ) : null}
          </li>
        ))}
        {Array.from({ length: emptySlots }, (_, index) => (
          <li key={index} className="flex min-w-0 flex-col">
            <AddSlot />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 빈 칸. 사진 칸과 같은 크기로 두고, 누르면 제품 검색을 연다. */
function AddSlot() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={COMPARISON_ADD_PATH}
      {...pressableProps}
      className="pressable press-scale fb-surface flex h-26 flex-col items-center justify-center gap-1 rounded-lg border border-border-strong bg-background text-caption leading-snug font-semibold text-text-secondary"
    >
      <Icon name="plus" size={20} scalable />
      제품 담기
    </Link>
  );
}

/**
 * 줄어든 머리(V3-s). 자리를 차지하지 않고 상단 내비 밑에 붙어 머리가 지나간 뒤에만 보인다. 사진과 ×는 없다.
 * 칸이 쌓일 만큼 글자가 크면 머리가 화면을 다 덮으므로 두지 않는다. 그때는 칸마다 제품명이 보인다.
 */
function CompactHead({
  products,
  parts,
  emptySlots,
  shown,
  onOpenPart,
}: {
  readonly products: readonly Product[];
  readonly parts: PendingChange["parts"];
  readonly emptySlots: number;
  readonly shown: boolean;
  readonly onOpenPart: (productId: number) => void;
}) {
  return (
    <div className="sticky top-11 z-(--z-sticky) h-0 @max-[calc(18em_+_48px)]:hidden">
      <div
        inert={!shown}
        className={cn(
          "border-b border-border bg-background px-gutter py-2 transition duration-(--duration-fast) ease-(--ease-out) motion-reduce:transition-none",
          !shown && "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <ul className={COLUMNS}>
          {products.map((product) => (
            <li key={product.id} className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-caption leading-snug font-semibold text-text-primary">{product.name}</p>
              {product.productParts.length > 1 ? (
                <CompactPartButton
                  productName={product.name}
                  value={partNameOf(product, parts)}
                  onOpen={() => onOpenPart(product.id)}
                />
              ) : (
                <p className="truncate text-caption leading-snug text-text-secondary">{product.brand.name}</p>
              )}
            </li>
          ))}
          {Array.from({ length: emptySlots }, (_, index) => (
            <li key={index} aria-hidden="true" />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 줄어든 머리의 구성 고르기. 보이는 글자는 작지만 누르는 영역은 44 를 지킨다. */
function CompactPartButton({
  productName,
  value,
  onOpen,
}: {
  readonly productName: string;
  readonly value: string;
  readonly onOpen: () => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label={`${productName} 구성, ${value}`}
      aria-haspopup="dialog"
      {...pressableProps}
      onClick={onOpen}
      className="pressable flex w-fit max-w-full min-w-0 items-center gap-0.5 text-left text-caption leading-snug font-medium text-text-secondary transition-colors duration-(--duration-fast) after:absolute after:-inset-y-3.5 after:inset-x-0 data-hovered:text-text-primary data-pressed:text-text-primary"
    >
      <span className="min-w-0 truncate">{value}</span>
      <Icon name="chevron-down" size={12} scalable className="shrink-0" />
    </button>
  );
}

function Rows({ products, emptySlots }: { readonly products: readonly Product[]; readonly emptySlots: number }) {
  const parts = products.map((product) => product.selectedPart);
  const hasLevels = parts.some((part) => part?.moistureLevel != null || part?.oilLevel != null);
  const hasAttributes = products.some((product) => attributeMarks(product.marks).length > 0);

  return (
    <div className="flex flex-col px-gutter pb-20">
      <Row title="가격 · 용량 (대표 용량)" products={products} emptySlots={emptySlots} cell={PriceCell} />
      {hasLevels ? <Row title="유수분" products={products} emptySlots={emptySlots} cell={LevelCell} /> : null}
      <Row title="쓰임새" products={products} emptySlots={emptySlots} cell={EffectCell} />
      <Row title="주의 성분" products={products} emptySlots={emptySlots} cell={CautionCell} />
      {hasMyFilterVerdict(parts) ? (
        <Row title="나만의 필터" products={products} emptySlots={emptySlots} cell={MyFilterCell} />
      ) : null}
      {hasAttributes ? (
        <Row title="제품 속성" products={products} emptySlots={emptySlots} cell={AttributeCell} />
      ) : null}
      <p className="pt-3 text-caption leading-snug break-keep text-text-secondary">
        제품 속성(자외선 차단 유형, 세정 용이성, <span className="whitespace-nowrap">내수성)은</span> 비교하는 제품 중
        하나라도 값이 있을 때만 보여요.
      </p>
    </div>
  );
}

function Row({
  title,
  products,
  emptySlots,
  cell,
}: {
  readonly title: string;
  readonly products: readonly Product[];
  readonly emptySlots: number;
  readonly cell: (product: Product) => ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-b border-border py-3">
      <h2 className="text-caption leading-snug font-semibold text-text-secondary">{title}</h2>
      <div className={COLUMNS}>
        {products.map((product) => (
          <div key={product.id} className="flex min-w-0 flex-col items-start gap-0.5">
            <p className={CELL_LABEL}>{product.name}</p>
            {cell(product)}
          </div>
        ))}
        {Array.from({ length: emptySlots }, (_, index) => (
          <div key={index} aria-hidden="true" className={BLANK_CELL} />
        ))}
      </div>
    </section>
  );
}

/** 값이 없는 칸. 낭독에는 줄표 대신 뜻을 읽힌다. */
function NoValue() {
  return (
    <p className="text-body-sm leading-snug text-text-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">정보 없음</span>
    </p>
  );
}

function PriceCell(product: Product) {
  const variant = representativeVariant(product.variants);
  if (!variant) return <NoValue />;

  return (
    <>
      <p className="text-body leading-snug font-bold whitespace-nowrap text-text-primary tabular-nums">
        {formatPrice(variant.price)}
      </p>
      <p className="text-caption leading-snug text-text-secondary tabular-nums">{formatVolume(variant)}</p>
    </>
  );
}

/** 수분감 · 유분감. 단계 이름은 제품 상세와 같다. 값이 없는 것과 0단계('없음')는 다르다. */
function LevelCell({ selectedPart: part }: Product) {
  if (part?.moistureLevel == null && part?.oilLevel == null) return <NoValue />;

  return (
    <>
      {part.moistureLevel == null ? null : (
        <p className="text-body-sm leading-snug text-text-body">수분감 {levelLabel(part.moistureLevel)}</p>
      )}
      {part.oilLevel == null ? null : (
        <p className="text-body-sm leading-snug text-text-body">유분감 {levelLabel(part.oilLevel)}</p>
      )}
    </>
  );
}

function EffectCell({ selectedPart: part }: Product) {
  if (!part || part.skinEffects.length === 0) return <NoValue />;

  return part.skinEffects.map((effect) => <EffectTag key={effect.code} effect={effect} />);
}

/**
 * 상태 칩. 성분군 이름처럼 띄어쓰기가 있는 글자는 낱말 단위로 줄을 바꾼다.
 * 성분명은 띄어쓰기 없이 길어 칸을 넘으면 갈라지므로 truncate 로 말줄임하고, 전체 이름은 title 로 남긴다.
 */
function StatusChip({
  tone,
  truncate = false,
  title,
  children,
}: {
  readonly tone: "success" | "danger";
  readonly truncate?: boolean;
  readonly title?: string;
  readonly children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "max-w-full rounded-sm px-2 py-0.5 text-caption leading-snug font-semibold",
        truncate ? "truncate" : "break-keep",
        tone === "success" ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-action",
      )}
    >
      {children}
    </span>
  );
}

function CautionCell({ selectedPart: part }: Product) {
  if (!part) return <NoValue />;
  const names = containedCautionNames(part);
  if (names.length === 0) return <StatusChip tone="success">없음</StatusChip>;

  return names.map((name) => (
    <StatusChip key={name} tone="danger">
      {slashBreakable(name)}
    </StatusChip>
  ));
}

function MyFilterCell({ selectedPart: part }: { readonly selectedPart: Part | null }) {
  if (!part) return <NoValue />;
  if (part.myFilterStatus === "NO_MATCH") return <StatusChip tone="success">없음</StatusChip>;
  if (part.myFilterStatus !== "MATCH") return <NoValue />;

  return part.myFilterIngredients.map((ingredient) => (
    <StatusChip key={ingredient.id} tone="danger" truncate title={ingredient.koreanName}>
      {ingredient.koreanName}
    </StatusChip>
  ));
}

function AttributeCell({ marks }: Product) {
  const attributes = attributeMarks(marks);
  if (attributes.length === 0) return <NoValue />;

  return attributes.map((mark) => (
    <p key={mark.code} className="text-body-sm leading-snug font-semibold text-text-primary">
      {mark.name}
    </p>
  ));
}
