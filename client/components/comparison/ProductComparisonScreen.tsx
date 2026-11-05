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
import { BOUNDARY_MARKER, Screen, usePassedTop } from "@poudy/design-system/screen";
import { Select } from "@poudy/design-system/select";
import { Skeleton } from "@poudy/design-system/skeleton";
import { TopBar } from "@poudy/design-system/top-bar";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { COMPARISON_ADD_PATH } from "./paths";

import { EffectTag } from "@/components/ingredient/EffectTag";
import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { ProductImage } from "@/components/ui/ProductImage";
import { slashBreakable } from "@/components/ui/slash-breakable";
import { ApiError } from "@/lib/api/client";
import { fetchProductComparison } from "@/lib/api/products";
import { formatPrice, formatVolume } from "@/lib/domain/format";
import { RETRY_LATER } from "@/lib/domain/messages";
import {
  attributeMarks,
  comparisonPartName,
  containedCautionNames,
  hasMyFilterVerdict,
  representativeVariant,
} from "@/lib/domain/product-comparison";
import { levelLabel } from "@/lib/domain/product-display";
import { useComparisonTray } from "@/lib/hooks/useComparisonTray";
import {
  clearComparisonParts,
  clearComparisonTray,
  COMPARISON_MAX,
  removeComparisonItem,
  selectComparisonPart,
  type ComparisonItem,
} from "@/lib/storage/comparison-tray";

type Product = ProductComparisonItemResponse;
type Part = ProductComparisonPartResponse;

/** 하위 상단 내비의 높이. 머리가 이 선 아래로 지나가면 줄어든 머리를 붙인다. */
const TOP_BAR_HEIGHT = 44;

/*
 * 세 칸의 틀. 칸 하나에 가장 긴 낱말(가격 '139,000원')이 들어가는 폭 5.5em 을 지키고, 그만큼 들어가지 않으면 칸 수를 줄인다.
 * 글자를 키워도 가격이 칸을 넘치지 않는다. em 은 틀(@container)의 글자 크기를 따른다.
 */
const COLUMNS = "grid grid-cols-1 gap-2 @min-[11.6em]:grid-cols-2 @min-[17.6em]:grid-cols-3";
/** 칸이 줄어 위아래로 쌓이면 어느 제품의 값인지 줄 위치로 알 수 없어 칸마다 제품명을 보인다. 넉넉하면 낭독에만 읽힌다. */
const CELL_LABEL = "sr-only text-caption leading-snug font-medium text-text-secondary @max-[17.6em]:not-sr-only";
/** 세 칸이 나란할 때만 있는 자리. 두 개만 비교할 때 세 번째 칸을 비워 둔다. */
const BLANK_CELL = "@max-[17.6em]:hidden";

const subscribeNothing = () => () => {};

/** 비교함은 기기에만 있어 서버가 그린 첫 화면에서는 비었는지 알 수 없다. 그동안은 스켈레톤을 보인다. */
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

type Load =
  | { readonly key: string; readonly status: "ready"; readonly products: readonly Product[] }
  | { readonly key: string; readonly status: "error"; readonly notFound: boolean };

/** 고른 제품과 구성품으로 비교 결과를 받는다. 구성품을 바꾸는 동안에는 앞 결과를 그대로 보인다. */
const useComparison = (items: readonly ComparisonItem[]) => {
  const [load, setLoad] = useState<Load>();
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [attempt, setAttempt] = useState(0);
  const key = items.map(({ productId, partId }) => `${productId}:${partId ?? ""}`).join(",");
  const enabled = items.length > 1;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchProductComparison(items).then(
      (response) => {
        if (!active) return;
        setProducts(response.items);
        setLoad({ key, status: "ready", products: response.items });
      },
      (error: unknown) => {
        if (!active) return;
        // 고른 구성품이 없어졌으면 첫 구성품으로 되돌려 다시 받는다.
        if (error instanceof ApiError && error.code === "PRODUCT_PART_NOT_FOUND") return clearComparisonParts();
        setLoad({
          key,
          status: "error",
          notFound: error instanceof ApiError && error.code === "PRODUCT_NOT_FOUND",
        });
      },
    );
    return () => {
      active = false;
    };
    // items 는 key 가 바뀔 때만 달라진 것으로 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, attempt]);

  return {
    products,
    pending: load?.key !== key,
    error: load?.key === key && load.status === "error" ? load : undefined,
    retry: () => setAttempt((count) => count + 1),
  };
};

