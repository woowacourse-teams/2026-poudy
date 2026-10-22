"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Combobox, ComboboxGroup, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ShelfAddRow, type ShelfAddRowState } from "./ShelfAddRow";
import { ShelfRegistrationSheet } from "./ShelfRegistrationSheet";
import { ShelfRatingSheet } from "./ShelfSheets";

import { SubTopBar } from "@/components/navigation/SubTopBar";
// 패키지 Icon 에 아직 없는 그림(zoom-exclamation)만 옛 아이콘으로 그린다.
import { Icon as LegacyIcon } from "@/components/ui/icons/Icon";
import { formatCount, josaOf } from "@/lib/domain/format";
import { draftOf } from "@/lib/domain/shelf";
import { useShelfAdd } from "@/lib/hooks/useShelfAdd";
import { rememberLoginReturn } from "@/lib/storage/login-return";

const RETRY_LATER = "잠시 후 다시 시도해 주세요.";

type NoResultProps = {
  readonly keyword: string;
  readonly onRequest: () => void;
};

/** 검색어와 맞는 제품이 없을 때(S52h-1). 등록 요청으로 바로 이어 준다. */
function NoResult({ keyword, onRequest }: NoResultProps) {
  return (
    // 키보드가 올라와 있어도 보이도록 검색창 바로 아래에 둔다(S52h-1). 버튼 폭은 글자에 맞춘다(F03).
    <div className="flex flex-col items-center gap-2 px-2 pt-10 pb-2 text-center">
      <div className="pb-1">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-surface">
          <LegacyIcon name="zoom-exclamation" size={24} strokeWidth={2} className="text-text-secondary" />
        </span>
      </div>
      <p className="text-section leading-snug font-bold text-text-primary">{`‘${keyword}’${josaOf(keyword, "과/와")} 맞는 제품이 없어요`}</p>
      <p className="text-body leading-normal text-text-secondary">
        브랜드나 제품 이름을 다시 확인해 보세요.
        <br />
        아직 등록되지 않은 제품이면 등록을 요청할 수 있어요.
      </p>
      <div className="pt-2">
        <Button variant="secondary" onClick={onRequest}>
          제품 등록 요청하기
        </Button>
      </div>
    </div>
  );
}

/**
 * 자동완성 목록의 마지막 줄(S52h). 결과 행과 같은 격자로 이어져 '목록의 마지막 칸'처럼 읽힌다. 고르면 등록 요청 시트를 연다.
 * 결과가 없으면 이 줄 대신 결과 없음 안내의 [제품 등록 요청하기]가 같은 일을 한다(S52h-1).
 */
function RegistrationRow() {
  return (
    <div className="flex items-center gap-3 py-2">
      <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-surface text-text-secondary">
          <Icon name="plus" size={20} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body leading-snug font-semibold text-text-primary">찾는 제품이 없나요?</span>
        <span className="text-caption leading-snug text-text-secondary">제품 등록을 요청해 주세요</span>
      </span>
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center text-text-muted">
        <Icon name="chevron-right" size={20} />
      </span>
    </div>
  );
}

/**
 * 제품 추가(/shelf/add). 제품명이나 브랜드로 찾아 선반에 담고, 이어서 평가 시트를 연다(S52g~S52j-1).
 * 검색 전에는 짧은 안내만 두고, 등록 요청은 결과 목록의 마지막 줄이나 결과 없음 안내에서 연다.
 */
