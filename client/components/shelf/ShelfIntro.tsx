"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { ShelfIllustration, type ShelfIllustrationName } from "./ShelfIllustration";

type Benefit = {
  readonly illustration: ShelfIllustrationName;
  readonly title: string;
  readonly description: string;
};

/** 로그인 전 선반이 내세우는 좋은 점 셋(S54a). 사용법이 아니라 왜 만들지를 말한다. 사용법은 소개 페이지(S54d)가 맡는다. */
const BENEFITS: readonly Benefit[] = [
  {
    illustration: "ingredientHint",
    title: "같은 실수는 줄여요",
    description: "안 맞았던 제품의 공통 성분을 알려 줘요",
  },
  {
    illustration: "myPick",
    title: "피하고 싶은 성분은 걸러 줘요",
    description: "고른 성분이 든 제품은 검색에서 빼요",
  },
  { illustration: "record", title: "내 경험으로 골라요", description: "써 본 화장품이 쌓여 내 기준이 돼요" },
];

/** '선반 기능 자세히 보기'. 위에 선을 긋고 행 전체를 누르는 한 줄 링크다(S54a). */
function GuideRow() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/shelf/guide"
      {...pressableProps}
      className="pressable fb-surface flex min-h-12 items-center justify-between gap-2 border-t border-border text-body leading-none font-semibold text-text-primary"
    >
      선반 기능 자세히 보기
      <Icon name="chevron-right" size={16} scalable className="text-text-secondary" />
    </Link>
  );
}

/**
 * 로그인 전 선반(S54a). 공감 질문 → 한 줄 약속 → '내 선반을 만들면' 좋은 점 셋 → 자세히 보기 링크.
 * [로그인하고 내 선반 만들기]는 화면의 유일한 다음 단계라 하단 내비 위에 붙은 행동 영역에 둔다.
 */
export function ShelfSignedOut({ onStart }: { readonly onStart: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-3 px-gutter pt-4 pb-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="flex flex-col gap-0.5 text-hero leading-tight font-bold">
              <span className="text-text-primary">다들 좋다는데,</span>
              <span className="text-brand-text">왜 나한테는 안 맞을까요?</span>
            </h2>
            <p className="text-title leading-normal text-text-body">남의 후기 말고, 내 경험을 기준으로 골라 보세요.</p>
          </div>

          <section aria-labelledby="shelf-benefits-title" className="flex flex-col gap-3">
            <h3 id="shelf-benefits-title" className="text-body leading-snug font-semibold text-text-secondary">
              내 선반을 만들면
            </h3>
            <ul className="flex flex-col gap-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title} className="flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface">
                    <ShelfIllustration name={benefit.illustration} size={48} />
                  </span>
                  <p className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-bar leading-snug font-bold text-text-primary">{benefit.title}</span>
                    <span className="text-body leading-snug text-text-secondary">{benefit.description}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <GuideRow />
      </div>

      {/* 하단 내비가 본문 흐름 끝에 붙으므로, 행동 영역은 내비 높이만큼 띄워 그 바로 위에 붙인다. */}
      <BottomActionBar
        position="above-nav"
        action={{ label: "로그인하고 내 선반 만들기", onClick: onStart }}
        className="bottom-(--bottom-navigation-height)"
      />
    </>
  );
}

const STEPS = ["제품 담기", "잘 맞았는지 평가", "안 맞는 성분 찾기"] as const;

/** 빈 선반의 쓰는 순서. 번호 원 셋을 가는 선으로 잇는다(S54b). */
function UsageSteps() {
  return (
    <ol aria-label="쓰는 순서" className="relative flex w-70 gap-2 pt-4 pb-2">
      {/* 첫 원의 가운데에서 마지막 원의 가운데까지 잇는 선. 원 뒤에 깔려 원 사이에만 보인다. */}
      <span aria-hidden="true" className="absolute inset-x-11 top-7 h-px bg-border" />
      {STEPS.map((step, index) => (
        <li key={step} className="relative flex flex-1 flex-col items-center gap-0.5">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-full bg-surface text-caption leading-snug font-bold text-text-secondary"
          >
            {index + 1}
          </span>
          <span className="text-center text-caption leading-snug font-medium text-text-secondary">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * 빈 선반(S54b). 빈 상태 틀(F03)처럼 가운데에 아이콘 → 제목 → 설명을 두고, 쓰는 순서와 [제품 추가하기]로 이끈다.
 * 선반 첫 사용의 핵심 행동이라 버튼은 Primary 다.
 */
export function ShelfEmpty({ onAdd }: { readonly onAdd: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-gutter py-10 text-center">
      {/* 아이콘과 제목 사이는 다른 줄 사이(8)보다 넓은 16 이다. */}
      <span aria-hidden="true" className="flex pb-2 text-text-secondary">
        <Icon name="archive" size={28} />
      </span>
      <h2 className="text-section leading-snug font-bold text-text-primary">선반이 아직 비어 있어요</h2>
      <p className="text-body-sm leading-normal text-text-secondary">
        써 본 제품을 담고 잘 맞았는지 평가하면
        <br />
        나와 안 맞는 성분을 찾아 드려요.
      </p>
      <UsageSteps />
      <div className="flex w-full flex-col items-center gap-0.5 pt-2">
        <Button className="w-50" onClick={onAdd}>
          제품 추가하기
        </Button>
        <Link
          href="/shelf/guide"
          {...pressableProps}
          className="pressable fb-surface flex min-h-11 w-full items-center justify-center rounded-xl text-body-sm leading-none font-semibold text-text-secondary"
        >
          선반은 어떻게 쓰나요?
        </Link>
      </div>
    </div>
  );
}
