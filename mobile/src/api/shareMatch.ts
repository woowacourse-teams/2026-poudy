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
      throw new Error(`공유 텍스트 식별 요청이 ${response.status} 로 실패했습니다.`);
    }

    const data = await response.json();

    return ShareMatchResponse.parse(data);
  } finally {
    clearTimeout(timer);
  }
};
