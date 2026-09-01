import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const playSelectionHaptic = () => {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick).catch(() => undefined);
    return;
  }

  void Haptics.selectionAsync().catch(() => undefined);
};
