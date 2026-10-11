import { Platform } from 'react-native';

import type { AppLoginProvider, AppLoginResult, ProviderTokenOutcome } from '@/types/appLogin';
import { googleIdToken } from '@/util/googleLogin';
import { kakaoAccessToken, signOutKakao } from '@/util/kakaoLogin';

const LOGIN_MESSAGE_PREFIX = 'poudy:login:';
const LOGIN_RESULT_EVENT = 'poudy:login';

export const LOGOUT_MESSAGE = 'poudy:logout';

const TOKEN_READERS: Record<AppLoginProvider, () => Promise<ProviderTokenOutcome>> = {
  kakao: kakaoAccessToken,
  google: googleIdToken,
};

const appLoginProvidersOf = (platform: typeof Platform.OS): readonly AppLoginProvider[] => {
  if (platform === 'android') {
    return ['kakao', 'google'];
  }

  return [];
};

export const APP_LOGIN_PROVIDERS = appLoginProvidersOf(Platform.OS);

export const loginProviderOf = (message: string): AppLoginProvider | null => {
  if (!message.startsWith(LOGIN_MESSAGE_PREFIX)) {
    return null;
  }

  const requested = message.slice(LOGIN_MESSAGE_PREFIX.length);

  return APP_LOGIN_PROVIDERS.find((provider) => provider === requested) ?? null;
};

export const loginWith = async (provider: AppLoginProvider): Promise<AppLoginResult> => {
  try {
    const outcome = await TOKEN_READERS[provider]();
    return { ...outcome, provider };
  } catch {
    return { provider, status: 'failed' };
  }
};

export const loginResultScript = (result: AppLoginResult): string =>
  `window.dispatchEvent(new CustomEvent(${JSON.stringify(LOGIN_RESULT_EVENT)}, { detail: ${JSON.stringify(result)} }));
true;`;

export const signOutProviders = (): void => {
  if (APP_LOGIN_PROVIDERS.length === 0) {
    return;
  }

  void signOutKakao().catch(() => undefined);
};
