# Poudy Mobile

Expo SDK 57 기반의 React Native 앱입니다. 기존 `client`를 WebView로 표시하고, iOS Share Extension과 Android `ACTION_SEND` Intent Filter로 다른 앱에서 공유한 상품 링크를 받습니다.

## 요구 환경

- Node.js 22.13 이상
- pnpm 11.21
- 네이티브 공유 수신을 확인할 로컬 개발 빌드

`expo-sharing`의 공유 수신 설정은 네이티브 프로젝트에 반영되므로 일반 Expo Go가 아니라 `expo run:ios`, `expo run:android` 또는 EAS development build를 사용합니다. SDK 57의 iOS 공유 수신은 아직 experimental이며, Share Extension이 별도 UI를 표시하지 않고 본 앱을 실행해 payload를 넘기는 방식입니다.

## 시작하기

```bash
cd mobile
cp .env.example .env
pnpm install
pnpm start
```

```bash
# 로컬 네이티브 프로젝트를 생성하고 실행
pnpm ios
pnpm android
```

`ios/`와 `android/`는 Git에 포함하지 않습니다. 네이티브 설정을 다시 확인할 때는 환경 변수를 설정한 상태에서 `pnpm exec expo prebuild --clean --no-install`로 재생성합니다.

## 환경 변수

| 변수                       | 필수       | 용도                                                             |
| -------------------------- | ---------- | ---------------------------------------------------------------- |
| `EXPO_PUBLIC_WEB_URL`      | 예         | WebView가 표시할 Poudy 웹 클라이언트 기준 URL                    |
| `EXPO_PUBLIC_API_BASE_URL` | 예         | 공유 텍스트 매칭 API 기준 URL                                    |
| `POUDY_BUNDLE_IDENTIFIER`  | 빌드 시    | iOS Bundle ID와 Android Application ID. 기본값은 `com.poudy.app` |
| `POUDY_APP_VERSION`        | production | 스토어에 노출되는 앱 버전. `x.y.z` 형식만 허용합니다             |

실기기에서 `localhost`는 개발 PC가 아니므로 HTTPS 터널을 사용합니다. 값이 없거나 HTTP(S) URL이 아니면 Expo 설정 평가 단계에서 빌드를 중단합니다.

## 정식 앱과 나란히 설치하기

`POUDY_BUNDLE_IDENTIFIER`에 기본값이 아닌 값을 주면 다른 앱으로 설치되고, 앱 이름도 `Poudy Dev`가 되어 홈 화면과 공유 시트에서 구분됩니다. 이미 깔린 앱을 지우지 않고 고친 것을 확인할 때 씁니다.

```bash
cd mobile
export POUDY_BUNDLE_IDENTIFIER=com.poudy.app.dev
export EXPO_PUBLIC_WEB_URL=https://poudy-staging.vercel.app
export EXPO_PUBLIC_API_BASE_URL=https://api.poudy.example.com
pnpm exec expo prebuild --clean --no-install
pnpm android
```

식별자는 네이티브 프로젝트에 박히므로 값을 바꾼 뒤에는 `--clean`으로 다시 생성합니다. 정식 식별자로 되돌릴 때도 같습니다.

두 앱은 `poudy://` 스킴과 `ACTION_SEND` 공유를 함께 등록하므로 딥링크나 공유 시 안드로이드가 어느 앱으로 보낼지 묻습니다. 확인이 끝나면 개발용 앱을 지웁니다.

## EAS

`eas` 명령은 설정을 읽으려고 `expo config`를 먼저 실행합니다. 이 단계는 EAS Environment 주입보다 앞서므로 로컬 `.env`의 URL을 셸 환경변수로 내보낸 뒤 실행합니다.

```bash
set -a
source .env
set +a
```

```bash
# 처음 한 번, 서명 자격 증명 설정
npx eas-cli@latest credentials --platform android

# 비공개 테스트 트랙에 올릴 AAB
npx eas-cli@latest build --platform android --profile staging

# 정식 출시 AAB
npx eas-cli@latest build --platform android --profile production

# 기기에 바로 설치할 APK
npx eas-cli@latest build --platform android --profile production-apk

# 만들어 둔 빌드를 Play Store 트랙으로 제출
npx eas-cli@latest submit --platform android --profile staging --latest
```

`production` 빌드는 production EAS Environment에 `POUDY_APP_VERSION`이 없으면 중단됩니다.

`eas.json`은 development, preview, production 환경을 각각 같은 이름의 EAS Environment와 연결합니다. 각 환경에 `EXPO_PUBLIC_WEB_URL`과 `EXPO_PUBLIC_API_BASE_URL`을 plaintext로 등록해야 하며, 처음 사용할 때 EAS 프로젝트 연결과 서명 자격 증명 설정이 필요합니다. Play Store 제출용 서비스 계정 키는 저장소에 두지 않고 각자 `mobile/google-service-account.json`으로 놓습니다.

## 공유 수신 확인

`poudy://products/1`처럼 앱 scheme으로 실행하면 WebView의 `/products/1`로 이동합니다. Android 공유 수신은 설치된 개발 빌드에서 다음처럼 확인합니다.

```bash
adb shell am start \
  -a android.intent.action.SEND \
  -t text/plain \
  --es android.intent.extra.TEXT "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000000001" \
  com.poudy.app
```

## 검사

```bash
pnpm lint
pnpm format:check
pnpm typecheck
```