/**
 * 제품 비교(시안 v2 V3 · V3-s · V3-a). 비교함에 담은 제품을 요청 순서대로 세 칸에 나란히 놓는다.
 *
 * - 머리: 사진 오른쪽 위 ×로 그 칸을 뺀다. 구성품이 여럿이면 칸 안에서 고른다. 빈 칸은 '제품 담기'로 제품 검색을 연다.
 * - 스크롤: 머리가 상단 내비 아래로 지나가면 사진 없는 줄어든 머리를 내비 밑에 붙인다. 높이를 줄이면 그만큼 본문이 튀므로
 *   제 자리의 머리는 그대로 지나가게 두고 줄어든 머리를 따로 얹는다.
 * - 하나만 남으면 비교할 수 없어 남은 제품의 상세로 옮긴다. 뒤로가기로 이 화면에 돌아오지 않게 기록을 바꾼다.
 */
export function ProductComparisonScreen() {
  const router = useRouter();
  const back = useSubScreenBack();
  const hydrated = useHydrated();
  const { items } = useComparisonTray();
  const { products, pending, error, retry } = useComparison(items);
  const [partSheetProductId, setPartSheetProductId] = useState<number>();
  const [shownPartSheetProductId, setShownPartSheetProductId] = useState<number>();
  const mainRef = useRef<HTMLElement>(null);

  const lastProductId = items.length === 1 ? items[0].productId : undefined;
  useEffect(() => {
    if (lastProductId !== undefined) router.replace(`/products/${lastProductId}`);
  }, [lastProductId, router]);

  const remove = (productId: number) => {
    removeComparisonItem(productId);
    // 누른 버튼이 사라지므로 포커스를 본문으로 옮긴다.
    mainRef.current?.focus();
  };

  const openPartSheet = (productId: number) => {
    setShownPartSheetProductId(productId);
    setPartSheetProductId(productId);
  };

  const visible = items.flatMap((item) => products.find((product) => product.id === item.productId) ?? []);
  const loaded = visible.length === items.length && items.length > 1;
  const emptySlots = COMPARISON_MAX - visible.length;
  const sheetProduct = visible.find((product) => product.id === shownPartSheetProductId);

  const body = () => {
    if (!hydrated || items.length === 1) return <ComparisonSkeleton />;
    if (items.length === 0)
      return (
        <EmptyState
          className="flex-1"
          title="비교함이 비어 있어요"
          description={"제품 상세에서 비교함에 담으면\n여기서 나란히 비교할 수 있어요."}
          action={
            <Button variant="secondary" onClick={() => router.push(COMPARISON_ADD_PATH)}>
              제품 찾아보기
            </Button>
          }
        />
      );
    if (error?.notFound)
      return (
        <ErrorState
          variant="screen"
          className="flex-1"
          title="비교함에 없어진 제품이 있어요"
          description="비교함을 비우고 다시 담아 주세요."
          action={
            <Button variant="secondary" onClick={clearComparisonTray}>
              비교함 비우기
            </Button>
          }
        />
      );
    if (error)
      return (
        <ErrorState
          variant="screen"
          className="flex-1"
          title="제품을 비교하지 못했어요"
          description={RETRY_LATER}
          action={
            <Button variant="secondary" onClick={retry}>
              다시 시도
            </Button>
          }
        />
      );
    if (!loaded) return <ComparisonSkeleton />;

    return (
      <>
        <ComparisonHeads
          products={visible}
          items={items}
          emptySlots={emptySlots}
          onRemove={remove}
          onOpenPart={openPartSheet}
          partSheetProductId={partSheetProductId}
        />
        <Rows products={visible} emptySlots={emptySlots} />
      </>
    );
  };

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <TopBar variant="sub" title="제품 비교" back={back} />
      <main
        ref={mainRef}
        tabIndex={-1}
        aria-busy={hydrated && pending && items.length > 1}
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
              value={String(partIdOf(sheetProduct, items))}
              onValueChange={(value) => {
                selectComparisonPart(sheetProduct.id, Number(value));
                setPartSheetProductId(undefined);
              }}
            >
              {sheetProduct.productParts.map((part, index) => (
                <RadioGroupItem key={part.id} value={String(part.id)}>
                  {comparisonPartName(part.name, index)}
                </RadioGroupItem>
              ))}
            </RadioGroup>
          </BottomSheetBody>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

/** 지금 고른 구성품. 방금 고른 값을 응답을 기다리지 않고 바로 보인다. */
const partIdOf = (product: Product, items: readonly ComparisonItem[]): number | undefined =>
  items.find((item) => item.productId === product.id)?.partId ?? product.selectedPart?.id;

const partNameOf = (product: Product, items: readonly ComparisonItem[]): string => {
  const id = partIdOf(product, items);
  const index = product.productParts.findIndex((part) => part.id === id);
  return comparisonPartName(product.productParts[index]?.name ?? null, Math.max(index, 0));
};

/** 제 자리의 머리와 줄어든 머리. 머리 끝 표식이 화면에 붙은 뒤에 지켜봐야 하므로 불러온 뒤에 그린다. */
function ComparisonHeads(props: Parameters<typeof Head>[0]) {
  const { ref: headEndRef, passed } = usePassedTop<HTMLDivElement>(undefined, true, TOP_BAR_HEIGHT);

  return (
    <>
      <CompactHead
        products={props.products}
        items={props.items}
        emptySlots={props.emptySlots}
        shown={passed}
        onOpenPart={props.onOpenPart}
      />
      <Head {...props} />
      <div ref={headEndRef} aria-hidden="true" className={BOUNDARY_MARKER} />
    </>
  );
}

function Head({
  products,
  items,
  emptySlots,
  onRemove,
  onOpenPart,
  partSheetProductId,
}: {
  readonly products: readonly Product[];
  readonly items: readonly ComparisonItem[];
  readonly emptySlots: number;
  readonly onRemove: (productId: number) => void;
  readonly onOpenPart: (productId: number) => void;
  readonly partSheetProductId: number | undefined;
}) {
  return (
    <div className="border-b border-border px-gutter pt-2 pb-3">
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
                icon={
                  <span className="flex items-center justify-center">
                    <Icon name="x" size={14} />
                  </span>
                }
                className="absolute top-0 right-0"
                onClick={() => onRemove(product.id)}
              />
            </div>
            <p className="text-caption leading-snug font-medium text-text-secondary">{product.brand.name}</p>
            <p className="text-body-sm leading-snug font-bold text-text-primary">{product.name}</p>
            {product.productParts.length > 1 ? (
              <Select
                aria-label={`${product.name} 구성`}
                placeholder="구성 고르기"
                value={partNameOf(product, items)}
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
  items,
  emptySlots,
  shown,
  onOpenPart,
}: {
  readonly products: readonly Product[];
  readonly items: readonly ComparisonItem[];
  readonly emptySlots: number;
  readonly shown: boolean;
  readonly onOpenPart: (productId: number) => void;
}) {
  return (
    <div className="sticky top-11 z-(--z-sticky) h-0 @max-[17.6em]:hidden">
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
                  value={partNameOf(product, items)}
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
      className="pressable flex min-w-0 items-center gap-0.5 text-left text-caption leading-snug font-medium text-text-secondary after:absolute after:-inset-y-3.5 after:inset-x-0"
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
    <div className="flex flex-col px-gutter pb-8">
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

/** 첫 로딩. 실제 머리와 줄이 올 자리를 같은 틀로 채운다. */
function ComparisonSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className={cn(COLUMNS, "border-b border-border px-gutter pt-2 pb-3")}>
        {Array.from({ length: COMPARISON_MAX }, (_, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-1">
            <Skeleton shape="box" className="h-26 w-full" />
            <Skeleton shape="line" size={12} className="w-1/2" />
            <Skeleton shape="line" size={14} className="w-4/5" />
          </div>
        ))}
      </div>
      <div className="flex flex-col px-gutter">
        {Array.from({ length: 3 }, (_, row) => (
          <div key={row} className="flex flex-col gap-2 border-b border-border py-3">
            <Skeleton shape="line" size={12} className="w-1/4" />
            <div className={COLUMNS}>
              {Array.from({ length: COMPARISON_MAX }, (_, index) => (
                <Skeleton key={index} shape="line" size={14} className="w-4/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
