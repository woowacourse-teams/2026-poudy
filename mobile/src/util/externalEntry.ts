import { getMatchedUrl, getSameOriginUrl } from '@/util/entryUrl';
import { getShareMatch } from '@/util/shareMatchCache';

const SIGNATURE_SEPARATOR = '\u0000';

interface SharedPayload {
  readonly value?: string | null;
}

export const getSharedValues = (payloads: readonly SharedPayload[]): string[] =>
  payloads.flatMap((payload) => (payload.value ? [payload.value] : []));

export const getShareSignature = (values: readonly string[]): string => values.join(SIGNATURE_SEPARATOR);

const findMatchedUrl = async (values: readonly string[], webBaseUrl: string): Promise<string | null> => {
  const matches = await Promise.all(values.map((value) => getShareMatch(value, webBaseUrl)));

  return matches.map((match) => getMatchedUrl(match, webBaseUrl)).find((matchedUrl) => matchedUrl !== null) ?? null;
};

export const resolveSharedUrl = async (values: readonly string[], webBaseUrl: string): Promise<string | null> => {
  const sameOriginUrl = values.map((value) => getSameOriginUrl(value, webBaseUrl)).find((value) => value !== null);
  if (sameOriginUrl) {
    return sameOriginUrl;
  }

  return findMatchedUrl(values, webBaseUrl);
};