export function ShelfAddScreen() {
  const router = useRouter();
  const toast = useToast();
  const searchRef = useRef<HTMLDivElement>(null);
  const [keyword, setKeyword] = useState("");
  const [rating, setRating] = useState<ShelfProductResponse>();
  const [registering, setRegistering] = useState(false);
  // 이번 방문에 담은 제품과 그 마지막 값. 행에 [담김]을 두고, 뺀 뒤 되돌리면 이 값으로 다시 담는다(S52j-1).
  const [justAdded, setJustAdded] = useState<ReadonlyMap<number, ShelfProductResponse>>(new Map());
  const { suggestions, failedKeyword, search, shelved, add, update, remove } = useShelfAdd(() => {
    rememberLoginReturn();
    router.replace("/login");
  });
  const searching = keyword.trim().length > 0;
  const failed = searching && failedKeyword === keyword.trim();
  // 지금 입력한 검색어의 결과가 도착했는데 비었을 때만 알린다. 앞 결과를 기다리는 동안은 띄우지 않는다.
  const noResult = searching && !failed && suggestions.keyword === keyword.trim() && suggestions.total === 0;
  const status = searching ? `${suggestions.keyword} 결과 ${formatCount(suggestions.total)}` : undefined;
  // 토스트의 행동을 마친 뒤 포커스를 돌려줄 곳.
  const searchInput = () => searchRef.current?.querySelector("input");

  const remember = (item: ShelfProductResponse) =>
    setJustAdded((current) => new Map(current).set(item.product.id, item));
  const forget = (productId: number) =>
    setJustAdded((current) => {
      const next = new Map(current);
      next.delete(productId);
      return next;
    });

  const rowState = (productId: number): ShelfAddRowState =>
    (justAdded.has(productId) && "justAdded") || (shelved.has(productId) && "shelved") || "add";

  const pick = (productId: number) =>
    add(productId).then(
      (item) => {
        remember(item);
        setRating(item);
      },
      () => toast.show({ message: `선반에 담지 못했어요. ${RETRY_LATER}` }),
    );

  /** 뺀 제품을 다시 담는다. 남겼던 평가와 사용 상태도 함께 되살리고, 평가 시트는 다시 띄우지 않는다. */
  const putBack = (item: ShelfProductResponse) =>
    add(item.product.id)
      .then(() => update(item.product.id, draftOf(item)))
      .then(remember, () => toast.show({ message: `되돌리지 못했어요. ${RETRY_LATER}` }));

  /** 방금 담은 행의 [담김]. 확인 없이 바로 빼고 되돌리기를 띄운다(S52j-1). */
  const takeOut = (item: ShelfProductResponse) =>
    remove(item.product.id).then(
      () => {
        forget(item.product.id);
        toast.show({
          message: "선반에서 뺐어요",
          action: { label: "되돌리기", onClick: () => void putBack(item), returnFocusTo: searchInput },
        });
      },
      () => toast.show({ message: `선반에서 빼지 못했어요. ${RETRY_LATER}` }),
    );

  const select = (productId: number) => {
    const item = justAdded.get(productId);
    if (item) return void takeOut(item);
    if (!shelved.has(productId)) void pick(productId);
  };

  /** 평가를 저장하지 않고 닫으면 담은 것만 알리고 되돌릴 수 있게 한다(S52j). */
  const closeRating = (saved: boolean) => {
    const item = rating;
    setRating(undefined);
    if (saved || !item) return;
    toast.show({
      message: "선반에 저장했어요. 평가는 선반에서 언제든 할 수 있어요",
      action: {
        label: "되돌리기",
        onClick: () =>
          void remove(item.product.id).then(
            () => forget(item.product.id),
            () => toast.show({ message: `되돌리지 못했어요. ${RETRY_LATER}` }),
          ),
        returnFocusTo: searchInput,
      },
    });
  };

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar title="제품 추가" />
      <ScreenBody>
        <main className="flex flex-1 flex-col">
          <Combobox value={keyword} onChange={setKeyword} open={searching} onSearch={search} status={status}>
            <div ref={searchRef} className="px-gutter pt-2 pb-4">
              <ComboboxInput label="제품 검색" placeholder="제품명이나 브랜드로 찾기" />
            </div>

            {searching ? null : (
              <div className="flex flex-col gap-1 px-gutter py-2">
                <h2 className="text-title leading-snug font-semibold text-text-primary">어떤 제품을 쓰고 있나요?</h2>
                <p className="text-body-sm leading-normal text-text-secondary">
                  제품명이나 브랜드로 찾아서 선반에 저장해 보세요.
                </p>
              </div>
            )}

            <div className="px-gutter">
              <ComboboxList label="제품 자동완성">
                {!failed && suggestions.items.length > 0 ? (
                  <ComboboxGroup
                    label={
                      <p className="pt-5 pb-1 text-caption leading-snug font-semibold text-text-secondary">{`제품 · ${suggestions.total}`}</p>
                    }
                  >
                    {suggestions.items.map((product) => (
                      <ComboboxOption
                        key={product.id}
                        disabled={rowState(product.id) === "shelved"}
                        onSelect={() => select(product.id)}
                      >
                        <ShelfAddRow product={product} keyword={suggestions.keyword} state={rowState(product.id)} />
                      </ComboboxOption>
                    ))}
                  </ComboboxGroup>
                ) : null}
                {!failed && suggestions.items.length > 0 ? (
                  <ComboboxOption onSelect={() => setRegistering(true)}>
                    <RegistrationRow />
                  </ComboboxOption>
                ) : null}
              </ComboboxList>
              {failed ? (
                <ErrorState variant="section" onRetry={() => search(keyword)}>
                  제품을 불러오지 못했어요
                </ErrorState>
              ) : null}
              {noResult ? <NoResult keyword={suggestions.keyword} onRequest={() => setRegistering(true)} /> : null}
            </div>
          </Combobox>
        </main>
      </ScreenBody>

      <ShelfRatingSheet
        item={rating}
        justAdded
        onClose={closeRating}
        onSave={(draft) => (rating ? update(rating.product.id, draft).then(remember) : Promise.resolve())}
      />
      <ShelfRegistrationSheet
        open={registering}
        keyword={keyword.trim()}
        onClose={() => setRegistering(false)}
        onSent={() => {
          setRegistering(false);
          toast.show({ message: "제품 등록을 요청했어요" });
        }}
      />
    </Screen>
  );
}
