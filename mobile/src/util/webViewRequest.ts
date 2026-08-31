import { Alert, Linking } from 'react-native';

const BLANK_URL = 'about:blank';

export const shouldLoadInWebView = (url: string, serviceOrigin: string): boolean => {
  if (url === BLANK_URL) {
    return true;
  }

  try {
    return new URL(url).origin === serviceOrigin;
  } catch {
    return false;
  }
};

export const isHomeUrl = (url: string, serviceBaseUrl: string): boolean => {
  try {
    const current = new URL(url);
    const home = new URL(serviceBaseUrl);

    return current.origin === home.origin && current.pathname === home.pathname;
  } catch {
    return false;
  }
};

export const openExternalUrl = (url: string) => {
  void Linking.openURL(url).catch(() => {
    Alert.alert('링크를 열 수 없어요', '연결된 앱 또는 올바른 주소인지 확인해 주세요.');
  });
};
