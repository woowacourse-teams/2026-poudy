import type { Metadata } from "next";

import { PRODUCT_REQUEST } from "@/components/inquiry/inquiry-type";
import { InquiryScreen } from "@/components/inquiry/InquiryScreen";
import { PRODUCT_NAME_MAX_LENGTH } from "@/lib/api/feedback";
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
 * from 은 문의를 연 화면의 경로다. 주소창에서 고칠 수 있는 값이므로 우리 화면의 경로인지 보고 나서 쓴다.
 * type 은 제품 등록 요청만 받고, productName 은 그때만 제품명 칸에 채운다. 둘 다 주소창에서 고칠 수 있어 길이를 자른다.
 * useSearchParams 로 읽으면 Suspense 경계가 필요해 서버 컴포넌트가 읽어 넘긴다.
 */
export default async function InquiryPage(props: PageProps<"/inquiry">) {
  const { from, type, productName } = await props.searchParams;
  const productRequest = type === PRODUCT_REQUEST;

  return (
    <InquiryScreen
      originPath={toOriginPath(typeof from === "string" ? from : undefined)}
      initialChoice={productRequest ? PRODUCT_REQUEST : undefined}
      initialProductName={
        productRequest && typeof productName === "string"
          ? productName.trim().slice(0, PRODUCT_NAME_MAX_LENGTH)
          : undefined
      }
    />
  );
}
