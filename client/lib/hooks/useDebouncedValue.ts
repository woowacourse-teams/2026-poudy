"use client";

import { useEffect, useState } from "react";

/** 값이 멈춘 뒤에야 바뀐다. 입력마다 요청이 나가는 것을 막는다. */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
