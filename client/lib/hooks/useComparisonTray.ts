"use client";

import { useSyncExternalStore } from "react";

import {
  getComparisonTrayServerSnapshot,
  getComparisonTraySnapshot,
  subscribeComparisonTray,
  type ComparisonTray,
} from "@/lib/storage/comparison-tray";

/** 비교함의 지금 상태. 서버와 첫 하이드레이션에서는 빈 비교함이다. */
export const useComparisonTray = (): ComparisonTray =>
  useSyncExternalStore(subscribeComparisonTray, getComparisonTraySnapshot, getComparisonTrayServerSnapshot);
