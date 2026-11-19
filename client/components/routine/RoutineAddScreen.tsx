"use client";

import type { ProductSuggestionResponse, RoutineResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { cn } from "@poudy/design-system/cn";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { SearchField } from "@poudy/design-system/search-field";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ProductImage } from "@/components/ui/ProductImage";
import { BrandWithMark } from "@/components/ui/ProductMarkTag";
import { trackRoutineProducts } from "@/lib/analytics/routine";
import { fetchProductSuggestions } from "@/lib/api/products";
import { replaceRoutineProducts } from "@/lib/api/routine";
import { josaOf } from "@/lib/domain/format";
import { RETRY_LATER } from "@/lib/domain/messages";
import { appendedProducts, TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";
import { useMyRoutine } from "@/lib/hooks/useRoutines";
import { useSimilarityShelf } from "@/lib/hooks/useSimilarityShelf";

type SearchState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly keyword: string }
  | {
      readonly status: "ready";
      readonly keyword: string;
      readonly items: readonly ProductSuggestionResponse[];
      readonly total: number;
    };

/** 검색어가 바뀔 때마다 제품을 찾는다. 늦게 온 앞 검색의 결과는 버린다. */
const useProductSearch = (keyword: string) => {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const latest = useRef("");

  useEffect(() => {
    const trimmed = keyword.trim();
    latest.current = trimmed;
    if (!trimmed) return;
    fetchProductSuggestions(trimmed).then(
      (page) => {
        if (latest.current === trimmed)
          setState({ status: "ready", keyword: trimmed, items: page.items, total: page.pagination.totalElements });
      },
      () => {
        if (latest.current === trimmed) setState({ status: "error", keyword: trimmed });
      },
    );
  }, [keyword]);

  if (!keyword.trim()) return { status: "idle" } as const;
  return state;
};

type PickProduct = Pick<ProductSuggestionResponse, "id" | "name" | "brandName" | "marks" | "imageUrl">;

type PickRowProps = {
  readonly product: PickProduct;
  readonly existing: boolean;
  readonly selected: boolean;
  readonly onToggle: () => void;
};

/**
 * 고르는 행(S193 · S195). 성분 추가 화면(S38)과 같은 ＋/✓ 표시 행이다. 행 전체가 누르는 영역이고 hover 면은 화면 폭 전체다.
 * 고르기 전은 ＋ 원, 고른 뒤는 채운 ✓ 원, 이미 그 구간에 있는 제품은 회색 ✓ 와 '· 이미 추가됨'이며 누를 수 없다.
 * 사진 칸은 hover 면과 같은 색이라 행이 한 덩어리로 눌린다. 제품명은 두 줄까지 보이고 넘치면 줄인다.
 */
function PickRow({ product, existing, selected, onToggle }: PickRowProps) {
  const { pressableProps } = usePressable({ disabled: existing });

  return (
    <li>
      <button
        {...pressableProps}
        type="button"
        aria-pressed={existing ? undefined : selected}
        aria-disabled={existing || undefined}
        onClick={() => {
          if (!existing) onToggle();
        }}
        className="pressable fb-bleed flex w-full items-center gap-3 border-b border-border py-2 text-left aria-disabled:opacity-100"
      >
        <span className="shrink-0 overflow-hidden rounded-md bg-surface">
          <ProductImage src={product.imageUrl} size={48} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-baseline gap-1">
            <BrandWithMark marks={product.marks} className="min-w-0">
              <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
            </BrandWithMark>
            {existing ? <span className="shrink-0 text-caption text-text-secondary">· 이미 추가됨</span> : null}
          </span>
          <span
            className={cn(
              "line-clamp-2 text-body font-semibold break-keep",
              existing ? "text-text-muted" : "text-text-primary",
            )}
          >
            {product.name}
          </span>
        </span>
        <span aria-hidden="true" className="flex h-11 w-9 shrink-0 items-center justify-center">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              existing && "bg-layer text-text-muted",
              !existing && selected && "bg-action text-action-text",
              !existing && !selected && "border border-border-strong text-text-primary",
            )}
          >
            <Icon name={existing || selected ? "check" : "plus"} size={20} />
          </span>
        </span>
      </button>
    </li>
  );
}

