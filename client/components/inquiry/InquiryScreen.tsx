import { InquiryForm } from "./InquiryForm";

import { TopBar } from "@/components/ui/TopBar";

/** 일반 문의. 유형을 고르고 나서 그 아래 입력 항목이 나타난다. */
export function InquiryScreen({ originPath }: { readonly originPath: string }) {
  return (
    <>
      <TopBar title="문의하기" variant="sub" />
      <InquiryForm originPath={originPath} />
    </>
  );
}
