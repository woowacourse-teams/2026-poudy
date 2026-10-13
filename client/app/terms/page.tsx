import type { Metadata } from "next";

import { CurrentTerms, CURRENT_TERMS_EFFECTIVE_DATE } from "@/components/legal/CurrentTerms";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { OPERATOR } from "@/components/legal/operator";
import { ScheduledTerms } from "@/components/legal/ScheduledTerms";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "이용약관",
  description: "Poudy 를 이용할 때 적용되는 약관입니다.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <TopBar title="이용약관" variant="sub" />
      <LegalDocument title={`${OPERATOR.serviceName} 이용약관`} effectiveDate={CURRENT_TERMS_EFFECTIVE_DATE}>
        <details className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
            {OPERATOR.effectiveDate.terms} 시행 예정 약관 펼쳐보기
          </summary>
          <div className="mt-4 flex flex-col gap-6 border-t border-border pt-4">
            <p className="text-[12px]">시행 예정일 {OPERATOR.effectiveDate.terms}</p>
            <ScheduledTerms />
          </div>
        </details>
        <CurrentTerms />
      </LegalDocument>
    </>
  );
}
