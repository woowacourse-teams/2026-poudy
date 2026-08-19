import { getMatchedUrl, getSameOriginUrl } from '@/util/entryUrl';
import { getShareMatch } from '@/util/shareMatchCache';

const SIGNATURE_SEPARATOR = '\u0000';

interface SharedPayload {
  readonly value?: string | null;
}

export const getSharedValues = (payloads: readonly SharedPayload[]): string[] =>
  payloads.flatMap((payload) => (payload.value ? [payload.value] : []));

export const getShareSignature = (values: readonly string[]): string => values.join(SIGNATURE_SEPARATOR);

export const resolveSharedUrl = async (values: readonly string[], webBaseUrl: string): Promise<string | null> => {
  const sameOriginUrl = values.map((value) => getSameOriginUrl(value, webBaseUrl)).find((value) => value !== null);
  if (sameOriginUrl) {
    return sameOriginUrl;
  }

  for (const value of values) {
    const matchedUrl = getMatchedUrl(await getShareMatch(value, webBaseUrl), webBaseUrl);
    if (matchedUrl) {
      return matchedUrl;
    }
  }

  return null;
};
