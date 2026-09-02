import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const playSelectionHaptic = () => {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => undefined);
    return;
  }

  void Haptics.selectionAsync().catch(() => undefined);
};
