import type { Metadata } from "next";

import { CurrentTerms, CURRENT_TERMS_EFFECTIVE_DATE } from "@/components/legal/CurrentTerms";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { OPERATOR } from "@/components/legal/operator";
import { ScheduledTerms } from "@/components/legal/ScheduledTerms";
import { ScheduledTermsDisclosure } from "@/components/legal/ScheduledTermsDisclosure";
import { SubTopBar } from "@/components/navigation/SubTopBar";

export const metadata: Metadata = {
  title: "이용약관",
  description: "Poudy 를 이용할 때 적용되는 약관입니다.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <SubTopBar title="이용약관" />
      <LegalDocument title={`${OPERATOR.serviceName} 이용약관`} effectiveDate={CURRENT_TERMS_EFFECTIVE_DATE}>
        <ScheduledTermsDisclosure label={`${OPERATOR.effectiveDate.terms} 시행 예정 약관 펼쳐보기`}>
          <p className="text-caption">시행 예정일 {OPERATOR.effectiveDate.terms}</p>
          <ScheduledTerms />
        </ScheduledTermsDisclosure>
        <CurrentTerms />
      </LegalDocument>
    </>
  );
}
