import * as Haptics from 'expo-haptics';
import PoudyHapticsModule from 'poudy-haptics';
import { Platform } from 'react-native';

const performSelectionHaptic = (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return Haptics.selectionAsync();
  }

  if (PoudyHapticsModule) {
    return PoudyHapticsModule.performSelectionAsync();
  }

  return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
};

export const playSelectionHaptic = async () => {
  await performSelectionHaptic().catch(() => undefined);
};
