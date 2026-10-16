"use client";

import type { ShelfProductResponse, ShelfTab, ShelfUsageStatus } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { IconButton } from "@poudy/design-system/icon-button";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IngredientAnalysisCard } from "./IngredientAnalysisCard";
import { ShelfIntro } from "./ShelfIntro";
import { ShelfIntroActions } from "./ShelfIntroActions";
import { ShelfProductRow } from "./ShelfProductRow";
import { ShelfFeatureSheet, ShelfProductMenu, ShelfRatingSheet, ShelfRemoveConfirm } from "./ShelfSheets";
import { ShelfViewFilter } from "./ShelfViewFilter";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { Icon } from "@/components/ui/icons/Icon";
// TODO(#729): 큰 제목 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";
import { clearedDraft, countInTab, movedDraft, type RatingDraft, shelfSections } from "@/lib/domain/shelf";
import { type ShelfData, useShelf } from "@/lib/hooks/useShelf";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type ShelfHeaderProps = {
  readonly onHelp: () => void;
};

function ShelfHeader({ onHelp }: ShelfHeaderProps) {
  const router = useRouter();

  return (
    <TopBar
      title="선반"
      variant="root"
      right={
        <div className="flex items-center">
          {/* TODO(#729): 도움말 아이콘(Tabler help-circle). Icon 부품이 들어오면 넣는다. */}
          <IconButton label="선반 기능 설명" onClick={onHelp} icon={null} />
          <IconButton
            label="제품 추가"
            onClick={() => router.push("/shelf/add")}
            icon={<Icon name="plus" size={24} />}
          />
        </div>
      }
    />
  );
}

type ShelfListProps = {
  readonly data: ShelfData;
  readonly onRate: (item: ShelfProductResponse) => void;
  readonly onOpenMenu: (item: ShelfProductResponse) => void;
};

function ShelfList({ data, onRate, onOpenMenu }: ShelfListProps) {
  const [tab, setTab] = useState<ShelfTab>("ALL");
  const { items, usages } = data.shelf;

  return (
    <>
      <ShelfViewFilter usages={usages} value={tab} onValueChange={setTab} />
      <section aria-label="선반 제품" className="flex flex-col">
        <p className="pb-1 text-body-sm text-text-secondary">{`${countInTab(items, tab)}개`}</p>
        {shelfSections(items, tab).map((section, sectionIndex) => (
          <div key={section.heading ?? tab} className="flex flex-col">
            {section.heading ? (
              <h3 className="pt-5 pb-1 text-caption font-semibold text-text-secondary">{section.heading}</h3>
            ) : null}
            <ul className="flex flex-col">
              {section.items.map((item, index) => (
                <li key={item.product.id}>
                  <ShelfProductRow
                    item={item}
                    loading={sectionIndex === 0 && index < 3 ? "eager" : "lazy"}
                    onRate={() => onRate(item)}
                    onOpenMenu={() => onOpenMenu(item)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}

type ShelfBodyProps = {
  readonly data: ShelfData;
  readonly update: (productId: number, draft: RatingDraft) => Promise<unknown>;
  readonly remove: (productId: number) => Promise<unknown>;
};

/** 선반 본문(S52). 안 맞을 수 있는 성분 카드, 보기 필터, 제품 목록과 그 위에 뜨는 시트들. */
function ShelfBody({ data, update, remove }: ShelfBodyProps) {
  const [menuItem, setMenuItem] = useState<ShelfProductResponse>();
  const [ratingItem, setRatingItem] = useState<ShelfProductResponse>();
  const [removingItem, setRemovingItem] = useState<ShelfProductResponse>();

  // TODO(#728): 옮기기·평가 지우기·빼기 뒤에는 '되돌리기'가 있는 토스트를 띄운다(S53g). 지금은 결과만 반영한다.
  const move = (item: ShelfProductResponse, usageStatus: ShelfUsageStatus) => {
    setMenuItem(undefined);
    void update(item.product.id, movedDraft(item, usageStatus));
  };
  const clear = (item: ShelfProductResponse) => {
    setMenuItem(undefined);
    void update(item.product.id, clearedDraft(item));
  };

  return (
    <div className="flex flex-col gap-4 px-gutter pt-4 pb-6">
      {data.analysis.badProductCount > 0 ? (
        <IngredientAnalysisCard
          analysis={data.analysis}
          filterCount={data.filterCount}
          askSkinType={data.member.skinType === null}
        />
      ) : null}

      <ShelfList data={data} onRate={setRatingItem} onOpenMenu={setMenuItem} />

      <ShelfProductMenu
        item={menuItem}
        onClose={() => setMenuItem(undefined)}
        onEdit={(item) => {
          setMenuItem(undefined);
          setRatingItem(item);
        }}
        onClear={clear}
        onMove={move}
        onRemove={(item) => {
          setMenuItem(undefined);
          setRemovingItem(item);
        }}
      />
      <ShelfRatingSheet
        item={ratingItem}
        onClose={() => setRatingItem(undefined)}
        onSave={(draft) => (ratingItem ? update(ratingItem.product.id, draft) : Promise.resolve())}
      />
      <ShelfRemoveConfirm
        item={removingItem}
        onClose={() => setRemovingItem(undefined)}
        onConfirm={(item) => remove(item.product.id)}
      />
    </div>
  );
}

/** 선반 소개로 시작하는 화면. 로그인 전(S54a)과 빈 선반(S54b)이 쓴다. */
function ShelfStart({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <div className="flex flex-col px-gutter pt-4 pb-6">
      <ShelfIntro />
      <ShelfIntroActions label={label} onPress={onPress} />
    </div>
  );
}

/** 선반(/shelf). 로그인 전, 불러오는 중, 오류, 빈 선반, 제품이 있는 선반을 가른다. */
export function ShelfScreen() {
  const router = useRouter();
  const { state, retry, update, remove } = useShelf();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <ShelfHeader onHelp={() => setHelpOpen(true)} />
      <main className="flex flex-1 flex-col">
        {/* TODO(#728): 불러오는 동안 스켈레톤(S50a)을 둔다. 지금은 빈 본문이다. */}
        {state.status === "signedOut" ? (
          <ShelfStart
            label="로그인하고 시작하기"
            onPress={() => {
              rememberLoginReturn();
              router.push("/login");
            }}
          />
        ) : null}
        {state.status === "adminSession" ? <AdminSessionNotice className="px-gutter pt-4" /> : null}
        {state.status === "error" ? (
          // TODO(#728): 화면 오류(ErrorState, S51)로 바꾼다. 지금은 문구와 다시 시도 버튼만 둔다.
          <div role="alert" className="flex flex-col items-center gap-3 px-gutter py-16 text-center">
            <p className="text-body text-text-secondary">선반을 불러오지 못했어요</p>
            <Button variant="secondary" onClick={retry}>
              다시 시도
            </Button>
          </div>
        ) : null}
        {state.status === "ready" && state.data.shelf.items.length === 0 ? (
          <ShelfStart label="제품 추가하기" onPress={() => router.push("/shelf/add")} />
        ) : null}
        {state.status === "ready" && state.data.shelf.items.length > 0 ? (
          <ShelfBody data={state.data} update={update} remove={remove} />
        ) : null}
      </main>
      <ShelfFeatureSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
