"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from "react";

import { SaveButton } from "@/components/ui/SaveButton";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { UserProductState } from "@/lib/api/user-product.server";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import { saveProduct, unsaveProduct, type SaveResult } from "@/lib/storage/saved-products";

const SaveContext = createContext<{
  readonly saved: boolean;
  readonly pending: boolean;
  readonly toggle: () => Promise<SaveResult> | null;
} | null>(null);

/** SSR 초기값과 변경 결과를 본문·축약형 버튼이 함께 사용한다. 회원 전체 목록은 조회하지 않는다. */
export function ProductSaveProvider({
  productId,
  initialState,
  children,
}: {
  readonly productId: number;
  readonly initialState: UserProductState;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [previousInitialState, setPreviousInitialState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const pendingRef = useRef(false);
  if (previousInitialState !== initialState) {
    setPreviousInitialState(initialState);
    setState(initialState);
  }

  const signIn = () => {
    rememberLoginReturn();
    router.push("/login");
  };

  const toggle = (): Promise<SaveResult> | null => {
    if (pendingRef.current || refreshing) return null;
    if (state.status === "signedOut") {
      signIn();
      return null;
    }
    if (state.status === "adminSession") {
      window.alert(ADMIN_SESSION_MESSAGE);
      return null;
    }
    const previous = state.wishlisted;
    pendingRef.current = true;
    setPending(true);
    setState({ ...state, wishlisted: !previous });
    return (previous ? unsaveProduct(productId) : saveProduct(productId))
      .then((result) => {
        if (result === "done") startRefresh(() => router.refresh());
        if (result !== "done") setState({ ...state, wishlisted: previous });
        if (result === "signedOut") {
          setState({ ...state, status: "signedOut", wishlisted: false, shelved: false });
          signIn();
        }
        if (result === "adminSession") {
          setState({ ...state, status: "adminSession", wishlisted: false, shelved: false });
          window.alert(ADMIN_SESSION_MESSAGE);
        }
        if (result === "failed") window.alert("저장 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return result;
      })
      .finally(() => {
        pendingRef.current = false;
        setPending(false);
      });
  };

  return (
    <SaveContext value={{ saved: state.wishlisted, pending: pending || refreshing, toggle }}>{children}</SaveContext>
  );
}

type SaveProductButtonProps = {
  readonly productId: number;
  readonly productName: string;
  readonly variant?: "icon" | "wide";
  readonly entryPoint?: ProductEntryPoint;
};

export function SaveProductButton({ productId, productName, variant = "wide", entryPoint }: SaveProductButtonProps) {
  const context = useContext(SaveContext);
  if (!context) throw new Error("제품 저장 버튼은 ProductSaveProvider 안에서 사용해야 합니다.");
  const { saved, pending, toggle } = context;
  const onToggle = () => {
    if (toggle() === null) return;
    track(saved ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "product_detail",
      entry_point: entryPoint,
    });
  };
  return (
    <SaveButton productName={productName} saved={saved} onToggle={onToggle} variant={variant} disabled={pending} />
  );
}
