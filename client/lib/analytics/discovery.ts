"use client";

import type { DiscoveryContext, DiscoveryMethod, DiscoveryOrigin, ProductEntryPoint } from "./events";

const STORAGE_KEY = "poudy.discovery.v1";
const MAX_AGE_MS = 30 * 60 * 1000;

type StoredDiscovery = DiscoveryContext & {
  readonly started_at: number;
  readonly awaiting_search_start?: boolean;
};

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
      !["search", "category", "popular_keyword", "skin_type", "home_ranking"].includes(value.discovery_method ?? "") ||
      (value.origin_surface !== "home" && value.origin_surface !== "search" && value.origin_surface !== "category") ||
      typeof value.started_at !== "number" ||
      (value.awaiting_search_start !== undefined && typeof value.awaiting_search_start !== "boolean")
    ) {
      return undefined;
    }

    return value as StoredDiscovery;
  } catch {
    return undefined;
  }
};

/** 한 번의 탐색 시작부터 상세·보관까지 이어 붙일 임의 ID를 만든다. */
const saveDiscovery = (
  discoveryMethod: DiscoveryMethod,
  originSurface: DiscoveryOrigin,
  awaitingSearchStart = false,
): DiscoveryContext => {
  const context: StoredDiscovery = {
    discovery_id: createId(),
    discovery_method: discoveryMethod,
    origin_surface: originSurface,
    started_at: Date.now(),
    ...(awaitingSearchStart ? { awaiting_search_start: true } : {}),
  };

  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // 저장소가 막혀도 분석 때문에 제품 동작을 막지 않는다. 후속 이벤트 연결만 생략한다.
  }
  return context;
};

export const beginDiscovery = (discoveryMethod: DiscoveryMethod, originSurface: DiscoveryOrigin): DiscoveryContext =>
  saveDiscovery(discoveryMethod, originSurface);

/** 홈 검색 버튼과 검색 화면의 첫 입력을 같은 경로로 연결하기 위해 대기 상태로 둔다. */
export const beginHomeSearchDiscovery = (): DiscoveryContext => saveDiscovery("search", "home", true);

const validStoredDiscovery = (): StoredDiscovery | undefined => {
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
  return stored;
};

/** 홈에서 막 들어온 검색만 이어 받고, 이미 시작한 검색이면 새 탐색 ID를 만든다. */
export const startSearchDiscovery = (): DiscoveryContext => {
  const stored = validStoredDiscovery();
  if (stored?.discovery_method !== "search" || stored.origin_surface !== "home" || !stored.awaiting_search_start) {
    return beginDiscovery("search", "search");
  }

  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify({ ...stored, awaiting_search_start: false }));
  } catch {
    // 저장 실패 시에도 이번 이벤트에는 홈에서 시작한 경로를 붙인다.
  }
  const { discovery_id, discovery_method, origin_surface } = stored;
  return { discovery_id, discovery_method, origin_surface };
};

/** 오래됐거나 다른 경로의 탐색은 현재 행동에 붙이지 않는다. */
export const readDiscovery = (expectedMethod?: DiscoveryMethod): DiscoveryContext | undefined => {
  const stored = validStoredDiscovery();
  if (!stored) return undefined;
  if (expectedMethod && stored.discovery_method !== expectedMethod) return undefined;

  const { discovery_id, discovery_method, origin_surface } = stored;
  return { discovery_id, discovery_method, origin_surface };
};

/** 상세 진입 경로를 탐색 경로와 맞춰, 다른 탭의 낡은 탐색 ID가 섞이지 않게 한다. */
export const discoveryMethodOf = (entryPoint: ProductEntryPoint): DiscoveryMethod | undefined => {
  if (["search_results", "suggestion", "recent_search"].includes(entryPoint)) return "search";
  if (entryPoint === "category") return "category";
  if (entryPoint === "popular_keyword") return "popular_keyword";
  if (entryPoint === "skin_type") return "skin_type";
  if (["home", "home_category", "home_ranking"].includes(entryPoint)) return "home_ranking";
  return undefined;
};
