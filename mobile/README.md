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

`EXPO_PUBLIC_WEB_URL`에는 기기에서 접근할 수 있는 웹 클라이언트 주소를 넣습니다. 실기기에서 `localhost`는 개발 PC가 아니므로 HTTPS 터널을 사용합니다. 프로덕션도 반드시 HTTPS 주소를 사용합니다.

이 값이 없거나 HTTP(S) URL이 아니면 Expo 설정 평가 단계에서 빌드를 중단합니다. 따라서 잘못된 웹 주소로 구성된 앱이 배포되지 않습니다.

```bash
# 로컬 네이티브 프로젝트를 생성하고 실행
pnpm ios
pnpm android
```

`ios/`와 `android/`는 CNG 산출물이므로 Git에 포함하지 않습니다. 네이티브 설정을 다시 확인할 때는 환경 변수를 설정한 상태에서 `pnpm exec expo prebuild --clean --no-install`로 재생성합니다.

## 환경 변수

| 변수                      | 필수       | 용도                                                             |
| ------------------------- | ---------- | ---------------------------------------------------------------- |
| `EXPO_PUBLIC_WEB_URL`     | 예         | WebView가 표시할 Poudy 웹 클라이언트 기준 URL                    |
| `POUDY_BUNDLE_IDENTIFIER` | 빌드 시    | iOS Bundle ID와 Android Application ID. 기본값은 `com.poudy.app` |
| `POUDY_APP_VERSION`       | production | 스토어에 노출되는 앱 버전. `x.y.z` 형식만 허용합니다             |

## 정식 앱과 나란히 설치하기

`POUDY_BUNDLE_IDENTIFIER`에 기본값이 아닌 값을 주면 다른 앱으로 설치됩니다. 이미 깔린 앱을 지우지 않고 고친 것을 확인할 때 씁니다. 기본값이 아니면 앱 이름도 `Poudy Dev`가 되어 홈 화면과 공유 시트에서 구분됩니다.

식별자는 네이티브 프로젝트에 박히므로 값을 바꾼 뒤에는 반드시 다시 생성합니다. `android/`가 이미 있으면 `expo run:android`가 그대로 쓰기 때문에 이 단계를 건너뛸 수 없습니다.

```bash
cd mobile
export POUDY_BUNDLE_IDENTIFIER=com.poudy.app.dev
export EXPO_PUBLIC_WEB_URL=https://poudy-staging.vercel.app
pnpm exec expo prebuild --clean --no-install
pnpm android
```

정식 식별자로 되돌릴 때도 `--clean`으로 다시 생성합니다.

두 앱은 `poudy://` 스킴과 `ACTION_SEND` 공유를 함께 등록합니다. 딥링크를 열거나 올리브영에서 공유하면 안드로이드가 어느 앱으로 보낼지 묻습니다. 이름이 달라 고를 수는 있지만 매번 묻는 것이 번거로우면 확인이 끝난 뒤 개발용 앱을 지웁니다.

## EAS CLI

`eas` 명령은 설정을 읽으려고 `expo config`를 먼저 실행합니다. 이 단계는 `.env` 주입보다
앞서므로 `.env`에 값이 있어도 `EXPO_PUBLIC_WEB_URL`이 없다고 판단해 중단합니다. 명령 앞에
값을 붙여 실행합니다.

```bash
EXPO_PUBLIC_WEB_URL=https://poudy.site npx eas-cli@latest credentials --platform android
```

## EAS Build

`eas.json`은 development, preview, production 환경을 각각 같은 이름의 EAS Environment와 연결합니다. 각 환경에 공개값인 `EXPO_PUBLIC_WEB_URL`을 plaintext로 등록해야 하며, 처음 사용할 때 EAS 프로젝트 연결과 서명 자격 증명 설정이 필요합니다.

`staging`은 production 프로파일을 물려받되 preview 환경을 읽습니다. 스토어에 올릴 수 있는 AAB를 같은 조건으로 만들면서 웹 주소만 staging 을 가리키게 하려는 것입니다. 두 프로파일이 서로 다른 EAS Environment 를 읽으므로 staging 값을 바꿔도 production 의 주소는 그대로입니다. 정식 배포는 되돌릴 설정 없이 `--profile production` 그대로 씁니다.

```bash
EXPO_PUBLIC_WEB_URL=https://poudy.site npx eas-cli@latest build --platform android --profile staging
```

