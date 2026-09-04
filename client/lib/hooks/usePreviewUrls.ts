"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 미리보기 주소를 만들고 되돌려준다. 문서를 떠날 때까지 두면 그만큼 메모리를 붙잡는다.
 */
export function usePreviewUrls() {
  const urlsRef = useRef<string[]>([]);

  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const create = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    urlsRef.current.push(url);

    return url;
  }, []);

  const revoke = useCallback((url: string) => {
    URL.revokeObjectURL(url);
    urlsRef.current = urlsRef.current.filter((kept) => kept !== url);
  }, []);

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  }, []);

  return { create, revoke, revokeAll };
}
