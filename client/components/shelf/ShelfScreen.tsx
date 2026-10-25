"use client";

import type { ShelfProductResponse, ShelfTab, ShelfUsageStatus } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { TopBar } from "@poudy/design-system/top-bar";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IngredientAnalysisCard } from "./IngredientAnalysisCard";
import { ShelfEmpty, ShelfSignedOut } from "./ShelfIntro";
import { ShelfProductRow } from "./ShelfProductRow";
import { ShelfFeatureSheet, ShelfProductMenu, ShelfRatingSheet, ShelfRemoveConfirm } from "./ShelfSheets";
import { ShelfSkeleton } from "./ShelfSkeleton";
import { ShelfViewFilter } from "./ShelfViewFilter";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { StickyBar } from "@/components/ui/StickyBar";
import { completeShelfIntent, requestShelfLogin } from "@/lib/analytics/shelf";
import { ensureShelfJourney } from "@/lib/analytics/shelf-journey";
import { track } from "@/lib/analytics/track";
import { withJosa } from "@/lib/domain/format";
import { clearedDraft, draftOf, movedDraft, type RatingDraft, shelfSections, USAGE_LABEL } from "@/lib/domain/shelf";
import { type ShelfData, useShelf } from "@/lib/hooks/useShelf";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import { hasSeenShelfFeatureSheet, rememberShelfFeatureSheetSeen } from "@/lib/storage/shelf-feature-sheet";

const RETRY_LATER = "잠시 후 다시 시도해 주세요.";

/** 따옴표로 감싼 이름 뒤에 '으로/로'를 붙인다. 예: '‘사용 완료’로', '‘사용 중’으로'(S53g) */
const quotedWithJosa = (label: string): string => `‘${label}’${withJosa(label, "으로/로").slice(label.length)}`;

type ShelfListProps = {
  readonly data: ShelfData;
  readonly onRate: (item: ShelfProductResponse) => void;
  readonly onOpenMenu: (item: ShelfProductResponse) => void;
  /** 토스트의 되돌리기나 빼기 확인 뒤 포커스를 돌려줄 자리. 누른 행의 버튼이 사라지거나 옮겨 갈 때 쓴다. */
  readonly listRef: React.RefObject<HTMLElement | null>;
};

