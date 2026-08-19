import { ShareMatchResponse } from '@poudy/api/api.zod';

const PATH = '/api/products/share-matches';
const MAX_TEXT_LENGTH = 500;
const TIMEOUT_MS = 8000;

export const requestShareMatch = async (text: string, baseUrl: string): Promise<ShareMatchResponse | null> => {
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
    return null;
  }

  const url = new URL(PATH, baseUrl);
  url.searchParams.set('text', text);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      return null;
    }

    return ShareMatchResponse.parse(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
