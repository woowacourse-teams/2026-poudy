"use client";

import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useToast } from "@poudy/design-system/toast";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { ResultCount } from "@/components/product/ResultCount";
import { ProductCard } from "@/components/ui/ProductCard";
import { track } from "@/lib/analytics/track";
import { restoreProduct, type SaveResult, unsaveProduct } from "@/lib/api/saved-products";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/** 이 화면에서 다시 담는 것은 되돌리기뿐이라, 담았던 시각 그대로 원래 자리로 되살린다. */
const sendSaveChange = (productId: number, removed: boolean): Promise<SaveResult> => {
  if (removed) return unsaveProduct(productId);
  return restoreProduct(productId);
};

const imageLoadingOf = (index: number): "eager" | "lazy" => {
  if (index === 0) return "eager";
  return "lazy";
};

/** 위시리스트 목록의 마지막 자리(APP · 위시리스트 더 둘러보기 행). 제품 카드와 같은 격자로 이어진다. */
function BrowseMoreRow({ ref }: { readonly ref?: React.Ref<HTMLAnchorElement> }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      ref={ref}
      href="/search/products"
      {...pressableProps}
      className="pressable fb-surface flex items-center gap-3 border-t border-border py-3"
    >
      <span className="flex size-20 shrink-0 items-center justify-center">
        <span className="flex size-15 items-center justify-center rounded-lg border border-border-strong bg-background">
          <Icon name="search" size={20} className="text-text-secondary" />
        </span>
      </span>
      <span className="min-w-0 flex-1 text-body leading-snug font-semibold text-text-primary">
        다른 제품도 둘러보기
      </span>
      <span className="flex size-11 shrink-0 items-center justify-center">
        <Icon name="chevron-right" size={20} scalable className="text-text-muted" />
      </span>
    </Link>
  );
}

function SignInNotice() {
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col px-gutter">
      <EmptyState
        icon={<Icon name="heart" size={28} />}
        title="로그인하면 제품을 저장할 수 있어요"
        description="저장한 제품은 다른 기기에서도 그대로 볼 수 있어요."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              rememberLoginReturn();
              router.push("/login");
            }}
          >
            로그인하기
          </Button>
        }
        className="flex-1"
      />
    </main>
  );
}

/** 처음 불러오는 동안 개수 줄과 제품 행의 자리(FEEDBACK F02). 높이를 실제와 맞춰 내용이 와도 아래가 밀리지 않는다. */
function SavedSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col px-gutter">
      <div className="flex h-11 items-center">
        <Skeleton shape="line" size={13} className="w-12" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex gap-3 py-4">
            <Skeleton shape="box" className="size-20" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton shape="line" size={12} className="w-16" />
              <Skeleton shape="line" size={16} className="w-3/4" />
              <Skeleton shape="line" size={13} className="w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 위시리스트(S55d). 회원 위시리스트 API 에서 최근 담은 순으로 제품을 한 번에 받는다. */
