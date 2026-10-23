"use client";

import { DisclosureGroup } from "@poudy/design-system/disclosure";

import { FaqRow, SHELF_FAQS } from "@/components/shelf/ShelfFaq";

/**
 * 서비스 소개(S56)의 자주 묻는 질문. 선반의 질문에, 처음 온 사람이 먼저 궁금해할 로그인 질문을 더한다.
 * 선반과 같은 질문은 선반 화면의 답을 그대로 써서 두 곳의 답이 어긋나지 않게 한다.
 */
const ABOUT_FAQS = [
  ...SHELF_FAQS,
  {
    question: "로그인하지 않아도 쓸 수 있나요?",
    answer:
      "성분으로 제품을 찾고 전성분을 확인하는 건 로그인 없이도 쓸 수 있어요. 선반과 나만의 필터는 로그인하면 쓸 수 있어요.",
  },
] as const;

/** 따로 열고 닫으며, 처음에는 첫 질문만 펼쳐 둔다. */
export function AboutFaq() {
  return (
    <DisclosureGroup type="multiple" defaultValue={[ABOUT_FAQS[0].question]}>
      {ABOUT_FAQS.map((faq) => (
        <FaqRow key={faq.question} question={faq.question} answer={faq.answer} />
      ))}
    </DisclosureGroup>
  );
}
