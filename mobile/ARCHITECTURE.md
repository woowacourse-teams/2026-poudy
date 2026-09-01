# Mobile Architecture

구성의 권위 원천은 `app.config.ts`, `eas.json`, `src`, `modules` 다. 이 문서는 값과 파일 목록을
복제하지 않고, 코드를 읽어서는 알 수 없는 경계만 기록한다.

## 앱이 맡는 범위

앱은 `client` 웹을 WebView 로 표시하는 셸이다. 화면은 웹이 그리고, 앱은 웹에서 할 수 없는
바깥 경계만 맡는다. 공유 수신, 딥링크, 공유 시트, 퀵 액션이 그렇다. 이들은 모두 목적지 URL 을
정해 WebView 에 넘기는 것으로 끝나고, 앱은 화면을 따로 그리지 않는다.

`EXPO_PUBLIC_SERVICE_URL` 과 같은 origin 만 WebView 안에서 연다. 다른 origin 은 외부 브라우저로
보낸다.

## 의존 방향

`application → hooks → util·api` 한 방향이다. `util` 과 `api` 는 React 에 의존하지 않고,
`components` 는 훅이 만든 상태를 받기만 한다. 훅끼리 호출하지 않고 `application` 에서 조합한다.

## 생성물과 소스

`android/` 와 `ios/` 는 prebuild 가 `app.config.ts` 로부터 만드는 산출물이다. 네이티브 설정은
생성된 파일이 아니라 `app.config.ts` 와 `plugins/` 에서 고친다.

`modules/poudy-share` 는 산출물이 아니라 소스다. Autolinking 이 `modules/` 를 훑어 네이티브를
연결하고, JS 쪽 `import 'poudy-share'` 는 workspace 의존성으로 해석된다. 네이티브 모듈이 없는
플랫폼에서는 JS 인터페이스가 `null` 이 되므로 호출부에 대체 경로가 있어야 한다.
