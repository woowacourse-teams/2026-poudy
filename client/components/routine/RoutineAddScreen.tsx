"use client";

import type { ProductSuggestionResponse, RoutineResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { SearchField } from "@poudy/design-system/search-field";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ProductImage } from "@/components/ui/ProductImage";
import { BrandWithMark } from "@/components/ui/ProductMarkTag";
import { fetchProductSuggestions } from "@/lib/api/products";
import { replaceRoutineProducts } from "@/lib/api/routine";
import { josaOf } from "@/lib/domain/format";
import { RETRY_LATER } from "@/lib/domain/messages";
import { appendedProducts, TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";
import { useMyRoutine } from "@/lib/hooks/useRoutines";

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

type ResultRowProps = {
  readonly product: ProductSuggestionResponse;
  readonly existing: boolean;
  readonly selected: boolean;
  readonly existingLabel: string;
  readonly onToggle: () => void;
};

function ResultRow({ product, existing, selected, existingLabel, onToggle }: ResultRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border py-3">
      <span className="overflow-hidden rounded-md bg-surface">
        <ProductImage src={product.imageUrl} size={64} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <BrandWithMark marks={product.marks}>
          <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
        </BrandWithMark>
        <span className="truncate text-body font-semibold text-text-primary">{product.name}</span>
      </span>
      {existing ? (
        <span className="shrink-0 text-caption text-text-secondary">{existingLabel}</span>
      ) : (
        <Button
          variant={selected ? "primary" : "secondary"}
          size="sm"
          aria-pressed={selected}
          aria-label={`${product.name} ${selected ? "선택됨" : "선택"}`}
          onClick={onToggle}
        >
          {selected ? "선택됨" : "선택"}
        </Button>
      )}
    </li>
  );
}

function AddBody({ routine, timeOfDay }: { readonly routine: RoutineResponse; readonly timeOfDay: TimeOfDay }) {
  const router = useRouter();
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [busy, setBusy] = useState(false);
  const search = useProductSearch(keyword);
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
      await replaceRoutineProducts(routine.id, {
        morningProductIds: [...products.morningProductIds],
        eveningProductIds: [...products.eveningProductIds],
      });
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
        <main className="flex flex-1 flex-col gap-3 px-gutter pt-2 pb-6">
          <SearchField
            value={keyword}
            onChange={setKeyword}
            label="제품 검색"
            placeholder="브랜드나 제품 이름으로 찾아보세요"
            autoFocus
          />
          {search.status === "ready" && search.items.length > 0 ? (
            <section aria-label="검색 결과" className="flex flex-col">
              <p className="pb-1 text-caption font-semibold text-text-secondary">검색 결과 {search.total}</p>
              <ul className="flex flex-col">
                {search.items.map((product) => (
                  <ResultRow
                    key={product.id}
                    product={product}
                    existing={existingIds.includes(product.id)}
                    existingLabel={`${label}에 있어요`}
                    selected={selected.includes(product.id)}
                    onToggle={() => toggle(product.id)}
                  />
                ))}
              </ul>
            </section>
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

/** 루틴 구간에 제품 추가(/routines/[routineId]/add, RT6). 검색해 여러 개를 고른 뒤 한 번에 구간 끝에 추가한다. */
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
