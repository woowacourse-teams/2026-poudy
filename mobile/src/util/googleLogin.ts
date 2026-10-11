import { GoogleSignin, isCancelledResponse } from '@react-native-google-signin/google-signin';

import type { ProviderTokenOutcome } from '@/types/appLogin';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

export const googleIdToken = async (): Promise<ProviderTokenOutcome> => {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  if (isCancelledResponse(response)) {
    return { status: 'cancelled' };
  }

  void GoogleSignin.signOut().catch(() => undefined);

  if (!response.data.idToken) {
    throw new Error('Google ID token is missing.');
  }

  return { status: 'success', token: response.data.idToken };
};
