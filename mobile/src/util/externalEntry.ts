import type { SharedPayload } from '@/types/externalEntry';
import { getSameOriginUrl, getShareRedirectUrl } from '@/util/entryUrl';

const SIGNATURE_SEPARATOR = '\u0000';

export const getSharedValues = (payloads: readonly SharedPayload[]): string[] =>
  payloads.flatMap((payload) => (payload.value ? [payload.value] : []));

export const getShareSignature = (values: readonly string[]): string => values.join(SIGNATURE_SEPARATOR);

/**
 * 공유받은 값에서 열 주소를 정한다. 이미 Poudy 링크가 들어 있으면 그대로 열고,
 * 아니면 원문을 웹의 경유 경로로 넘긴다. 제품을 찾는 일은 웹이 맡으므로 앱은
 * API 주소를 알지 못한다.
 */
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