export function SavedScreen({
  empty,
}: {
  /** 위시리스트가 비었을 때 그릴 빈 상태(S55d-1, FEEDBACK F03). 경로 옆 `app/my-page/wishlist/empty.tsx` 의 것을 넘긴다. */
  readonly empty: React.ReactNode;
}) {
  const router = useRouter();
  const wishlist = useSavedProducts();
  const signedOut = wishlist.status === "signedOut";
  const adminSession = wishlist.status === "adminSession";
  const [removedIds, setRemovedIds] = useState<readonly number[]>([]);
  const pendingChanges = useRef(new Map<number, Promise<SaveResult>>());
  /** 서버가 마지막으로 받아들인 저장 상태. 요청이 실패하면 이 상태로 되돌린다. 받은 목록에 든 제품은 저장된 것에서 시작한다. */
  const confirmedRemoved = useRef(new Map<number, boolean>());
  const showSkeleton = useDelayedFlag(wishlist.status === "loading");
  const toast = useToast();
  const listRef = useRef<HTMLUListElement>(null);
  const browseMoreRef = useRef<HTMLAnchorElement>(null);
  // 제품마다 띄워 둔 되돌리기 토스트를 닫는 함수. 빼기가 실패하면 그 토스트를 닫고 실패를 알린다.
  const closeUndo = useRef(new Map<number, () => void>());

  const markRemoved = (productId: number, removed: boolean) => {
    setRemovedIds((previous) => {
      const others = previous.filter((id) => id !== productId);
      if (removed) return [...others, productId];
      return others;
    });
  };

  const signIn = () => {
    rememberLoginReturn();
    router.push("/login");
  };

  const notifyFailure = (productId: number, removed: boolean) => {
    // 토스트가 쌓이므로, 띄워 둔 되돌리기 토스트를 닫고 실패를 알린다(FEEDBACK F01).
    closeUndo.current.get(productId)?.();
    closeUndo.current.delete(productId);
    toast.show({ message: removed ? "위시리스트에서 빼지 못했어요" : "위시리스트에 다시 담지 못했어요" });
  };

  const changeSaved = (productId: number, removed: boolean) => {
    const request = sendSaveChange(productId, removed);
    pendingChanges.current.set(productId, request);
    markRemoved(productId, removed);
    track(removed ? "wishlist_product_removed" : "wishlist_product_added", { product_id: productId, source: "saved" });
    request.then((result) => {
      if (result === "done") confirmedRemoved.current.set(productId, removed);
      if (result === "signedOut") signIn();
      if (result === "adminSession") window.alert(ADMIN_SESSION_MESSAGE);
      if (pendingChanges.current.get(productId) !== request) return;
      pendingChanges.current.delete(productId);
      if (result === "done") return;
      markRemoved(productId, confirmedRemoved.current.get(productId) ?? false);
      if (result === "failed") notifyFailure(productId, removed);
    });
  };

  /* 그 제품 카드의 하트. 되돌린 뒤 포커스를 돌려줄 곳이다. */
  const heartOf = (productId: number) =>
    listRef.current?.querySelector<HTMLElement>(`[data-saved-product="${productId}"] button[aria-pressed]`);

  /**
   * 하트를 누르면 카드를 목록에서 바로 빼고, 토스트로 되돌리기를 띄운다(S55d-2, 나만의 필터 S55j-1 과 같은 방식).
   * 누른 하트가 사라지므로 포커스는 다음 카드의 하트로, 마지막 카드였으면 [다른 제품도 둘러보기]로 옮긴다(A11Y D10).
   */
  const removeSaved = (productId: number) => {
    const next = shown[shown.findIndex((product) => product.id === productId) + 1]?.id;
    flushSync(() => changeSaved(productId, true));
    (next === undefined ? browseMoreRef.current : heartOf(next))?.focus();
    const close = toast.show({
      message: "위시리스트에서 뺐어요",
      action: {
        label: "되돌리기",
        // 카드를 먼저 되돌려 그려야 그 하트로 포커스를 돌려줄 수 있다.
        onClick: () => flushSync(() => changeSaved(productId, false)),
        returnFocusTo: () => heartOf(productId) ?? browseMoreRef.current,
      },
    });
    closeUndo.current.set(productId, close);
  };

  const shown = wishlist.items.filter((product) => !removedIds.includes(product.id));
  const savedCount = wishlist.items.length - removedIds.length;

  if (signedOut) return <SignInNotice />;

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-14 text-center" />
    );
  }

  if (wishlist.status === "loading") {
    return (
      <main aria-busy="true" className="flex flex-1 flex-col pb-6">
        {showSkeleton ? <SavedSkeleton /> : null}
      </main>
    );
  }

  if (wishlist.status === "error") {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="alert-circle" size={28} />}
          title="저장한 제품을 불러오지 못했어요"
          description={"잠시 후 다시 시도해 주세요.\n저장한 목록은 그대로 있어요."}
          action={
            <Button variant="secondary" onClick={wishlist.retry}>
              다시 시도
            </Button>
          }
          className="flex-1"
        />
      </main>
    );
  }

  if (wishlist.items.length === 0) {
    return <main className="flex flex-1 flex-col pb-6">{empty}</main>;
  }

  return (
    <main className="flex flex-1 flex-col pb-6">
      {/* 위시리스트 안 검색과 정렬은 두지 않는다. 최근 담은 순으로만 보여 준다. */}
      {savedCount > 0 && (
        <div className="flex h-11 items-center px-gutter">
          <ResultCount total={savedCount} />
        </div>
      )}

      <div className="px-gutter">
        {/* 마지막 카드 아래 선은 [다른 제품도 둘러보기]의 윗선이 맡는다. 두 선이 겹쳐 굵어지지 않게 한다. */}
        <ul ref={listRef} data-private className="[&>li:last-child>article]:border-b-0">
          {shown.map((product, index) => (
            <li key={product.id} data-saved-product={product.id}>
              <ProductCard
                product={product}
                save={{ saved: true, onToggle: removeSaved }}
                entryPoint="saved"
                imageLoading={imageLoadingOf(index)}
              />
            </li>
          ))}
        </ul>

        <BrowseMoreRow ref={browseMoreRef} />
      </div>
    </main>
  );
}
