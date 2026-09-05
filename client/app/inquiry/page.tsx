import type { Metadata } from "next";

import { InquiryScreen } from "@/components/inquiry/InquiryScreen";
import { toOriginPath } from "@/lib/domain/origin-path";

export const metadata: Metadata = {
  title: "문의하기",
  description: "Poudy에 오류 신고와 제품 등록을 요청해 보세요.",
  alternates: { canonical: "/inquiry" },
  /* 접수 화면은 검색에 걸릴 이유가 없다. */
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

/**
 * from 은 문의를 연 화면의 경로다. 주소창에서 고칠 수 있는 값이므로
 * 우리 화면의 경로인지 보고 나서 쓴다.
 */
export default async function InquiryPage(props: PageProps<"/inquiry">) {
  const { from } = await props.searchParams;

  return <InquiryScreen originPath={toOriginPath(typeof from === "string" ? from : undefined)} />;
}
