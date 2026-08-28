import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * 선택 피드백.
 *
 * 안드로이드는 `selectionAsync` 를 쓰지 않는다. 그쪽은 진동기에 파형을 직접 넣는 호출이라
 * 시스템의 터치 피드백 설정(`Settings.System.HAPTIC_FEEDBACK_ENABLED`)이 걸리지 않는다.
 * `performAndroidHapticsAsync` 는 `View.performHapticFeedback` 으로 내려가 그 설정을 따른다.
 *
 * `Clock_Tick` 은 API 레벨을 가리지 않는 상수다. `Confirm` 이나 `Toggle_On` 은 30 이상에만 있어
 * 하위 기기에서 예외가 난다.
 *
 * iOS 의 `selectionAsync` 는 `UISelectionFeedbackGenerator` 라 시스템 햅틱 설정을 이미 따른다.
 */
export const playSelectionHaptic = () => {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick).catch(() => undefined);
    return;
  }

  void Haptics.selectionAsync().catch(() => undefined);
};
