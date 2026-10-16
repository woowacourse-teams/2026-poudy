"use client";

import type { IngredientAnalysisItemResponse, SkinFilterIngredientResponse } from "@poudy/api/api.zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchIngredientAnalysis } from "@/lib/api/shelf";
import { addSkinFilterIngredients, fetchSkinFilter, removeSkinFilterIngredients } from "@/lib/api/skin-filter";
import { ingredientsNotInFilter, insertedAt, removedMessage } from "@/lib/domain/skin-filter";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export type SkinFilterStatus = "loading" | "adminSession" | "error" | "ready";

export type SkinFilterToast = {
  /** 같은 문구가 다시 떠도 4초를 새로 세도록 토스트마다 다른 값을 둔다. */
  readonly id: number;
  readonly message: string;
  readonly onUndo?: () => void;
};

const REMOVE_FAILED = "필터에서 빼지 못했어요. 잠시 뒤 다시 시도해 주세요.";
const ADD_FAILED = "필터에 넣지 못했어요. 잠시 뒤 다시 시도해 주세요.";

const without = <T extends { readonly id: number }>(items: readonly T[], id: number): readonly T[] =>
  items.filter((item) => item.id !== id);

/**
 * 나만의 필터 화면(S55j)의 데이터와 동작. 필터에 든 성분과 선반에서 찾았지만 넣지 않은 성분을 함께 읽는다.
 *
 * 성분을 빼면 행을 바로 지우고, 서버가 받으면 되돌리기 토스트를 띄운다(S55j-1). 되돌리면 같은 자리에 다시 넣는다.
 * 넣지 않은 성분 목록은 처음 읽을 때만 정한다. 이 화면에서 뺀 성분이 그 목록으로 옮겨 가면 되돌리기 전에 행이 튄다.
 */
export const useSkinFilterEditor = () => {
  const router = useRouter();
  const [status, setStatus] = useState<SkinFilterStatus>("loading");
  const [filter, setFilter] = useState<readonly SkinFilterIngredientResponse[]>([]);
  const [candidates, setCandidates] = useState<readonly IngredientAnalysisItemResponse[]>([]);
  const [toast, setToast] = useState<SkinFilterToast>();

  const toastCount = useRef(0);

  const show = useCallback((message: string, onUndo?: () => void) => {
    toastCount.current += 1;
    setToast({ id: toastCount.current, message, onUndo });
  }, []);

  const load = useCallback(
    () =>
      Promise.all([fetchSkinFilter(), fetchIngredientAnalysis()]).then(
        ([skinFilter, analysis]) => {
          setFilter(skinFilter.items);
          setCandidates(ingredientsNotInFilter(analysis.items, skinFilter.items));
          setStatus("ready");
        },
        (error: unknown) => {
          if (isAdminSession(error)) return setStatus("adminSession");
          if (!isSignedOut(error)) return setStatus("error");
          rememberLoginReturn();
          router.replace("/login");
        },
      ),
    [router],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setStatus("loading");
    void load();
  };

  const putBack = (item: SkinFilterIngredientResponse, index: number) => {
    setToast(undefined);
    setFilter((current) => insertedAt(current, index, item));
    addSkinFilterIngredients([item.id]).catch(() => {
      setFilter((current) => without(current, item.id));
      show(ADD_FAILED);
    });
  };

  const remove = (item: SkinFilterIngredientResponse) => {
    const index = filter.indexOf(item);
    setFilter((current) => without(current, item.id));
    removeSkinFilterIngredients([item.id]).then(
      () => show(removedMessage(item.koreanName), () => putBack(item, index)),
      () => {
        setFilter((current) => insertedAt(without(current, item.id), index, item));
        show(REMOVE_FAILED);
      },
    );
  };

  /** 넣은 성분의 제형 기능은 서버만 알아서 필터를 다시 읽는다. */
  const add = (item: IngredientAnalysisItemResponse) =>
    addSkinFilterIngredients([item.id])
      .then(fetchSkinFilter)
      .then((skinFilter) => {
        setFilter(skinFilter.items);
        setCandidates((current) => without(current, item.id));
      })
      .catch(() => show(ADD_FAILED));

  const dismissToast = useCallback(() => setToast(undefined), []);

  return { status, filter, candidates, toast, retry, remove, add, dismissToast };
};
