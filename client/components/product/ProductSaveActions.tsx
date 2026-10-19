"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { useSavePassed } from "./ProductScrollState";

import { ShelfRatingSheet } from "@/components/shelf/ShelfSheets";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { ApiError } from "@/lib/api/client";
import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { addShelfProduct, fetchShelf, removeShelfProduct, updateShelfProduct } from "@/lib/api/shelf";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { withJosa } from "@/lib/domain/format";
import type { RatingDraft } from "@/lib/domain/shelf";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type ShelfState =
  | { readonly status: "loading" | "signedOut" | "adminSession" | "error" }
  | { readonly status: "ready"; readonly item: ShelfProductResponse | undefined };

/** 이 제품이 선반에 있는지. 선반 전체를 받아 이 제품만 찾는다. */
const useProductShelf = (productId: number) => {
  const [state, setState] = useState<ShelfState>({ status: "loading" });

  const load = () =>
    fetchShelf().then(
      (shelf) => setState({ status: "ready", item: shelf.items.find((item) => item.product.id === productId) }),
      (error: unknown) => {
        if (isSignedOut(error)) setState({ status: "signedOut" });
        else if (isAdminSession(error)) setState({ status: "adminSession" });
        else setState({ status: "error" });
      },
    );

  // 선반은 서버에만 있는 회원 정보라, 화면이 붙은 뒤 한 번 받아 온다. 서버 렌더링 결과는 모든 방문자가 함께 쓴다.
  useEffect(() => {
    void load();
    // 제품이 바뀔 때만 다시 받는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return { state, setState, load };
};

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

type SaveActions = {
  readonly wishlisted: boolean;
  readonly wishlistBusy: boolean;
  readonly shelved: boolean;
  readonly shelfBusy: boolean;
  readonly onWishlist: () => void;
  readonly onShelf: () => void;
};

const Context = createContext<SaveActions | null>(null);

const useSaveActions = () => {
  const actions = useContext(Context);
  if (!actions) throw new Error("ProductSaveProvider 안에서 쓴다.");
  return actions;
};

type ProductSummary = {
  readonly id: number;
  readonly name: string;
};

/**
 * 제품 저장(S39f~S39k). 위시리스트에 담기와 선반에 저장을 함께 든다.
 *
 * 같은 버튼 묶음이 본문(ProductSaveButtons)과 하단 고정 바(ProductSaveBar) 두 곳에 놓이므로, 상태와 시트는 여기 한 곳에 둔다.
 * - 로그인 전에는 담지 않고 로그인 안내 시트를 연다(S39f·S39g).
 * - 선반에 담으면 바로 평가 시트를 연다(S39j). 선반 화면의 평가 시트를 그대로 쓴다.
 * - '선반에 저장됨'을 누르면 빼기 확인 시트를 연다(S39k).
 */
export function ProductSaveProvider({
  product,
  entryPoint,
  children,
}: {
  readonly product: ProductSummary;
  readonly entryPoint: ProductEntryPoint;
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const wishlist = useSavedProducts();
  const shelf = useProductShelf(product.id);
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt>();
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [shelfBusy, setShelfBusy] = useState(false);
  const [rating, setRating] = useState<ShelfProductResponse>();
  const [removing, setRemoving] = useState(false);

  const wishlisted = wishlist.isSaved(product.id);
  const shelfItem = shelf.state.status === "ready" ? shelf.state.item : undefined;

  const onWishlist = () => {
    if (wishlist.status === "signedOut") return setLoginPrompt("wishlist");
    const request = wishlist.toggle(product.id);
    if (request === null) return;
    track(wishlisted ? "product_unsaved" : "product_saved", {
      product_id: product.id,
      save_source: "product_detail",
      entry_point: entryPoint,
    });
    setWishlistBusy(true);
    void request.finally(() => setWishlistBusy(false));
  };

  const failShelf = (error: unknown) => {
    setShelfBusy(false);
    if (isSignedOut(error)) {
      shelf.setState({ status: "signedOut" });
      setLoginPrompt("shelf");
    } else if (isAdminSession(error)) {
      window.alert(ADMIN_SESSION_MESSAGE);
    } else if (error instanceof ApiError && error.code === "SHELF_PRODUCT_ALREADY_EXISTS") {
      // 다른 화면에서 이미 담았다. 선반을 다시 읽어 '선반에 저장됨'으로 맞춘다.
      void shelf.load();
    } else {
      toast.show({ message: "선반에 저장하지 못했어요. 잠시 뒤 다시 해 주세요." });
    }
  };

  const onShelf = () => {
    if (shelfBusy || shelf.state.status === "loading") return;
    if (shelf.state.status === "signedOut") return setLoginPrompt("shelf");
    if (shelf.state.status === "adminSession") return window.alert(ADMIN_SESSION_MESSAGE);
    if (shelfItem) return setRemoving(true);

    setShelfBusy(true);
    addShelfProduct({ productId: product.id, usageStatus: "IN_USE" }).then((item) => {
      setShelfBusy(false);
      shelf.setState({ status: "ready", item });
      setRating(item);
      track("shelf_product_added", { product_id: product.id, source: "product_detail", entry_point: entryPoint });
    }, failShelf);
  };

  const saveRating = (draft: RatingDraft) =>
    updateShelfProduct(product.id, draft).then((item) => shelf.setState({ status: "ready", item }));

  const remove = () => {
    setShelfBusy(true);
    removeShelfProduct(product.id).then(
      () => {
        setShelfBusy(false);
        setRemoving(false);
        shelf.setState({ status: "ready", item: undefined });
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
    <Context value={{ wishlisted, wishlistBusy, shelved: shelfItem !== undefined, shelfBusy, onWishlist, onShelf }}>
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

/** 위시리스트 버튼(48). 담으면 분홍 면에 채운 북마크로 바뀐다(S39h). 담김 여부는 aria-pressed 로 알린다. */
function WishlistButton() {
  const { wishlisted, wishlistBusy, onWishlist } = useSaveActions();
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
      <Icon name="bookmark" size={20} filled={wishlisted} />
    </button>
  );
}

/** 선반 버튼. 담기 전에는 주 버튼 '선반에 저장', 담은 뒤에는 분홍 면 '선반에 저장됨'이다(S39i). */
function ShelfButton() {
  const { shelved, shelfBusy, onShelf } = useSaveActions();
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

/** 본문의 저장 버튼 묶음. 위시리스트(48)와 선반 버튼(나머지 폭)을 8 띄워 둔다. */
export function ProductSaveButtons() {
  return (
    <div className="flex items-center gap-2">
      <WishlistButton />
      <ShelfButton />
    </div>
  );
}

/**
 * 하단 고정 행동 바(S24-1). 본문의 저장 버튼 묶음이 상단 내비 아래로 지나가면 하단 내비 바로 위에 나타난다.
 *
 * 하단 행동 영역(BottomActionBar)과 같은 윗선·흰 바탕·거터·위 12 이지만, 그 부품은 큰 버튼 하나만 받아 여기서 그린다.
 * 숨은 동안에는 아래로 내려가 있고 포커스를 받지 않는다(inert). 나타날 때는 아래에서 올라오고(base · ease-out),
 * 움직임 줄이기에서는 불투명도만 바뀐다. 자리는 늘 차지해 나타나고 사라질 때 본문이 밀리지 않는다.
 */
export function ProductSaveBar() {
  const shown = useSavePassed();

  return (
    <div
      inert={!shown}
      data-shown={shown ? "" : undefined}
      className="sticky bottom-(--bottom-navigation-height) z-(--z-sticky) border-t border-border bg-background px-gutter py-3 transition duration-(--duration-base) ease-(--ease-out) not-data-shown:pointer-events-none not-data-shown:opacity-0 motion-safe:not-data-shown:translate-y-full"
    >
      <ProductSaveButtons />
    </div>
  );
}
