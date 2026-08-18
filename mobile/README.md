# Poudy Mobile

Expo SDK 57 기반의 React Native 앱입니다. 기존 `client`를 WebView로 표시하고, iOS Share Extension과 Android `ACTION_SEND` Intent Filter로 다른 앱에서 공유한 상품 링크를 받습니다.

## 요구 환경

- Node.js 22.13 이상
- pnpm 11.21
- 네이티브 공유 수신을 확인할 로컬 개발 빌드

`expo-sharing`의 공유 수신 설정은 네이티브 프로젝트에 반영되므로 일반 Expo Go가 아니라 `expo run:ios` 또는 `expo run:android`로 만든 로컬 빌드를 사용합니다. SDK 57의 iOS 공유 수신은 아직 experimental이며, Share Extension이 별도 UI를 표시하지 않고 본 앱을 실행해 payload를 넘기는 방식입니다.

## 시작하기

```bash
cd mobile
cp .env.example .env
pnpm install
pnpm start
```

`EXPO_PUBLIC_WEB_URL`에는 기기에서 접근할 수 있는 웹 클라이언트 주소를 넣습니다. 실기기에서 `localhost`는 개발 PC가 아니므로 HTTPS 터널을 사용합니다. 프로덕션도 반드시 HTTPS 주소를 사용합니다.

이 값이 없거나 HTTP(S) URL이 아니면 Expo 설정 평가 단계에서 빌드를 중단합니다. 따라서 잘못된 웹 주소로 구성된 앱이 배포되지 않습니다.

```bash
# 로컬 네이티브 프로젝트를 생성하고 실행
pnpm ios
pnpm android
```

`ios/`와 `android/`는 CNG 산출물이므로 Git에 포함하지 않습니다. 네이티브 설정을 다시 확인할 때는 환경 변수를 설정한 상태에서 `pnpm exec expo prebuild --clean --no-install`로 재생성합니다.

## 환경 변수

| 변수                      | 필수    | 용도                                                             |
| ------------------------- | ------- | ---------------------------------------------------------------- |
| `EXPO_PUBLIC_WEB_URL`     | 예      | WebView가 표시할 Poudy 웹 클라이언트 기준 URL                    |
| `POUDY_BUNDLE_IDENTIFIER` | 빌드 시 | iOS Bundle ID와 Android Application ID. 기본값은 `com.poudy.app` |

## EAS Build

`eas.json`은 development, preview, production 환경을 각각 같은 이름의 EAS Environment와 연결합니다. 각 환경에 공개값인 `EXPO_PUBLIC_WEB_URL`을 plaintext로 등록해야 하며, 처음 사용할 때 EAS 프로젝트 연결과 서명 자격 증명 설정이 필요합니다.

production 빌드는 EAS 원격 버전을 기준으로 iOS build number와 Android version code를 자동 증가시킵니다. `app.config.ts`의 초기값 `1`은 원격 버전을 처음 초기화할 때 사용합니다.

## 공유 링크 흐름

1. 올리브영에서 상품 URL을 Poudy로 공유합니다.
2. `expo-sharing`이 iOS Share Extension 또는 Android `ACTION_SEND` payload를 앱으로 전달합니다.
3. Poudy 자체 URL이면 WebView가 같은 경로를 엽니다.
4. 올리브영 상품 URL은 수신하지만, 상품 ID 매핑 규격이 없으므로 아직 상세 페이지로 이동하지 않습니다.

현재 서버에는 올리브영 상품 ID와 Poudy 상품 ID를 연결하는 API가 없습니다. 따라서 실제 상세 페이지로 바로 이동하는 규격은 임의로 만들지 않았으며, 매핑 API가 결정되면 공유 URL 수신부에 연결해야 합니다.

`poudy://products/1`처럼 앱 scheme으로 실행하면 WebView의 `/products/1`로 이동합니다. Share Extension이 앱을 깨우는 `poudy://expo-sharing`은 공유 payload 처리용이므로 일반 딥링크에서 제외합니다.

## 네이티브 공유 설정

- Android `ACTION_SEND`: `text/*`
- iOS Share Extension: text, webpage, web URL 각 1개

Android 공유 수신은 설치된 개발 빌드에서 다음처럼 확인할 수 있습니다.

```bash
adb shell am start \
  -a android.intent.action.SEND \
  -t text/plain \
  --es android.intent.extra.TEXT "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000000001" \
  com.poudy.app
```

## 코드 별칭과 타입 검사

`tsconfig.json`의 `@/* -> src/*` 별칭을 사용합니다.

```bash
pnpm lint
pnpm format:check
pnpm typecheck
```