/** 고를 수 있는 제품 묶음. 머리 글('내 파우치 N', '검색 결과 N') 아래에 고르는 행을 늘어놓는다. */
function PickList({
  label,
  heading,
  products,
  existingIds,
  selected,
  onToggle,
}: {
  readonly label: string;
  readonly heading: string;
  readonly products: readonly PickProduct[];
  readonly existingIds: readonly number[];
  readonly selected: readonly number[];
  readonly onToggle: (productId: number) => void;
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <p className="text-caption font-semibold text-text-secondary">{heading}</p>
      <ul className="flex flex-col">
        {products.map((product) => (
          <PickRow
            key={product.id}
            product={product}
            existing={existingIds.includes(product.id)}
            selected={selected.includes(product.id)}
            onToggle={() => onToggle(product.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function AddBody({ routine, timeOfDay }: { readonly routine: RoutineResponse; readonly timeOfDay: TimeOfDay }) {
  const router = useRouter();
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [busy, setBusy] = useState(false);
  const search = useProductSearch(keyword);
  // 검색하지 않고도 쓰는 제품을 바로 고르게 파우치 제품을 먼저 보인다. 사용 중·다 쓴 제품을 모두 API 순서(최근 등록순) 그대로 둔다.
  const { state: shelf } = useSimilarityShelf();
  const pouch = shelf.status === "ready" ? shelf.shelf.items.map((item) => item.product) : [];
  const label = TIME_OF_DAY_LABEL[timeOfDay];
  const existingIds = routine[timeOfDay].map((product) => product.id);

  const toggle = (productId: number) =>
    setSelected((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      return [...current, productId];
    });

  const add = async () => {
    setBusy(true);
    try {
      const products = appendedProducts(routine, timeOfDay, selected);
      const updated = await replaceRoutineProducts(routine.id, {
        morningProductIds: [...products.morningProductIds],
        eveningProductIds: [...products.eveningProductIds],
      });
      trackRoutineProducts(routine, updated);
      toast.show({ message: `${label}에 제품 ${selected.length}개를 추가했어요` });
      router.back();
    } catch {
      setBusy(false);
      toast.show({ message: `제품을 추가하지 못했어요. ${RETRY_LATER}` });
    }
  };

  return (
    <>
      <SubTopBar title={`${label}에 제품 추가`} />
      <ScreenBody>
        <main className="flex flex-1 flex-col gap-3 px-gutter pt-2 pb-inquiry">
          <SearchField
            value={keyword}
            onChange={setKeyword}
            label="제품 검색"
            placeholder="브랜드나 제품 이름으로 찾아보세요"
            autoFocus
          />
          {search.status === "idle" && pouch.length > 0 ? (
            <PickList
              label="내 파우치"
              heading={`내 파우치 ${pouch.length}`}
              products={pouch}
              existingIds={existingIds}
              selected={selected}
              onToggle={toggle}
            />
          ) : null}
          {search.status === "ready" && search.items.length > 0 ? (
            <PickList
              label="검색 결과"
              heading={`검색 결과 ${search.total}`}
              products={search.items}
              existingIds={existingIds}
              selected={selected}
              onToggle={toggle}
            />
          ) : null}
          {search.status === "ready" && search.items.length === 0 ? (
            <EmptyState
              icon={<Icon name="search" size={28} />}
              title={`‘${search.keyword}’${josaOf(search.keyword, "과/와")} 맞는 제품이 없어요`}
              description="브랜드나 제품 이름을 다시 확인해 보세요."
            />
          ) : null}
          {search.status === "error" ? (
            <EmptyState
              icon={<Icon name="alert-circle" size={28} />}
              title="제품을 찾지 못했어요"
              description={RETRY_LATER}
            />
          ) : null}
        </main>
      </ScreenBody>
      <BottomActionBar
        position="screen-end"
        action={{
          label: selected.length > 0 ? `${selected.length}개 추가하기` : "추가하기",
          onClick: add,
          disabled: selected.length === 0,
          busy,
        }}
      />
    </>
  );
}

/**
 * 루틴 구간에 제품 추가(/routines/[routineId]/add, S193~S197). 검색 전에는 내 파우치 제품을 먼저 보이고, 검색하면 결과를 보인다.
 * 여러 개를 고른 뒤 하단 'N개 추가하기'로 한 번에 구간 끝에 추가한다.
 */
export function RoutineAddScreen({
  routineId,
  timeOfDay,
}: {
  readonly routineId: number;
  readonly timeOfDay: TimeOfDay;
}) {
  const { state } = useMyRoutine(routineId);

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      {state.status === "ready" ? (
        <AddBody routine={state.data} timeOfDay={timeOfDay} />
      ) : (
        <>
          <SubTopBar title={`${TIME_OF_DAY_LABEL[timeOfDay]}에 제품 추가`} />
          <ScreenBody>
            <main aria-busy={state.status === "loading" || undefined} className="flex flex-1 flex-col">
              {state.status === "loading" ? null : (
                <EmptyState
                  icon={<Icon name="alert-circle" size={28} />}
                  title="루틴을 불러오지 못했어요"
                  description={RETRY_LATER}
                  className="flex-1"
                />
              )}
            </main>
          </ScreenBody>
        </>
      )}
    </Screen>
  );
}
