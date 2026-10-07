import { Geist_Mono } from "next/font/google";

/*
 * 본문 글꼴 Pretendard 는 next/font 가 아니라 layout.tsx 에서 패키지의 동적 부분 집합 CSS 로 불러온다.
 * 한글을 92개 조각으로 나눠 unicode-range 로 두었기 때문에, 화면에 나온 글자의 조각만 받는다.
 */

// 가격과 용량 같은 수치 표기에 쓴다(v1.pen 의 font-data).
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
