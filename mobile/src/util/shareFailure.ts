import type { ShareFailure, ShareFailureMessage } from '@/types/externalEntry';

const MESSAGES: Record<ShareFailure, ShareFailureMessage> = {
  network: {
    title: '연결하지 못했어요',
    body: '네트워크 상태를 확인한 뒤 다시 공유해 주세요.',
  },
  timeout: {
    title: '응답이 너무 늦어요',
    body: '네트워크가 불안정하거나 서버가 응답하지 않아요. 잠시 후 다시 공유해 주세요.',
  },
  server: {
    title: '제품을 확인하지 못했어요',
    body: '서버에서 정보를 받지 못했어요. 잠시 후 다시 공유해 주세요.',
  },
  unknown: {
    title: '공유를 처리하지 못했어요',
    body: '잠시 후 다시 공유해 주세요.',
  },
};

/** 타임아웃은 `DOMException` 으로 올 수 있어 `Error` 여부보다 이름을 먼저 본다. */
const nameOf = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return null;
  }

  if (typeof error.name !== 'string') {
    return null;
  }

  return error.name;
};

/** 통신이 끊긴 것과 응답이 잘못된 것은 사용자가 할 수 있는 일이 다르다. */
export const shareFailureOf = (error: unknown): ShareFailure => {
  if (nameOf(error) === 'AbortError') {
    return 'timeout';
  }

  if (error instanceof TypeError) {
    return 'network';
  }

  if (error instanceof Error) {
    return 'server';
  }

  return 'unknown';
};

export const shareFailureMessageOf = (reason: ShareFailure): ShareFailureMessage => MESSAGES[reason];
