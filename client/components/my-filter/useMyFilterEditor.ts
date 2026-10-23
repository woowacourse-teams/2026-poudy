"use client";

import type { IngredientAnalysisItemResponse, MyFilterIngredientResponse } from "@poudy/api/api.zod";
import type { ReturnFocusTarget } from "@poudy/design-system/toast";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { addMyFilterIngredients, fetchMyFilter, removeMyFilterIngredients } from "@/lib/api/my-filter";
import { fetchIngredientAnalysis } from "@/lib/api/shelf";
import { addedMessage, ingredientsNotInFilter, insertedAt, removedMessage } from "@/lib/domain/my-filter";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export type MyFilterStatus = "loading" | "adminSession" | "error" | "ready";

const REMOVE_FAILED = "필터에서 빼지 못했어요. 잠시 후 다시 시도해 주세요.";
const ADD_FAILED = "필터에 넣지 못했어요. 잠시 후 다시 시도해 주세요.";

const without = <T extends { readonly id: number }>(items: readonly T[], id: number): readonly T[] =>
  items.filter((item) => item.id !== id);

/** 지금까지 받은 필터 성분을 id 로 모은다. 필터에서 뺀 성분도 제형 기능을 계속 보여 줄 수 있게 남긴다. */
const remembered = (
  current: ReadonlyMap<number, MyFilterIngredientResponse>,
  items: readonly MyFilterIngredientResponse[],
): ReadonlyMap<number, MyFilterIngredientResponse> =>
  new Map([...current, ...items.map((item) => [item.id, item] as const)]);

/**
 * 나만의 필터 화면(S55j)의 데이터와 동작. 필터에 든 성분과 선반에서 찾았지만 넣지 않은 성분을 함께 읽는다.
 *
 * 성분을 빼면 행을 바로 지우고, 서버가 받으면 되돌리기 토스트를 띄운다(S55j-1). 되돌리면 같은 자리에 다시 넣는다.
 * 뺀 성분이 선반 결과에 있으면 넣지 않은 성분 묶음으로 옮겨 간다(S55j-1). 넣으면 반대로 옮기고 되돌리기를 띄운다(S55j-3).
 *
 * 토스트는 앱 레이아웃의 ToastProvider 가 띄운다. 되돌리기를 누른 행의 버튼은 사라지거나 다른 묶음으로 옮겨 가므로,
 * 행동을 마친 뒤 포커스는 화면이 넘긴 자리(성분 목록)로 돌려준다(A11Y D10).
 */
export const useMyFilterEditor = (returnFocusTo: ReturnFocusTarget) => {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<MyFilterStatus>("loading");
  const [filter, setFilter] = useState<readonly MyFilterIngredientResponse[]>([]);
  const [suspects, setSuspects] = useState<readonly IngredientAnalysisItemResponse[]>([]);
  const [known, setKnown] = useState<ReadonlyMap<number, MyFilterIngredientResponse>>(new Map());

  const candidates = ingredientsNotInFilter(suspects, filter);

  const show = (message: string, onUndo?: () => void) =>
    toast.show({ message, action: onUndo ? { label: "되돌리기", onClick: onUndo, returnFocusTo } : undefined });

  const applyFilter = useCallback((items: readonly MyFilterIngredientResponse[]) => {
    setFilter(items);
    setKnown((current) => remembered(current, items));
  }, []);

  const load = useCallback(
    () =>
      Promise.all([fetchMyFilter(), fetchIngredientAnalysis()]).then(
        ([myFilter, analysis]) => {
          applyFilter(myFilter.items);
          setSuspects(analysis.items);
          setStatus("ready");
        },
        (error: unknown) => {
          if (isAdminSession(error)) return setStatus("adminSession");
          if (!isSignedOut(error)) return setStatus("error");
          rememberLoginReturn();
          router.replace("/login");
        },
      ),
    [router, applyFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setStatus("loading");
    void load();
  };

  const putBack = (item: MyFilterIngredientResponse, index: number) => {
    setFilter((current) => insertedAt(current, index, item));
    addMyFilterIngredients([item.id]).catch(() => {
      setFilter((current) => without(current, item.id));
      show(ADD_FAILED);
    });
  };

  const remove = (item: MyFilterIngredientResponse) => {
    const index = filter.indexOf(item);
    setFilter((current) => without(current, item.id));
    removeMyFilterIngredients([item.id]).then(
      () => show(removedMessage(item.koreanName), () => putBack(item, index)),
      () => {
        setFilter((current) => insertedAt(without(current, item.id), index, item));
        show(REMOVE_FAILED);
      },
    );
  };

  /**
   * 넣은 직후 되돌리면 다시 뺀다. 넣지 않은 성분 묶음의 자리로 돌아간다.
   * 빼지 못하면 서버의 필터를 다시 읽어 맞춘다. 토스트가 든 함수는 넣던 때의 목록을 기억하므로 그 목록으로 되돌리지 않는다.
   */
  const takeBack = (item: IngredientAnalysisItemResponse) => {
    setFilter((current) => without(current, item.id));
    removeMyFilterIngredients([item.id]).catch(() => {
      show(REMOVE_FAILED);
      void fetchMyFilter().then(
        (myFilter) => applyFilter(myFilter.items),
        () => undefined,
      );
    });
  };

  /** 넣은 성분의 제형 기능은 서버만 알아서 필터를 다시 읽는다. */
  const add = (item: IngredientAnalysisItemResponse) =>
    addMyFilterIngredients([item.id])
      .then(fetchMyFilter)
      .then((myFilter) => {
        applyFilter(myFilter.items);
        show(addedMessage(item.koreanName), () => takeBack(item));
      })
      .catch(() => show(ADD_FAILED));

  return { status, filter, candidates, known, retry, remove, add };
};
