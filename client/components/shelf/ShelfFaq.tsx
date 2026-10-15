"use client";

import {
  Disclosure,
  DisclosureContent,
  DisclosureGroup,
  DisclosureIcon,
  DisclosureTrigger,
} from "@poudy/design-system/disclosure";

const FAQS = [
  {
    question: "안 맞을 수 있는 성분은 어떻게 찾나요?",
    answer:
      "‘안 맞았어요’로 고른 제품들의 전성분을 비교해서 함께 든 주의 성분을 찾아요. 원인이라고 단정하는 게 아니라, 먼저 살펴볼 만한 성분을 알려 드리는 거예요.",
  },
  {
    question: "제품을 몇 개 올려야 결과가 나오나요?",
    answer:
      "‘안 맞았어요’로 고른 제품이 2개 이상이면 함께 든 성분을, 1개일 때는 그 제품의 주의 성분을 보여 드려요. 평가한 제품이 늘수록 더 많은 기록으로 비교할 수 있어요.",
  },
  {
    question: "평가를 바꾸면 결과도 바뀌나요?",
    answer: "네. 평가를 고치거나 지우면, 또 제품을 선반에서 빼면 안 맞을 수 있는 성분을 바로 다시 계산해요.",
  },
  {
    question: "선반에 없는 제품은 어떻게 올리나요?",
    answer:
      "제품 추가에서 찾는 제품이 없으면 ‘등록 요청하기’를 눌러 주세요. 확인해서 등록되면 알려 드리고, 선반에도 바로 담아 둘게요.",
  },
  {
    question: "다른 사람이 내 선반을 볼 수 있나요?",
    answer:
      "아니요. 내 선반과 평가는 나만 볼 수 있어요. 남겨 주신 촉촉함·번들거림 평가는 누가 남겼는지 알 수 없게 모아, 제품의 유수분 정보를 다듬는 데만 써요.",
  },
] as const;

/** 질문 행(명세 APP · 질문 행 · 펼침). 행 전체가 펼침 버튼이고, 펼치면 아래에 답을 둔다. */
function FaqRow({ question, answer }: { readonly question: string; readonly answer: string }) {
  return (
    <Disclosure value={question}>
      <div className="border-b border-border">
        <h3>
          <DisclosureTrigger>
            <button
              type="button"
              className="fb-surface flex w-full items-center gap-3 py-4 text-left text-title font-semibold text-text-primary"
            >
              <span className="min-w-0 flex-1">{question}</span>
              <span className="flex shrink-0 text-text-secondary">
                <DisclosureIcon />
              </span>
            </button>
          </DisclosureTrigger>
        </h3>
        <DisclosureContent>
          <p className="pb-4 text-body leading-relaxed text-text-secondary">{answer}</p>
        </DisclosureContent>
      </div>
    </Disclosure>
  );
}

/** 선반 소개의 자주 묻는 질문(S54d·S54e). 따로 열고 닫으며, 처음에는 첫 질문만 펼쳐 둔다. */
export function ShelfFaq() {
  return (
    <section aria-labelledby="shelf-faq-title" className="flex flex-col px-gutter pt-6 pb-10">
      <h2 id="shelf-faq-title" className="text-block font-bold text-text-primary">
        자주 묻는 질문
      </h2>
      <DisclosureGroup type="multiple" defaultValue={[FAQS[0].question]}>
        {FAQS.map((faq) => (
          <FaqRow key={faq.question} question={faq.question} answer={faq.answer} />
        ))}
      </DisclosureGroup>
    </section>
  );
}
