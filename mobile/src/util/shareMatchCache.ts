import type { ShareMatchResponse } from '@poudy/api/api.zod';

import { requestShareMatch } from '@/api/shareMatch';
import { createTtlCache } from '@/util/ttlCache';

const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 50;

const cache = createTtlCache<ShareMatchResponse>({ ttlMs: TTL_MS, maxEntries: MAX_ENTRIES });

export const getShareMatch = async (text: string, baseUrl: string): Promise<ShareMatchResponse | null> => {
  const shared = text.trim();

  const cached = cache.get(shared);
  if (cached) {
    return cached;
  }

  const match = await requestShareMatch(shared, baseUrl);
  if (match) {
    cache.set(shared, match);
  }

  return match;
};
