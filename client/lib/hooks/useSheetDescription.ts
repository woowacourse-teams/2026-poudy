"use client";

import { useEffect, useState } from "react";

export type SheetDescription<T> =
  { readonly status: "loading" } | { readonly status: "loaded"; readonly value: T } | { readonly status: "failed" };

/**
 * 시트를 연 뒤에 설명처럼 제품 응답에 없는 것을 받아 온다.
 *
 * 제품 상세는 성분마다 설명을 담아 오지 않는다. 성분이 서른 개를 넘는 제품도 있어
 * 보지도 않을 설명을 모두 받으면 첫 화면이 무거워진다. 그래서 고른 것만 그때 받는다.
 * `key` 가 바뀌면 앞의 요청 결과는 버린다. 빠르게 다른 칩을 눌러도 앞 성분의 설명이 끼어들지 않는다.
 */
export const useSheetDescription = <T>(key: string | undefined, load: () => Promise<T>): SheetDescription<T> => {
  const [result, setResult] = useState<{ readonly key: string; readonly description: SheetDescription<T> }>();

  useEffect(() => {
    if (key === undefined) return;

    let current = true;
    load()
      .then((value) => {
        if (current) setResult({ key, description: { status: "loaded", value } });
      })
      .catch(() => {
        if (current) setResult({ key, description: { status: "failed" } });
      });

    return () => {
      current = false;
    };
    // 같은 대상이면 다시 받지 않는다. load 는 렌더마다 새로 만들어지므로 key 로만 가른다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (result === undefined || result.key !== key) return { status: "loading" };
  return result.description;
};
