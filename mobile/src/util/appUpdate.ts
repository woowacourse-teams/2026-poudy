import Constants from 'expo-constants';
import PoudyAppUpdateModule, { type AppUpdate, type ImmediateUpdateStatus } from 'poudy-app-update';
import { Alert, BackHandler } from 'react-native';

import { alertUnopenableUrl, openExternalUrl } from '@/util/webViewRequest';

export const APP_UPDATE_MESSAGE = 'poudy:app-update';

export const canAppUpdate = PoudyAppUpdateModule !== null;

const FORCED_PRIORITY = 4;

const NO_UPDATE: AppUpdate = { isAvailable: false, isInProgress: false, priority: 0 };

const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${Constants.expoConfig?.android?.package ?? ''}`;

const STORE_FALLBACK_STATUSES: readonly ImmediateUpdateStatus[] = ['failed', 'unavailable'];

const startImmediateUpdate = (): Promise<ImmediateUpdateStatus> =>
  (PoudyAppUpdateModule?.startImmediateUpdateAsync() ?? Promise.resolve<ImmediateUpdateStatus>('unavailable')).catch(
    (): ImmediateUpdateStatus => 'failed',
  );

export const checkAppUpdate = (): Promise<AppUpdate> =>
  (PoudyAppUpdateModule?.checkUpdateAsync() ?? Promise.resolve(NO_UPDATE)).catch(() => NO_UPDATE);

const isForcedUpdate = (update: AppUpdate): boolean => update.priority >= FORCED_PRIORITY;

export const needsImmediateUpdate = (update: AppUpdate): boolean =>
  update.isInProgress || (update.isAvailable && isForcedUpdate(update));

export const isOptionalUpdate = (update: AppUpdate): boolean => update.isAvailable && !isForcedUpdate(update);

export const startAppUpdate = async () => {
  const status = await startImmediateUpdate();

  if (STORE_FALLBACK_STATUSES.includes(status)) {
    await openExternalUrl(PLAY_STORE_URL).catch(alertUnopenableUrl);
  }
};

export const runImmediateUpdate = async (update: AppUpdate) => {
  const status = await startImmediateUpdate();

  if (status === 'cancelled' && isForcedUpdate(update)) {
    BackHandler.exitApp();
  }
};

export const suggestAppUpdate = () => {
  Alert.alert('새 버전이 나왔어요', '업데이트하고 새 버전을 써 보세요.', [
    { text: '닫기', style: 'cancel' },
    { text: '업데이트', onPress: startAppUpdate },
  ]);
};