function ShelfList({ data, onRate, onOpenMenu, listRef }: ShelfListProps) {
  const [tab, setTab] = useState<ShelfTab>("ALL");
  const { items, usages } = data.shelf;

  // 표식과 붙는 줄이 본문의 gap 을 따로 받지 않도록 한 덩어리로 묶는다.
  return (
    <div className="flex flex-col">
      {/*
        큰 제목 상단 내비(64) 아래에 붙는다. 제품 목록만 그 아래로 흐른다.
        명세처럼 본문 위 여백 없이 줄을 둔다. 큰 제목 내비가 아래 여백 12 를 가져, 붙어도 칩이 바에 닿아 보이지 않는다.
        줄 아래 여백 8 과 목록 위 여백 8 이 칩과 목록 사이 16 을 만든다. 카드와 칩 사이 16 은 카드 아래 여백이 맡는다.
        표식은 줄 바로 앞에 있고 줄이 붙는 높이는 64 라, 표식이 64 를 지날 때 붙은 것으로 본다.
      */}
      <StickyBar stuckAt={64} className="sticky top-16 z-(--z-sticky) bg-background px-gutter pb-2">
        <ShelfViewFilter usages={usages} value={tab} onValueChange={setTab} />
      </StickyBar>
      <section ref={listRef} tabIndex={-1} aria-label="선반 제품" className="flex flex-col px-gutter pt-2 outline-none">
        {shelfSections(items, tab).map((section, sectionIndex) => (
          <div key={section.heading ?? tab} className="flex flex-col">
            {section.heading ? (
              <h3 className="pt-5 pb-1 text-caption font-semibold text-text-secondary">{section.heading}</h3>
            ) : null}
            <ul className="flex flex-col">
              {section.items.map((item, index) => (
                // 옮기거나 되돌린 제품은 다른 묶음에 새로 그려진다. 순간 이동처럼 보이지 않게 옅게 나타난다. 자리를 옮기는 움직임은 두지 않는다(M02).
                <li
                  key={item.product.id}
                  className="transition-opacity duration-(--duration-fast) ease-out starting:opacity-0"
                >
                  <ShelfProductRow
                    item={item}
                    linked
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
    </div>
  );
}

type ShelfBodyProps = {
  readonly data: ShelfData;
  readonly update: (productId: number, draft: RatingDraft) => Promise<unknown>;
  readonly remove: (productId: number) => Promise<unknown>;
  readonly restore: (item: ShelfProductResponse) => Promise<unknown>;
};

/** 선반 본문(S52). 안 맞을 수 있는 성분 카드, 보기 필터, 제품 목록과 그 위에 뜨는 시트들. */
function ShelfBody({ data, update, remove, restore }: ShelfBodyProps) {
  const toast = useToast();
  const listRef = useRef<HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<ShelfProductResponse>();
  const [ratingItem, setRatingItem] = useState<ShelfProductResponse>();
  const [removingItem, setRemovingItem] = useState<ShelfProductResponse>();
  const backToList = () => listRef.current;

  /**
   * 메뉴에서 바꾼 결과를 '되돌리기'가 있는 토스트로 알린다(S53g). 되돌리기는 바꾸기 전의 값을 그대로 다시 보낸다.
   * 대상은 토스트를 만들 때 고정한다. 그사이 다른 제품을 바꿔도 이 제품만 되돌린다(F04).
   */
  const announce = (message: string, undo: () => Promise<unknown>) =>
    toast.show({
      message,
      action: {
        label: "되돌리기",
        onClick: () => void undo().catch(() => toast.show({ message: `되돌리지 못했어요. ${RETRY_LATER}` })),
        returnFocusTo: backToList,
      },
    });

  const move = (item: ShelfProductResponse, usageStatus: ShelfUsageStatus) => {
    setMenuItem(undefined);
    update(item.product.id, movedDraft(item, usageStatus)).then(
      () =>
        announce(`${withJosa(item.product.name, "을/를")} ${quotedWithJosa(USAGE_LABEL[usageStatus])} 옮겼어요`, () =>
          update(item.product.id, draftOf(item)),
        ),
      () => toast.show({ message: `옮기지 못했어요. ${RETRY_LATER}` }),
    );
  };
  const clear = (item: ShelfProductResponse) => {
    setMenuItem(undefined);
    update(item.product.id, clearedDraft(item)).then(
      () => announce("평가를 지웠어요", () => update(item.product.id, draftOf(item))),
      () => toast.show({ message: `평가를 지우지 못했어요. ${RETRY_LATER}` }),
    );
  };
  const confirmRemove = (item: ShelfProductResponse) =>
    remove(item.product.id).then(
      () => announce(`${withJosa(item.product.name, "을/를")} 선반에서 뺐어요`, () => restore(item)),
      (error: unknown) => {
        toast.show({ message: `선반에서 빼지 못했어요. ${RETRY_LATER}` });
        throw error;
      },
    );

  return (
    // 보기 필터가 화면 폭 끝까지 바탕을 깔고 붙도록 좌우 여백은 본문이 아니라 각 덩어리가 맡는다.
    // 명세의 선반 본문은 위 여백이 없다(S52). 카드나 보기 필터가 큰 제목 내비 바로 아래에서 시작한다.
    <div className="flex flex-col pb-6">
      {/* 성분 카드는 보기 필터를 바꿔도 늘 위에 둔다. 명세 S52b 는 전체 탭에서만 두지만, 탭과 상관없는 선반 전체의 결과라 남긴다. */}
      {data.analysis.badProductCount > 0 ? (
        <div className="px-gutter pb-4">
          <IngredientAnalysisCard
            analysis={data.analysis}
            filterCount={data.filterCount}
            askSkinType={data.member.skinType === null}
          />
        </div>
      ) : null}

      <ShelfList data={data} onRate={setRatingItem} onOpenMenu={setMenuItem} listRef={listRef} />

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
        onConfirm={confirmRemove}
        returnFocus={backToList}
      />
    </div>
  );
}

/** 선반(/shelf). 로그인 전, 불러오는 중, 오류, 빈 선반, 제품이 있는 선반을 가른다. */
export function ShelfScreen() {
  const router = useRouter();
  const { state, retry, update, remove, restore } = useShelf();
  const [helpOpen, setHelpOpen] = useState(false);
  const viewed = useRef(false);
  const loading = state.status === "loading";
  // 빠르게 끝나는 요청에는 스켈레톤을 띄우지 않는다(F02).
  const showSkeleton = useDelayedFlag(loading);
  const hasItems = state.status === "ready" && state.data.shelf.items.length > 0;
  const signedOut = state.status === "signedOut";

  /*
   * 제품이 담긴 채 선반에 처음 들어오면 기능 설명 시트(S54c)를 한 번 띄운다. 빈 선반(S54b)과 로그인 전(S54a)은
   * 본문이 이미 안내를 맡아 띄우지 않는다(UX-04). 한 번 띄운 뒤에는 상단 도움말 버튼으로만 연다.
   * 띄울지는 제품이 처음 보인 그 렌더에서 정한다. 이미 본 적이 있는지는 기기에 남긴 값으로 안다.
   */
  const [introChecked, setIntroChecked] = useState(false);
  if (hasItems && !introChecked) {
    setIntroChecked(true);
    if (!hasSeenShelfFeatureSheet()) setHelpOpen(true);
  }
  useEffect(() => {
    if (helpOpen) rememberShelfFeatureSheetSeen();
  }, [helpOpen]);

  useEffect(() => {
    if (viewed.current || (state.status !== "ready" && state.status !== "signedOut")) return;
    viewed.current = true;
    ensureShelfJourney();
    const items = state.status === "ready" ? state.data.shelf.items : [];
    track("shelf_viewed", {
      state: state.status === "signedOut" ? "signed_out" : items.length ? "populated" : "empty",
      auth_state: state.status === "signedOut" ? "signed_out" : "signed_in",
      item_count: items.length,
      fit_rated_count: items.filter((item) => item.rating.preference !== null).length,
      sensory_rated_count: items.filter((item) => item.rating.moistureLevel !== null || item.rating.oilLevel !== null)
        .length,
    });
    if (state.status === "ready") completeShelfIntent("view_shelf");
  }, [state]);

  return (
    // 하단 내비가 화면 골격 밖(루트 레이아웃)에 있어 문서 스크롤형으로 두고, 높이는 남은 자리만큼만 채운다.
    <Screen scroll="document" className="min-h-0 flex-1">
      <TopBar
        variant="large"
        title="선반"
        // 제품이 있으면 아래에 보기 필터가 함께 붙어 그쪽이 선을 맡는다.
        edge={!hasItems}
        // 로그인 전에는 도움말과 추가를 숨긴다. 시트 내용이 본문과 겹치고, 담으려면 먼저 로그인해야 한다(S54a).
        actions={
          signedOut
            ? []
            : [
                {
                  icon: "help-circle",
                  label: "선반 사용법",
                  onClick: () => setHelpOpen(true),
                  haspopup: "dialog",
                  expanded: helpOpen,
                },
                { icon: "plus", label: "제품 추가", onClick: () => router.push("/shelf/add") },
              ]
        }
      />
      <ScreenBody>
        <main aria-busy={loading || undefined} className="flex flex-1 flex-col">
          {loading && showSkeleton ? <ShelfSkeleton /> : null}
          {signedOut ? (
            <ShelfSignedOut
              onStart={() => {
                rememberLoginReturn();
                requestShelfLogin("view_shelf");
                router.push("/login");
              }}
            />
          ) : null}
          {state.status === "adminSession" ? <AdminSessionNotice className="px-gutter pt-4" /> : null}
          {state.status === "error" ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="선반을 불러오지 못했어요"
              description={"잠시 후 다시 시도해 주세요.\n문제가 이어지면 잠시 뒤에 다시 들러 주세요."}
              action={
                <Button variant="secondary" onClick={retry}>
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          ) : null}
          {state.status === "ready" && state.data.shelf.items.length === 0 ? (
            <ShelfEmpty onAdd={() => router.push("/shelf/add")} />
          ) : null}
          {state.status === "ready" && state.data.shelf.items.length > 0 ? (
            <ShelfBody data={state.data} update={update} remove={remove} restore={restore} />
          ) : null}
        </main>
      </ScreenBody>
      <ShelfFeatureSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Screen>
  );
}
