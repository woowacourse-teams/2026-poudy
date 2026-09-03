import * as Haptics from 'expo-haptics';
import PoudyHapticsModule from 'poudy-haptics';
import { Platform } from 'react-native';

export const playSelectionHaptic = () => {
  if (Platform.OS === 'android') {
    const haptic = PoudyHapticsModule
      ? PoudyHapticsModule.performSelectionAsync()
      : Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);

    void haptic.catch(() => undefined);
    return;
  }

  void Haptics.selectionAsync().catch(() => undefined);
};
