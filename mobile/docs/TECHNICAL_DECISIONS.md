# 모바일 기술 결정

## 공유 수신 경계

- 공유 원문은 앱에서 제품을 판별하지 않고 웹의 `/share/redirect` 경로로 전달한다. 앱은 같은 서비스 원본의 URL만 직접 열며, 그 외 텍스트의 제품 매칭은 웹이 담당한다.
- 이 경계로 앱은 API 주소나 제품 매칭 규칙에 의존하지 않는다. 매칭 로직이나 API 배포 주소가 바뀌어도 앱을 다시 배포할 필요가 없다.

## WebView 탐색과 뒤로 가기

- WebView를 다시 만들면 브라우저 방문 기록도 비어 있다. 따라서 소스 키가 바뀔 때 네이티브 뒤로 가기 상태를 초기화해, 이전 WebView의 `canGoBack` 상태가 버튼 입력을 소모하지 않도록 한다.

## WebView 화면 확대

- 화면 확대 제한은 앱 WebView 안에서만 적용한다. 일반 브라우저에는 확대 기능을 남겨 두므로 웹의 공통 viewport 설정은 바꾸지 않는다.
- 확대는 초기화 스크립트가 막는다. viewport 에 `maximum-scale=1, user-scalable=no` 를 붙이고 `<html>` 에 `touch-action: pan-x pan-y` 를 건다. `touch-action` 은 브라우저 기본 핀치 확대만 끄고 터치 이벤트는 그대로 웹에 넘기므로, 웹의 두 손가락 제스처는 살아 있다.
- 초기화 스크립트는 `MutationObserver` 로 viewport meta 와 `<html>` 의 style 을 계속 지켜본다. App Router 가 페이지를 이동하며 viewport meta 를 다시 그려도 잠금이 풀리지 않게 하기 위해서다.
- 두 번째 손가락이 닿을 때 네이티브에서 터치를 취소하는 방식은 쓰지 않는다. 확대는 막히지만 웹이 두 손가락 터치를 전혀 받지 못한다.
- Android 는 `WebSettings` 의 확대 지원, 내장 확대 기능, 화면 확대 컨트롤을 모두 끈다. `react-native-webview` 가 확대 지원 설정을 노출하지 않아, 패키지 패치에서 `setBuiltInZoomControls={false}` 를 `setSupportZoom(false)` 와 함께 적용한다. 다만 Galaxy S24+ (WebView 151) 에서는 이 설정만으로 핀치 확대가 막히지 않았다.
- `react-native-webview` 는 Android 에서 `injectedJavaScriptBeforeContentLoaded` 를 `onPageStarted` 에서 `evaluateJavascript` 로 실행한다. 이 때문에 첫 화면에 들어온 직후 스크립트가 돌기 전까지 확대가 되는 틈이 있었다. 패치에서 androidx.webkit 의 `addDocumentStartJavaScript` 로 등록해 문서가 만들어지는 시점에 실행하고, 이 기능을 지원하지 않는 WebView 에서만 기존 방식으로 돌아간다.
- iOS 는 WKWebView 의 핀치 인식기를 끈다. 초기화 스크립트는 `WKUserScript` 로 문서 시작 시점에 실행되므로 Android 와 같은 틈이 없다.

## 스플래시와 로딩 애니메이션

- Android에서는 네이티브 스플래시를 숨긴 뒤 두 번째 애니메이션 프레임부터 React Native 로더를 실행한다. 전환 프레임에서 두 화면이 겹쳐 보이는 현상을 피하기 위한 순서다.
- 로고 조각은 하나의 `Animated.Value`를 공유한다. 조각마다 지연 애니메이션을 따로 시작하면 타이머 오차가 누적돼 조각의 위상이 어긋날 수 있다.
- `Animated.interpolate`는 구간 사이를 선형 보간하므로, 베지어 가속도를 유지하려면 접힘 구간을 여러 표본으로 나눠 근사한다.
- 동작 줄이기 접근성 설정이 켜진 경우에는 완성 상태의 로고만 표시한다.

## 안전 영역

- 안전 영역은 셸만 다룬다. `SafeAreaView` 가 WebView 를 상태 표시줄과 시스템 내비게이션 바 안쪽에 놓고, 웹은 자기가 받은 사각형을 화면 전체로 여긴다. `bottom: 0` 이 곧 실제 아래 끝이다.
- 그래서 **웹은 `env(safe-area-inset-*)` 을 쓰지 않는다.** Android WebView 는 뷰가 아니라 창을 기준으로 인셋을 내주기 때문에, 셸이 이미 피해 둔 자리를 웹이 한 번 더 피해 여백이 두 번 잡힌다. 브라우저에서는 툴바가 그 자리를 차지해 값이 0 이라 쓸 이유도 없다.
- iOS 는 WKWebView 가 뷰의 안전 영역을 따라 0 을 내주므로 셸 설정만으로 맞는다. 어긋나는 것은 Android 뿐이다.
- 웹에 아래로 붙는 요소를 더할 때 안전 영역을 계산하지 않아도 된다. 계산하면 Android 앱에서만 어긋난다.

## 햅틱

- Android는 시스템 터치 피드백 설정을 따르며, 지원되는 기기에서는 메뉴 선택에 맞는 `Virtual_Key`를 사용한다.
- Android 11 이상에서 기본 클릭 효과 지원을 보고하지 않는 기기는 `Virtual_Key`가 성공처럼 반환돼도 실제로 울리지 않을 수 있다. 이 경우 시스템 터치 피드백 설정을 확인한 뒤 코인 모터에서도 체감 가능한 50ms `Vibrator` 파형으로 대체한다.
- iOS는 시스템 햅틱 설정을 따르는 `selectionAsync`를 사용한다.

## 빠른 동작 아이콘

- 빠른 동작 아이콘은 두 플랫폼에서 공유한다. Android 리소스 이름 규칙에 맞춰 밑줄만 사용하는 이름을 유지한다.
