"use client";

import { DisclosureGroup } from "@poudy/design-system/disclosure";

import { FaqRow, SHELF_FAQS } from "@/components/shelf/ShelfFaq";

/**
 * 서비스 소개(S56)의 자주 묻는 질문. 파우치의 질문에, 처음 온 사람이 먼저 궁금해할 로그인 질문을 더한다.
 * 파우치와 같은 질문은 파우치 화면의 답을 그대로 써서 두 곳의 답이 어긋나지 않게 한다.
 */
const ABOUT_FAQS = [
  ...SHELF_FAQS,
  {
    question: "로그인하지 않아도 쓸 수 있나요?",
    answer:
      "성분으로 제품을 찾고 전성분을 확인하는 건 로그인 없이도 쓸 수 있어요. 파우치와 나만의 필터는 로그인하면 쓸 수 있어요.",
  },
] as const;

/**
 * 따로 열고 닫으며, 처음에는 첫 질문만 펼쳐 둔다.
 * 이 구역은 회색 면(ui-surface)이라 hover 면을 한 단계 진하게 칠한다. 기본 hover 색은 바탕과 같아 보이지 않는다(STATE S03).
 * 면을 넓히는 폭은 구역의 좌우 여백과 같다. 600 이상은 여백이 40 이고, lg 부터는 가운데 좁은 열이라 행 폭만 칠한다.
 */
export function AboutFaq() {
  return (
    <div className="[--color-hover:var(--color-hover-on-surface)] min-[600px]:[--bleed:2.5rem] lg:[--bleed:0px]">
      <DisclosureGroup type="multiple" defaultValue={[ABOUT_FAQS[0].question]}>
        {ABOUT_FAQS.map((faq) => (
          <FaqRow key={faq.question} question={faq.question} answer={faq.answer} />
        ))}
      </DisclosureGroup>
    </div>
  );
}
