/**
 * 명세 보드의 '남겨 둔 예외' 표를 코드로 옮긴 것이다. 표와 1:1 로 맞추고, 표를 고치면 여기도 함께 고친다.
 *
 * - board: 예외를 정한 보드 섹션
 * - target: 예외를 쓰는 자리
 * - value: 허용하는 값
 * - reason: 토큰이나 스케일로 표현하지 않는 이유
 * - allow: 린트가 허용할 클래스. 규칙 이름을 키로 둔다. 스케일 값이거나 CSS 에만 있는 예외는 비워 둔다.
 * - components: 이 예외를 쓰는 디자인 시스템 부품. Storybook 의 부품 문서가 자기 예외만 골라 보인다. client 에서만 쓰면 비운다.
 *
 * 화면 하나에서만 잠시 필요한 예외는 여기에 올리지 않고, 그 줄에 기한이 있는 꼬리표를 단다(README).
 * 목업과 관리자 화면에만 해당하는 행(iOS 상태 표시줄, 관리자 서체, OS 상태바)은 이 코드에 쓰는 곳이 없어 옮기지 않는다.
 *
 * @type {readonly {
 *   board: string;
 *   target: string;
 *   value: string;
 *   reason: string;
 *   allow?: Partial<Record<"no-arbitrary-values" | "no-raw-colors", readonly string[]>>;
 *   components?: readonly string[];
 * }[]}
 */
export const exceptions = [
  {
    board: "LAYOUT L07",
    target: "물방울 묶음 위 여백",
    value: "1.5px",
    reason: "글자와 세로 가운데를 맞추는 광학 보정이다. 간격 스케일(4px 단위)로 표현할 수 없다.",
    allow: { "no-arbitrary-values": ["pt-[1.5px]"] },
  },
  {
    board: "LAYOUT L07",
    target: "상단 내비 버튼 칸",
    value: "왼쪽 8 · 칸 56×44",
    reason:
      "누르는 영역 44 를 지키면서 꺾쇠가 화면 끝 16 에 보이게 한다. 스케일 값(pl-2, w-14, h-11)이라 린트 예외는 없다.",
    components: ["TopBar"],
  },
  {
    board: "LAYOUT L07",
    target: "내비 오른쪽 아이콘 버튼",
    value: "IconButton(44)을 칸 오른쪽 4 에 둔다(아이콘 끝 14)",
    reason:
      "아이콘(24) 끝을 화면 끝 14 에 두어, 안쪽 여백을 뺀 글리프가 화면 끝 16 에 보이게 한다. 스케일 값(pr-1)이라 린트 예외는 없다.",
    components: ["TopBar", "IconButton"],
  },
  {
    board: "LAYOUT L07",
    target: "로그인 소개 아래",
    value: "72",
    reason: "고정된 하단 로그인 버튼 묶음 높이만큼 비운다. 스케일 값(pb-18)이라 린트 예외는 없다.",
  },
  {
    board: "LAYOUT L07",
    target: "하단 안전 영역",
    value: "max(12px, env(safe-area-inset-bottom))",
    reason: "기기 값이라 스케일로 표현할 수 없다. 계산식은 시스템 유틸리티 pb-safe 한 곳에만 둔다(LAYOUT L09).",
  },
  {
    board: "LAYOUT L07",
    target: "넓은 화면의 본문 바깥 바탕과 본문 그림자",
    value: "--color-app-canvas #f2f3f5 · --shadow-app-frame",
    reason: "명세는 모바일 화면만 그려 이 자리가 없다. client 의 globals.css 에만 있다.",
  },
  {
    board: "LAYOUT L07",
    target: "앱 WebView 의 스크롤 막대",
    value: "rgb(0 0 0 / 0.35)",
    reason: "네이티브 막대를 대신 그리는 것이라 명세에 자리가 없다. client 의 globals.css 에만 있다.",
  },
  {
    board: "TYPO T09",
    target: "제품 이미지 안 '1제 · 2제' 표기",
    value: "9px",
    reason: "제품 일러스트의 일부다. 같은 정보를 구성품 탭과 칩이 12 이상으로 보충한다.",
    allow: { "no-arbitrary-values": ["text-[9px]"] },
  },
  {
    board: "STATE S10",
    target: "디렉터리 행·레일 항목의 hover",
    value: "ui-hover-on-surface (gray-100)",
    reason:
      "흰 행에 ui-hover(gray-50)를 쓰면 옆 회색 레일과 같은 색이 되어 구별되지 않는다. 토큰 hover-on-surface 로 쓴다.",
    components: ["Tabs"],
  },
  {
    board: "STATE S10",
    target: "사진·이미지 위 덮개",
    value: "gray-900 8%",
    reason: "바탕이 사진이라 '한 단계'를 정할 수 없다. 토큰 hover-overlay 로 쓴다.",
    components: ["ImageAttachment", "Notice", "Toast"],
  },
  {
    board: "STATE S10",
    target: "카카오 로그인 버튼의 눌림",
    value: "::after 덮개 gray-900 8%",
    reason: "브랜드 가이드 색을 바꿀 수 없고, 노란 면에 불투명도를 주면 바래 보여 덮개로 진하게 한다.",
  },
  {
    board: "색상 팔레트 · 따로 관리하는 색",
    target: "카카오·구글 로그인 버튼과 G 로고",
    value: "brand-kakao-* · brand-google-* · G 로고 4색",
    reason:
      "각 회사의 브랜드 가이드 색이다. 버튼 색은 토큰(kakao-*, google-*)으로 쓰고, G 로고는 public 의 SVG 파일로 그린다.",
  },
];
