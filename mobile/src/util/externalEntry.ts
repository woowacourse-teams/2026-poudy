import type { QueryClient } from '@tanstack/react-query';

import { requestShareMatch } from '@/api/shareMatch';
import type { SharedPayload } from '@/types/externalEntry';
import { getMatchedUrl, getSameOriginUrl } from '@/util/entryUrl';

const SIGNATURE_SEPARATOR = '\u0000';
const SHARE_MATCH_KEY = 'share-match';

export const getSharedValues = (payloads: readonly SharedPayload[]): string[] =>
  payloads.flatMap((payload) => (payload.value ? [payload.value] : []));

export const getShareSignature = (values: readonly string[]): string => values.join(SIGNATURE_SEPARATOR);

const findMatchedUrl = async (
  values: readonly string[],
  webBaseUrl: string,
  queryClient: QueryClient,
): Promise<string | null> => {
  const texts = values.map((value) => value.trim());
  const matches = await Promise.all(
    texts.map((text) =>
      queryClient.fetchQuery({
        queryKey: [SHARE_MATCH_KEY, webBaseUrl, text],
        queryFn: () => requestShareMatch(text, webBaseUrl),
      }),
    ),
  );

  return matches.map((match) => getMatchedUrl(match, webBaseUrl)).find((matchedUrl) => matchedUrl !== null) ?? null;
};

export const resolveSharedUrl = async (
  values: readonly string[],
  webBaseUrl: string,
  queryClient: QueryClient,
): Promise<string | null> => {
  const sameOriginUrl = values.map((value) => getSameOriginUrl(value, webBaseUrl)).find((value) => value !== null);
  if (sameOriginUrl) {
    return sameOriginUrl;
  }

  return findMatchedUrl(values, webBaseUrl, queryClient);
};
