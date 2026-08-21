import { Alert, Linking } from 'react-native';

const BLANK_URL = 'about:blank';

export const shouldLoadInWebView = (url: string, webOrigin: string): boolean => {
  if (url === BLANK_URL) {
    return true;
  }

  try {
    return new URL(url).origin === webOrigin;
  } catch {
    return false;
  }
};

export const openExternalUrl = (url: string) => {
  void Linking.openURL(url).catch(() => {
    Alert.alert('링크를 열 수 없어요', '연결된 앱 또는 올바른 주소인지 확인해 주세요.');
  });
};
