"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Combobox, ComboboxGroup, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ShelfAddRow } from "./ShelfAddRow";
import { ShelfRegistrationSheet } from "./ShelfRegistrationSheet";
import { ShelfRatingSheet } from "./ShelfSheets";

import { Icon } from "@/components/ui/icons/Icon";
// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";
import { formatCount, josaOf } from "@/lib/domain/format";
import { useShelfAdd } from "@/lib/hooks/useShelfAdd";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type NoResultProps = {
  readonly keyword: string;
  readonly onRequest: () => void;
};

/** 검색어와 맞는 제품이 없을 때(S52h-1). 등록 요청으로 바로 이어 준다. */
function NoResult({ keyword, onRequest }: NoResultProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 pt-12 pb-2 text-center">
      <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-surface">
        <Icon name="zoom-exclamation" size={24} strokeWidth={2} className="text-text-secondary" />
      </span>
      <p className="text-section font-bold text-text-primary">{`‘${keyword}’${josaOf(keyword, "과/와")} 맞는 제품이 없어요`}</p>
      <p className="text-body text-text-secondary">
        브랜드나 제품 이름을 다시 확인해 보세요.
        <br />
        아직 등록되지 않은 제품이면 등록을 요청할 수 있어요.
      </p>
      <div className="w-full pt-2">
        <Button variant="secondary" className="w-full" onClick={onRequest}>
          제품 등록 요청하기
        </Button>
      </div>
    </div>
  );
}

/** 찾는 제품이 없을 때 등록 요청을 여는 줄. 화면 아래에 붙는다(S52g). */
function RegistrationBar({ onOpen }: { readonly onOpen: () => void }) {
  const { pressableProps } = usePressable();

  // TODO(#729): 하단 행동 영역(BottomActionBar)이 들어오면 그 안에 둔다. 지금은 본문 끝에 붙인다.
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 bg-surface px-gutter pt-2 pb-safe">
      <p className="text-body-sm text-text-secondary">찾는 제품이 없나요?</p>
      <button
        type="button"
        {...pressableProps}
        onClick={onOpen}
        className="pressable fb-border flex h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-body leading-none font-semibold text-text-primary"
      >
        등록 요청하기
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  );
}

/** 제품 추가(/shelf/add). 제품명이나 브랜드로 찾아 선반에 담고, 이어서 평가 시트를 연다(S52g~S52j). */
export function ShelfAddScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [added, setAdded] = useState<ShelfProductResponse>();
  const [registering, setRegistering] = useState(false);
  const { suggestions, search, shelved, add, update } = useShelfAdd(() => {
    rememberLoginReturn();
    router.replace("/login");
  });
  const searching = keyword.trim().length > 0;
  // 지금 입력한 검색어의 결과가 도착했는데 비었을 때만 알린다. 앞 결과를 기다리는 동안은 띄우지 않는다.
  const noResult = searching && suggestions.keyword === keyword.trim() && suggestions.total === 0;
  const status = searching ? `${suggestions.keyword} 결과 ${formatCount(suggestions.total)}` : undefined;

  return (
    <>
      <TopBar title="제품 추가" variant="sub" />
      <main className="flex flex-1 flex-col">
        <Combobox value={keyword} onChange={setKeyword} open={searching} onSearch={search} status={status}>
          <div className="px-gutter pt-2 pb-4">
            <ComboboxInput label="제품 검색" placeholder="제품명이나 브랜드로 찾기" />
          </div>

          {searching ? null : (
            <div className="flex flex-col gap-1 px-gutter">
              <h2 className="text-section font-bold text-text-primary">어떤 제품을 쓰고 있나요?</h2>
              <p className="text-body-sm text-text-secondary">제품명이나 브랜드로 찾아서 선반에 저장해 보세요.</p>
            </div>
          )}

          <div className="px-gutter">
            <ComboboxList label="제품 자동완성">
              {suggestions.items.length > 0 ? (
                <ComboboxGroup
                  label={
                    <p className="pb-1 text-caption font-semibold text-text-secondary">{`제품 · ${suggestions.total}`}</p>
                  }
                >
                  {suggestions.items.map((product) => (
                    <ComboboxOption
                      key={product.id}
                      disabled={shelved.has(product.id)}
                      // TODO(#728): 담지 못하면 토스트로 알린다.
                      onSelect={() => add(product.id).then(setAdded, () => undefined)}
                    >
                      <ShelfAddRow product={product} keyword={suggestions.keyword} shelved={shelved.get(product.id)} />
                    </ComboboxOption>
                  ))}
                </ComboboxGroup>
              ) : null}
            </ComboboxList>
            {noResult ? <NoResult keyword={suggestions.keyword} onRequest={() => setRegistering(true)} /> : null}
          </div>
        </Combobox>

        <div className="flex-1" />
        <RegistrationBar onOpen={() => setRegistering(true)} />
      </main>

      {/* TODO(#728): 평가 시트를 그냥 닫으면 '선반에 저장했어요. 평가는 선반에서 언제든 할 수 있어요 · 되돌리기' 토스트를 띄운다(S52j). */}
      <ShelfRatingSheet
        item={added}
        justAdded
        onClose={() => setAdded(undefined)}
        onSave={(draft) => (added ? update(added.product.id, draft) : Promise.resolve())}
      />
      <ShelfRegistrationSheet open={registering} keyword={keyword.trim()} onClose={() => setRegistering(false)} />
    </>
  );
}
