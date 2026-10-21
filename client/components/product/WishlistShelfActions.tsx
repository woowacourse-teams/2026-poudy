"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";

import { ShelfRatingSheet } from "@/components/shelf/ShelfSheets";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { ApiError } from "@/lib/api/client";
import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { saveProduct, unsaveProduct } from "@/lib/api/saved-products";
import { addShelfProduct, removeShelfProduct, updateShelfProduct } from "@/lib/api/shelf";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { withJosa } from "@/lib/domain/format";
import type { RatingDraft } from "@/lib/domain/shelf";
import type { WishlistShelfState } from "@/lib/domain/user-product";
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
};

const Context = createContext<WishlistShelf | null>(null);

const useWishlistShelf = () => {
  const actions = useContext(Context);
  if (!actions) throw new Error("WishlistShelfProvider 안에서 쓴다.");
  return actions;
};

type ProductSummary = {
  readonly id: number;
  readonly name: string;
};

/**
 * 위시리스트와 선반(S39f~S39k). 두 기능은 다르지만 같은 하단 고정 바(WishlistShelfBar)에 나란히 놓여
 * 로그인 안내 시트를 함께 쓰므로, 두 담김 상태와 시트를 여기 한 곳에 둔다.
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
    track(previous ? "product_unsaved" : "product_saved", {
      product_id: product.id,
      save_source: "product_detail",
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
    else if (error instanceof ApiError && error.code === "SHELF_PRODUCT_ALREADY_EXISTS") {
      // 다른 화면에서 이미 담았다. '선반에 저장됨'으로 맞추고 서버 상태를 다시 받는다.
      setState((current) => ({ ...current, shelved: true }));
      refresh();
    } else toast.show({ message: "선반에 저장하지 못했어요. 잠시 뒤 다시 해 주세요." });
  };

  const onShelf = () => {
    if (shelfBusy || refreshing || blocked("shelf")) return;
    if (state.shelved) return setRemoving(true);

    setShelfBusy(true);
    addShelfProduct({ productId: product.id, usageStatus: "IN_USE" }).then((item) => {
      setShelfBusy(false);
      setState((current) => ({ ...current, shelved: true }));
      setRating(item);
      refresh();
      track("shelf_product_added", { product_id: product.id, source: "product_detail", entry_point: entryPoint });
    }, failShelf);
  };

  const saveRating = (draft: RatingDraft) => updateShelfProduct(product.id, draft);

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
      <ShelfRatingSheet item={rating} justAdded onClose={() => setRating(undefined)} onSave={saveRating} />
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
function ShelfButton() {
  const { shelved, shelfBusy, onShelf } = useWishlistShelf();
  const { pressableProps } = usePressable({ busy: shelfBusy });

  if (!shelved) {
    return (
      <Button
        busy={shelfBusy}
        onClick={onShelf}
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

/**
 * 하단 고정 행동 바(S60 ③ · S39h · S39i). 위시리스트(48)와 선반 버튼(나머지 폭)을 8 띄워 화면 끝에 늘 붙여 둔다.
 * 제품 상세에는 하단 내비가 없어(S60 ④) 바가 화면 끝을 차지하고, 아래 여백은 안전 영역을 따른다.
 *
 * 하단 행동 영역(BottomActionBar)과 같은 윗선 · 흰 바탕 · 거터 · 위 12 이지만, 그 부품은 큰 버튼 하나만 받아 여기서 그린다.
 */
export function WishlistShelfBar() {
  return (
    <div className="sticky bottom-0 z-(--z-sticky) mt-auto flex items-center gap-2 border-t border-border bg-background px-gutter pt-3 pb-safe">
      <WishlistButton />
      <ShelfButton />
    </div>
  );
}
