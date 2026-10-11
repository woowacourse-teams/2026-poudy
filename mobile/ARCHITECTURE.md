# Mobile Architecture

구성의 권위 원천은 `app.config.ts`, `eas.json`, `src`, `modules` 다. 이 문서는 값과 파일 목록을
복제하지 않고, 코드를 읽어서는 알 수 없는 경계만 기록한다.

## 앱이 맡는 범위

앱은 `client` 웹을 WebView 로 표시하는 셸이다. 화면은 웹이 그리고, 앱은 웹에서 할 수 없는
바깥 경계만 맡는다. 공유 수신, 딥링크, 공유 시트, 퀵 액션이 그렇다. 이들은 모두 목적지 URL 을
정해 WebView 에 넘기는 것으로 끝나고, 앱은 화면을 따로 그리지 않는다.

소셜 로그인도 바깥 경계다. 앱은 네이티브 SDK 로 제공자 토큰만 받아 WebView 에 넘기고, 서버에
보내 세션을 만드는 일은 웹이 한다. 앱은 API 주소와 회원 상태를 모른다.

`EXPO_PUBLIC_SERVICE_URL` 과 같은 origin 만 WebView 안에서 연다. 다른 origin 은 외부 브라우저로
보낸다. 예외는 카카오톡이 없는 기기의 카카오 로그인이다. 앱이 웹에 WebView 로그인을 하라고 답한 뒤부터 서비스 밖으로 나갔다가 돌아올 때까지는 http(s) 주소를 모두 WebView 안에서 연다. 앱의 메시지는 서비스 origin 의 페이지가 보낸 것만 받는다.

## 의존 방향

`application → hooks → util·api` 한 방향이다. `util` 과 `api` 는 React 에 의존하지 않고,
`components` 는 훅이 만든 상태를 받기만 한다. 훅끼리 호출하지 않고 `application` 에서 조합한다.

`components` 와 `hooks` 는 `index.ts` 로 묶어 내보내고, 바깥에서는 `@/components`·`@/hooks` 로 가져온다. 같은 폴더 안에서는
배럴을 거치면 자기 자신을 다시 불러오는 순환이 생기므로 파일을 직접 가져온다.

## 생성물과 소스

`android/` 와 `ios/` 는 prebuild 가 `app.config.ts` 로부터 만드는 산출물이다. 네이티브 설정은
생성된 파일이 아니라 `app.config.ts` 와 `plugins/` 에서 고친다.

`modules/poudy-share` 는 산출물이 아니라 소스다. Autolinking 이 `modules/` 를 훑어 네이티브를
연결하고, JS 쪽 `import 'poudy-share'` 는 workspace 의존성으로 해석된다. 네이티브 모듈이 없는
플랫폼에서는 JS 인터페이스가 `null` 이 되므로 호출부에 대체 경로가 있어야 한다.
