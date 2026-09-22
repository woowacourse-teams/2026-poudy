"use client";

import type { DiscoveryContext, DiscoveryMethod, DiscoveryOrigin, ProductEntryPoint } from "./events";

const STORAGE_KEY = "poudy.discovery.v1";
const MAX_AGE_MS = 30 * 60 * 1000;

type StoredDiscovery = DiscoveryContext & { readonly started_at: number };

const storage = (): Storage | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const parse = (raw: string | null): StoredDiscovery | undefined => {
  if (!raw) return undefined;

  try {
    const value = JSON.parse(raw) as Partial<StoredDiscovery>;
    if (
      typeof value.discovery_id !== "string" ||
      (value.discovery_method !== "search" && value.discovery_method !== "category") ||
      (value.origin_surface !== "home" && value.origin_surface !== "search" && value.origin_surface !== "category") ||
      typeof value.started_at !== "number"
    ) {
      return undefined;
    }

    return value as StoredDiscovery;
  } catch {
    return undefined;
  }
};

/** 한 번의 탐색 시작부터 상세·보관까지 이어 붙일 임의 ID를 만든다. */
export const beginDiscovery = (discoveryMethod: DiscoveryMethod, originSurface: DiscoveryOrigin): DiscoveryContext => {
  const context: StoredDiscovery = {
    discovery_id: createId(),
    discovery_method: discoveryMethod,
    origin_surface: originSurface,
    started_at: Date.now(),
  };

  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // 저장소가 막혀도 분석 때문에 제품 동작을 막지 않는다. 후속 이벤트 연결만 생략한다.
  }
  return context;
};

/** 오래됐거나 다른 경로의 탐색은 현재 행동에 붙이지 않는다. */
export const readDiscovery = (expectedMethod?: DiscoveryMethod): DiscoveryContext | undefined => {
  const sessionStorage = storage();
  if (!sessionStorage) return undefined;

  let stored: StoredDiscovery | undefined;
  try {
    stored = parse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return undefined;
  }
  if (!stored || Date.now() - stored.started_at > MAX_AGE_MS || stored.started_at > Date.now()) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 읽을 수만 있는 저장소라면 낡은 값을 다음에도 무시하면 된다.
    }
    return undefined;
  }
  if (expectedMethod && stored.discovery_method !== expectedMethod) return undefined;

  const { discovery_id, discovery_method, origin_surface } = stored;
  return { discovery_id, discovery_method, origin_surface };
};

/** 상세 진입 경로를 탐색 경로와 맞춰, 다른 탭의 낡은 탐색 ID가 섞이지 않게 한다. */
export const discoveryMethodOf = (entryPoint: ProductEntryPoint): DiscoveryMethod | undefined => {
  if (["search_results", "suggestion", "recent_search"].includes(entryPoint)) return "search";
  if (["home_category", "category"].includes(entryPoint)) return "category";
  return undefined;
};
