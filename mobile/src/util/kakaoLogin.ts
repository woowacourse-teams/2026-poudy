import { initializeKakaoSDK } from '@react-native-kakao/core';
import { isKakaoTalkLoginAvailable, login, logout } from '@react-native-kakao/user';

import type { ProviderTokenOutcome } from '@/types/appLogin';

const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY!;
const CANCELLED_CODE = 'Cancelled';

const isCancelled = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === CANCELLED_CODE;

export const kakaoAccessToken = async (): Promise<ProviderTokenOutcome> => {
  await initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);

  if (!(await isKakaoTalkLoginAvailable())) {
    return { status: 'unavailable' };
  }

  try {
    const token = await login();
    return { status: 'success', token: token.accessToken };
  } catch (error) {
    if (isCancelled(error)) {
      return { status: 'cancelled' };
    }

    throw error;
  }
};

export const signOutKakao = async (): Promise<void> => {
  await initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);
  await logout();
};
