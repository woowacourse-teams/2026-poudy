"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, useTransition } from "react";

import { useActionsPassed, useObserveActions } from "./ProductScrollState";

import { ShelfRatingSheet, type RatingSheetResult } from "@/components/shelf/ShelfSheets";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { requestShelfLogin } from "@/lib/analytics/shelf";
import { track } from "@/lib/analytics/track";
import { ApiError } from "@/lib/api/client";
import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { saveProduct, unsaveProduct } from "@/lib/api/saved-products";
import { addShelfProduct, removeShelfProduct, updateShelfProduct } from "@/lib/api/shelf";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { withJosa } from "@/lib/domain/format";
import { draftOf, pendingShelfItem, type RatingDraft } from "@/lib/domain/shelf";
import type { WishlistShelfState } from "@/lib/domain/user-product";
import { useShelfEntry } from "@/lib/hooks/useShelfEntry";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type LoginPrompt = "wishlist" | "shelf";

const LOGIN_PROMPT = {
  wishlist: {
    title: "로그인하고 위시리스트에 추가할까요?",
    description: "로그인하면 마음에 드는 제품을 위시리스트에 모아 볼 수 있어요.",
  },
  shelf: {
    title: "로그인하고 선반에 저장할까요?",
    description: "로그인하면 쓰는 제품을 선반에 올리고 잘 맞았는지 기록할 수 있어요.",
  },
} as const satisfies Record<LoginPrompt, { readonly title: string; readonly description: string }>;

type WishlistShelf = {
  readonly wishlisted: boolean;
  readonly wishlistBusy: boolean;
  readonly shelved: boolean;
  readonly shelfBusy: boolean;
  readonly onWishlist: () => void;
  readonly onShelf: () => void;
  readonly status: WishlistShelfState["status"];
  readonly productId: number;
};

const Context = createContext<WishlistShelf | null>(null);

const useWishlistShelf = () => {
  const actions = useContext(Context);
  if (!actions) throw new Error("WishlistShelfProvider 안에서 쓴다.");
  return actions;
};

/**
 * 보이는 선반 버튼. 제품 요약의 버튼 줄과 하단 고정 바에 하나씩 있어, 토스트의 되돌리기 뒤에는 지금 보이는 쪽으로 포커스를 돌려준다.
 */
const shelfAction = () =>
  [...document.querySelectorAll<HTMLElement>("[data-shelf-action]")].find((button) => button.checkVisibility());

/** 다른 화면에서 이미 담은 제품이라 담지 못했는지. */
const isAlreadyShelved = (error: unknown) => error instanceof ApiError && error.code === "SHELF_PRODUCT_ALREADY_EXISTS";

/** 선반에 담을 때 평가 시트에 그릴 제품 정보. 사용감 평가 여부(sensorySupported)로 시트의 단계 수가 정해진다. */
type ProductSummary = ShelfProductResponse["product"];

/**
 * 위시리스트와 선반(S39f~S39k). 두 기능은 다르지만 같은 버튼 줄(제품 요약의 WishlistShelfRow, 하단 고정 바
 * WishlistShelfBar)에 나란히 놓여 로그인 안내 시트를 함께 쓰므로, 두 담김 상태와 시트를 여기 한 곳에 둔다.
 * - 담김 여부는 서버가 그릴 때 받은 회원 상태(initialState)에서 시작하고, 마운트 뒤 다시 조회하지 않는다(#836).
 *   바꾼 뒤에는 화면을 새로 받아(router.refresh) 서버 상태와 맞춘다. 새 상태가 오면 그 값으로 바꾼다.
 * - 로그인 전에는 담지 않고 로그인 안내 시트를 연다(S39f·S39g).
 * - 선반에 담으면 바로 평가 시트를 연다(S39j). 선반 화면의 평가 시트를 그대로 쓴다.
 * - '선반에 저장됨'을 누르면 빼기 확인 시트를 연다(S39k).
 */
