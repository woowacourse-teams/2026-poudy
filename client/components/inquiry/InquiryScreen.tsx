import { InquiryForm } from "./InquiryForm";

import { TopBar } from "@/components/ui/TopBar";

/** 일반 문의. 유형을 고르고 나서 그 아래 입력 항목이 나타난다. */
export function InquiryScreen({ originPath }: { readonly originPath?: string }) {
  return (
    <>
      {/* 폼은 화면보다 조금 길 뿐이라 살짝만 움직여도 그림자가 나타났다 사라진다. 깜빡이지 않도록 끈다. */}
      <TopBar title="문의하기" variant="sub" edge={false} />
      <InquiryForm originPath={originPath} />
    </>
  );
}
