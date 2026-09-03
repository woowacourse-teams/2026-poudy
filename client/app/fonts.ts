import { Foldit, Geist_Mono, Noto_Sans_KR } from "next/font/google";

// 디자인(v1.pen)의 ui-font 는 Noto Sans KR 이다. 한글 글리프는 subsets 로 고르지
// 않고 unicode-range 로 제공되므로 latin 만 지정한다.
export const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

// 가격과 용량 같은 수치 표기에 쓴다(v1.pen 의 font-data).
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// 헤더의 서비스 이름에만 쓴다. 굵기를 조절할 수 있는 글꼴이라 쓰는 굵기만 받는다.
export const foldit = Foldit({
  variable: "--font-foldit",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});
