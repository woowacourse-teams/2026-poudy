import type { SharedPayload } from '@/types/externalEntry';
import { getSameOriginUrl, getShareRedirectUrl } from '@/util/entryUrl';

const SIGNATURE_SEPARATOR = '\u0000';

export const getSharedValues = (payloads: readonly SharedPayload[]): string[] =>
  payloads.flatMap((payload) => (payload.value ? [payload.value] : []));

export const getShareSignature = (values: readonly string[]): string => values.join(SIGNATURE_SEPARATOR);

export const resolveSharedUrl = (values: readonly string[], serviceBaseUrl: string): string | null => {
  const sameOriginUrl = values.map((value) => getSameOriginUrl(value, serviceBaseUrl)).find((value) => value !== null);
  if (sameOriginUrl) {
    return sameOriginUrl;
  }

  const text = values.map((value) => value.trim()).find((value) => value.length > 0);
  if (!text) {
    return null;
  }

  return getShareRedirectUrl(text, serviceBaseUrl);
};
