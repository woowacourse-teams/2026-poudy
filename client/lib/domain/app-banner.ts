/**
 * 좁은 화면에서 머리 위에 띄우는 앱 설치 배너를 보일지 정한다.
 *
 * 넓은 화면은 왼쪽 여백에 QR 코드를 두지만(`AppQrPanel`), 좁은 화면에는 그럴 자리가
 * 없다. 그 자리를 이 배너가 대신한다.
 *
 * 판별에 쓰는 것이 모두 브라우저에만 있어 서버에서 미리 그릴 때는 알 수 없다.
 * 그래서 화면이 붙은 뒤에 판단한다.
 */

/** 앱은 Play 스토어에만 있다. iOS 에서 띄워도 받을 곳이 없다. */
const ANDROID = /Android/i;

export type BannerContext = {
  readonly userAgent: string;
  /** 앱이 주입한 정보나 React Native 다리로 판별한 값. */
  readonly isInAppWebView: boolean;
  /** 이 방문에서 이미 닫았는지. */
  readonly dismissed: boolean;
};

/**
 * 셋을 모두 만족해야 보여 준다.
 *
 * 웹뷰를 빼는 것이 가장 중요하다. 앱 안에서 앱을 받으라고 권하는 꼴이 되고, 눌러서
 * 스토어로 보내면 쓰던 화면에서 밀려난다. 앱은 `window.__POUDY_APP__` 을 주입하고
 * React Native 는 `window.ReactNativeWebView` 를 두므로 둘 중 하나만 있어도 웹뷰다.
 */
export const shouldShowAppBanner = ({ userAgent, isInAppWebView, dismissed }: BannerContext): boolean => {
  if (isInAppWebView) return false;
  if (dismissed) return false;

  return ANDROID.test(userAgent);
};