production 빌드는 EAS 원격 버전을 기준으로 iOS build number와 Android version code를 자동 증가시킵니다. staging 도 production 을 물려받아 같은 번호를 씁니다. 번호는 앱 하나에 하나뿐이라 staging 빌드가 올린 만큼 다음 production 빌드가 이어받고, Play Store 가 요구하는 version code 증가 조건도 그대로 지켜집니다.

앱 버전은 서버·웹 릴리스 태그(`v*`)와 분리해서 관리합니다. 서버와 웹은 한 파이프라인에서 함께 배포되지만 앱은 스토어 심사를 거쳐 사용자가 각자 업데이트하므로 두 번호가 같은 시점을 가리키지 않습니다. 앱과 서버의 호환 여부는 릴리스 버전 비교가 아니라 API 계약 버전으로 판단합니다.

스토어에 노출되는 버전은 production EAS Environment에 등록한 `POUDY_APP_VERSION`이 정합니다. 릴리스할 때 이 값만 올리면 되고, build number와 version code는 EAS가 알아서 증가시킵니다. production 빌드에서 값이 없으면 Expo 설정 평가 단계에서 빌드를 중단하므로 예전 버전이 그대로 스토어에 올라가지 않습니다. 이 검사는 production 프로파일에만 걸립니다. staging 은 값이 없으면 기본값으로 만들어지므로, 테스트 트랙에서도 버전을 알아보려면 preview 환경에 `POUDY_APP_VERSION`을 함께 등록합니다.

## EAS Submit

`eas.json`의 `submit.staging`과 `submit.production`이 Play Store 트랙과 서비스 계정 키 위치를 정합니다. staging 은 비공개 테스트(`alpha`), production 은 정식 출시(`production`) 트랙입니다. 키 파일은 저장소에 두지 않고 각자 `mobile/google-service-account.json`으로 놓습니다.

```bash
EXPO_PUBLIC_WEB_URL=https://poudy.site npx eas-cli@latest submit --platform android --profile staging --latest
```

다음 단계는 API로 대신할 수 없어 Play Console에서 직접 합니다.

1. 개발자 계정 등록(일회성 $25)과 앱 생성(`com.poudy.app`)
2. 스토어 등록정보, 콘텐츠 등급, 데이터 보안 설문 작성
3. 첫 AAB 업로드. Google Play Developer API는 앱에 기존 릴리스가 있어야 트랙에 올릴 수 있어 첫 릴리스만 수동입니다
4. Google Cloud 서비스 계정 생성과 JSON 키 발급, Play Console에서 권한 연결

개인 개발자 계정은 정식 출시 전에 비공개 테스트(테스터 12명·20일)를 요구합니다. 조직 계정은 해당하지 않으므로 계정 유형을 먼저 확인하고 첫 트랙을 정합니다.

## 공유 링크 흐름

1. 올리브영에서 상품 URL을 Poudy로 공유합니다.
2. `expo-sharing`이 iOS Share Extension 또는 Android `ACTION_SEND` payload를 앱으로 전달합니다.
3. Poudy 자체 URL이면 WebView가 같은 경로를 엽니다.
4. 올리브영 URL을 Poudy 제품 상세로 연결하는 정제·판정 로직은 추후 구현합니다.

현재는 공유 수신을 위한 네이티브 설정과 payload 전달까지만 포함합니다. 미지원 공유에는 준비 중 안내를 표시합니다.

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

## 앱 아이콘 퀵 액션

홈 화면에서 앱 아이콘을 길게 누르면 나오는 메뉴입니다. 각 항목은 WebView를 해당 경로로 다시 엽니다.

| 항목        | 경로                  |
| ----------- | --------------------- |
| 성분 검색   | `/search/ingredients` |
| 비교함      | `/compare`            |
| 저장한 제품 | `/saved`              |

항목 정의와 경로 변환은 `src/util/quickAction.ts`에, 등록과 실행 처리는 `src/hooks/useQuickActions.ts`에 있습니다. 정적 선언 대신 앱 실행 시 `setItems`로 등록하므로 iOS와 Android 모두 설치 후 앱을 한 번 실행해야 메뉴가 나타납니다.

`/compare`는 웹 클라이언트에 아직 없는 경로입니다. 비교함 화면이 추가되기 전까지 이 항목은 빈 페이지로 이동합니다.

## 코드 별칭과 타입 검사

`tsconfig.json`의 `@/* -> src/*` 별칭을 사용합니다.

```bash
pnpm lint
pnpm format:check
pnpm typecheck
```