export function WishlistShelfProvider({
  product,
  entryPoint,
  initialState,
  children,
}: {
  readonly product: ProductSummary;
  readonly entryPoint: ProductEntryPoint;
  readonly initialState: WishlistShelfState;
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(initialState);
  const [previousInitialState, setPreviousInitialState] = useState(initialState);
  if (previousInitialState !== initialState) {
    setPreviousInitialState(initialState);
    setState(initialState);
  }
  const [refreshing, startRefresh] = useTransition();
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt>();
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [shelfBusy, setShelfBusy] = useState(false);
  const [rating, setRating] = useState<ShelfProductResponse>();
  // 시트에서 이미 담았는지. 첫 저장은 담기이고, 그 뒤 저장(2단계 사용감)은 담은 제품의 평가를 고친다.
  const addedRef = useRef(false);
  const [removing, setRemoving] = useState(false);

  const refresh = () => startRefresh(() => router.refresh());

  /** 회원이 아니면 담지 않는다. 로그인 전에는 안내 시트를, 관리자 세션에는 회원 로그인 안내를 띄운다. */
  const blocked = (prompt: LoginPrompt) => {
    if (state.status === "signedOut") setLoginPrompt(prompt);
    else if (state.status === "adminSession") window.alert(ADMIN_SESSION_MESSAGE);
    return state.status !== "ready";
  };

  /** 요청 중에 세션이 끊기면 회원 상태를 비우고 안내한다. */
  const lostSession = (status: "signedOut" | "adminSession", prompt: LoginPrompt) => {
    setState({ status, wishlisted: false, shelved: false });
    if (status === "signedOut") setLoginPrompt(prompt);
    else window.alert(ADMIN_SESSION_MESSAGE);
  };

  const onWishlist = () => {
    if (wishlistBusy || refreshing || blocked("wishlist")) return;
    const previous = state.wishlisted;
    // 누르는 즉시 바꿔 보이고, 실패하면 되돌린다.
    setState((current) => ({ ...current, wishlisted: !previous }));
    setWishlistBusy(true);
    track(previous ? "wishlist_product_removed" : "wishlist_product_added", {
      product_id: product.id,
      source: "product_detail",
      entry_point: entryPoint,
    });
    void (previous ? unsaveProduct(product.id) : saveProduct(product.id)).then((result) => {
      setWishlistBusy(false);
      if (result === "done") return refresh();
      setState((current) => ({ ...current, wishlisted: previous }));
      if (result === "failed") toast.show({ message: "위시리스트를 바꾸지 못했어요. 잠시 뒤 다시 해 주세요." });
      else lostSession(result, "wishlist");
    });
  };

  const failShelf = (error: unknown) => {
    setShelfBusy(false);
    if (isSignedOut(error)) lostSession("signedOut", "shelf");
    else if (isAdminSession(error)) lostSession("adminSession", "shelf");
    else if (isAlreadyShelved(error)) {
      // 다른 화면에서 이미 담았다. '선반에 저장됨'으로 맞추고 서버 상태를 다시 받는다.
      setState((current) => ({ ...current, shelved: true }));
      refresh();
    } else toast.show({ message: "선반에 저장하지 못했어요. 잠시 뒤 다시 해 주세요." });
  };

  /** [선반에 저장]. 아직 담지 않고 평가 시트만 연다. 시트를 그냥 닫으면 담기를 취소한 것이다(S39j · S52i). */
  const onShelf = () => {
    if (shelfBusy || refreshing || blocked("shelf")) return;
    if (state.shelved) return setRemoving(true);

    addedRef.current = false;
    setRating(pendingShelfItem(product));
  };

  /** 시트의 저장. 처음이면 고른 사용 상태와 평가로 담고, 담은 뒤로는 평가를 고친다. */
  const saveRating = (draft: RatingDraft) => {
    if (addedRef.current) return updateShelfProduct(product.id, draft);
    return addShelfProduct({ productId: product.id, ...draft }).then(
      () => {
        addedRef.current = true;
        setState((current) => ({ ...current, shelved: true }));
        refresh();
        track("shelf_product_added", { product_id: product.id, source: "product_detail", entry_point: entryPoint });
      },
      (error: unknown) => {
        // 세션이 끊겼거나 이미 담긴 제품이면 시트를 닫고 그 상태로 맞춘다. 그 밖의 실패는 시트가 알리고 열어 둔다.
        if (isSignedOut(error) || isAdminSession(error) || isAlreadyShelved(error)) {
          setRating(undefined);
          failShelf(error);
        }
        throw error;
      },
    );
  };

  /** 빼기 되돌리기와 [나중에 할게요] 토스트의 되돌리기가 함께 쓴다. */
  const takeOut = () =>
    removeShelfProduct(product.id).then(() => {
      setState((current) => ({ ...current, shelved: false }));
      refresh();
      track("shelf_product_removed", { product_id: product.id, source: "product_detail", entry_point: entryPoint });
    });

  /** [나중에 할게요]로 담았으면 평가는 나중에 할 수 있다고 알리고 되돌릴 수 있게 한다(S52j). */
  const closeRating = (result: RatingSheetResult) => {
    setRating(undefined);
    if (result !== "later") return;
    toast.show({
      message: "선반에 저장했어요. 평가는 선반에서 언제든 할 수 있어요",
      action: {
        label: "되돌리기",
        onClick: () =>
          void takeOut().catch(() => toast.show({ message: "되돌리지 못했어요. 잠시 뒤 다시 해 주세요." })),
        returnFocusTo: shelfAction,
      },
    });
  };

  const remove = () => {
    setShelfBusy(true);
    removeShelfProduct(product.id).then(
      () => {
        setShelfBusy(false);
        setRemoving(false);
        setState((current) => ({ ...current, shelved: false }));
        refresh();
        toast.show({ message: "선반에서 뺐어요" });
        track("shelf_product_removed", { product_id: product.id, source: "product_detail", entry_point: entryPoint });
      },
      (error: unknown) => {
        setRemoving(false);
        if (isSignedOut(error) || isAdminSession(error)) return failShelf(error);
        setShelfBusy(false);
        toast.show({ message: "선반에서 빼지 못했어요. 잠시 뒤 다시 해 주세요." });
      },
    );
  };

  const prompt = loginPrompt ? LOGIN_PROMPT[loginPrompt] : LOGIN_PROMPT.wishlist;

  return (
    <Context
      value={{
        wishlisted: state.wishlisted,
        wishlistBusy,
        shelved: state.shelved,
        shelfBusy,
        onWishlist,
        onShelf,
        status: state.status,
        productId: product.id,
      }}
    >
      {children}

      <ConfirmSheet
        open={loginPrompt !== undefined}
        title={prompt.title}
        description={prompt.description}
        confirmLabel="로그인"
        onConfirm={() => {
          setLoginPrompt(undefined);
          rememberLoginReturn();
          if (loginPrompt === "shelf") requestShelfLogin();
          router.push("/login");
        }}
        onCancel={() => setLoginPrompt(undefined)}
      />
      <ConfirmSheet
        open={removing}
        title={`${withJosa(product.name, "을/를")} 선반에서 뺄까요?`}
        description="남긴 평가도 지워지고, 안 맞을 수 있는 성분을 다시 계산해요."
        confirmLabel="빼기"
        tone="destructive"
        busy={shelfBusy}
        onConfirm={remove}
        onCancel={() => setRemoving(false)}
      />
      <ShelfRatingSheet item={rating} adding onClose={closeRating} onSave={saveRating} />
    </Context>
  );
}

/**
 * 위시리스트 버튼(48). 선반의 보관함과 헷갈리지 않게 하트로 그린다(S60). 담으면 분홍 면에 채운 하트로 바뀐다(S39h).
 * 담김 여부는 aria-pressed 로 알린다.
 */
function WishlistButton() {
  const { wishlisted, wishlistBusy, onWishlist } = useWishlistShelf();
  const { pressableProps } = usePressable({ busy: wishlistBusy });

  return (
    <button
      type="button"
      aria-label="위시리스트에 담기"
      aria-pressed={wishlisted}
      aria-busy={wishlistBusy || undefined}
      {...pressableProps}
      onClick={onWishlist}
      className={cn(
        "pressable press-scale flex size-12 shrink-0 items-center justify-center rounded-xl border",
        wishlisted
          ? "fb-dim border-brand-border bg-brand-soft text-brand-strong"
          : "fb-secondary border-transparent bg-button-secondary text-text-primary",
      )}
    >
      <Icon name="heart" size={20} filled={wishlisted} />
    </button>
  );
}

/** 선반 버튼. 담기 전에는 주 버튼 '선반에 저장', 담은 뒤에는 분홍 면 '선반에 저장됨'이다(S39i). */
function ShelfButton({
  placement,
  visible = true,
}: {
  readonly placement: "summary" | "sticky";
  readonly visible?: boolean;
}) {
  const { shelved, shelfBusy, onShelf, status, productId } = useWishlistShelf();
  const { ref: entryRef, select: selectEntry } = useShelfEntry({
    source: "product_detail",
    placement,
    intent: "add_product",
    productId,
    authState: status === "ready" ? "signed_in" : status === "signedOut" ? "signed_out" : "admin",
    enabled: !shelved && visible,
  });
  const { pressableProps } = usePressable({ busy: shelfBusy });

  if (!shelved) {
    return (
      <Button
        ref={entryRef}
        data-shelf-action=""
        busy={shelfBusy}
        onClick={() => {
          selectEntry();
          onShelf();
        }}
        trailingIcon={<Icon name="archive" size={16} scalable />}
        className="min-w-0 flex-1"
      >
        선반에 저장
      </Button>
    );
  }

  return (
    <button
      type="button"
      data-shelf-action=""
      aria-busy={shelfBusy || undefined}
      aria-haspopup="dialog"
      {...pressableProps}
      onClick={onShelf}
      className="pressable press-scale fb-dim flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-soft px-4 text-14 leading-none font-semibold whitespace-nowrap text-brand-text"
    >
      선반에 저장됨
      <Icon name="archive" size={16} scalable filled className="text-brand-strong" />
    </button>
  );
}

/** 제품 요약의 버튼 줄(S24). 위시리스트(48)와 선반 버튼(나머지 폭)을 8 띄운다. 이 줄이 지나가면 하단 고정 바가 나타난다. */
export function WishlistShelfRow() {
  const observeActions = useObserveActions();

  return (
    <div ref={observeActions} className="flex w-full items-center gap-2">
      <WishlistButton />
      <ShelfButton placement="summary" />
    </div>
  );
}

/**
 * 하단 고정 행동 바(S24 · S60 ③ · S39h · S39i). 제품 요약의 버튼 줄이 스크롤로 상단 내비 아래로 다 지나가면
 * 화면 끝에서 올라온다. 버튼 줄이 다시 보이면 내려가, 같은 버튼이 두 벌 보이지 않는다.
 * 제품 상세에는 하단 내비가 없어(S60 ④) 바가 화면 끝을 차지하고, 아래 여백은 안전 영역을 따른다.
 *
 * - 하단 행동 영역(BottomActionBar)과 같은 윗선 · 흰 바탕 · 거터 · 위 12 이지만, 그 부품은 큰 버튼 하나만 받아 여기서 그린다.
 * - 숨은 동안에는 inert 로 초점과 보조 기술에서 뺀다.
 * - 바는 화면 끝에 붙어 있으므로 제 높이만큼 아래로 미끄러져 숨는다(base · ease-out). 스크롤 중에 방향을 바꿔도
 *   지금 자리에서 되돌아가도록 transition 으로 둔다. 움직임 줄이기에서는 불투명도만 바꾼다.
 * - data-bottom-bar 는 앱 스크롤 막대(AppScrollIndicator)가 바가 숨어 있을 때도 바 높이만큼 아래를 비우는 데 쓴다.
 */
export function WishlistShelfBar() {
  const shown = useActionsPassed();

  return (
    <div
      data-bottom-bar
      inert={!shown}
      className={cn(
        "sticky bottom-0 z-(--z-sticky) flex items-center gap-2 border-t border-border bg-background px-gutter pt-3 pb-safe transition duration-(--duration-base) ease-(--ease-out)",
        !shown && "motion-safe:translate-y-full motion-reduce:opacity-0",
      )}
    >
      <WishlistButton />
      <ShelfButton placement="sticky" visible={shown} />
    </div>
  );
}
