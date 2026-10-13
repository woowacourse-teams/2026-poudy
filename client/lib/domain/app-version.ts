import type { AppProperties } from "@/lib/types/app-info";

/**
 * 앱 안에서 로그인할 수 있는 가장 낮은 안드로이드 앱 버전.
 *
 * 이보다 낮은 앱은 카카오·구글 로그인 페이지를 외부 브라우저로 넘긴다. 로그인과 세션 쿠키가
 * 브라우저에 남아 앱으로 돌아와도 로그인되어 있지 않다.
 */
export const LOGIN_APP_VERSION = "0.1.5";

const VERSION = /^\d+\.\d+\.\d+$/;

const toParts = (version: string): readonly number[] => version.split(".").map((part) => Number(part) || 0);

export const isAppVersionAtLeast = (version: string, target: string): boolean => {
  const parts = toParts(version);
  const difference = toParts(target)
    .map((part, index) => (parts[index] ?? 0) - part)
    .find((value) => value !== 0);

  return (difference ?? 0) >= 0;
};

/**
 * 로그인하려면 앱을 업데이트해야 하는지 정한다.
 *
 * 브라우저와 iOS 는 막지 않는다. iOS 앱은 스토어에 없어 받을 곳이 없다. 버전을 읽지
 * 못하면 막지 않는다. 앱이 버전을 못 읽어 `unknown` 을 보내도 로그인 길이 닫히지 않게 하기 위해서다.
 */
export const requiresUpdateForLogin = (app: AppProperties, minimum: string = LOGIN_APP_VERSION): boolean => {
  if (!app.is_app) return false;
  if (app.platform !== "android") return false;
  if (!VERSION.test(app.app_version)) return false;

  return !isAppVersionAtLeast(app.app_version, minimum);
};
