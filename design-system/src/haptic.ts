declare global {
  interface Window {
    readonly ReactNativeWebView?: {
      readonly postMessage: (message: string) => void;
    };
  }
}

/** 앱(React Native WebView)에 선택 햅틱을 요청하는 메시지. 앱의 브리지가 이 이름을 듣는다. */
const HAPTIC_SELECTION_MESSAGE = "poudy:haptic:selection";

/** 웹에서 쓰는 선택 햅틱의 길이(ms). 단계를 하나 넘길 때 손끝에 '틱' 하고 닿는 정도로 짧게 둔다. */
const WEB_SELECTION_VIBRATION = 10;

/**
 * 선택 햅틱. 슬라이더의 단계가 바뀌거나 탭 · 정렬처럼 하나를 고를 때 손끝에 짧게 알린다.
 * 지원하는 환경에서만 울리고, 아니면 아무것도 하지 않는다.
 * - 앱(React Native WebView): 앱에 메시지를 보내 기기의 선택 햅틱을 쓴다.
 * - 웹: navigator.vibrate 가 있으면 짧게 떤다(안드로이드 크롬 등). iOS Safari 처럼 없으면 그냥 넘어간다.
 */
export const requestSelectionHaptic = () => {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(HAPTIC_SELECTION_MESSAGE);
    return;
  }
  navigator.vibrate?.(WEB_SELECTION_VIBRATION);
};
