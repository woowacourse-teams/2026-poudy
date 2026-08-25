declare global {
  interface Window {
    readonly ReactNativeWebView?: {
      readonly postMessage: (message: string) => void;
    };
  }
}

const HAPTIC_SELECTION_MESSAGE = "poudy:haptic:selection";

export const requestSelectionHaptic = () => {
  window.ReactNativeWebView?.postMessage(HAPTIC_SELECTION_MESSAGE);
};
