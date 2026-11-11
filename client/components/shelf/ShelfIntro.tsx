"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { useRouter } from "next/navigation";

import { GuideCarousel, type GuideStep } from "./GuideCarousel";

/** 로그인 전 파우치가 내세우는 좋은 점 셋(S54a). 사용법이 아니라 쓰면 무엇이 좋아지는지를 장면으로 보여 준다. */
const BENEFITS: readonly GuideStep[] = [
  { title: "나랑 안 맞는 성분을 찾아줘요", description: "안 맞았던 제품들에 같이 든 성분을 알려줘요.", scene: 2 },
  { title: "검색할 때 그 성분은 빼줘요", description: "나만의 필터를 켜면 나에게 맞는 제품만 보여줘요.", scene: 4 },
  { title: "처음 보는 제품도 미리 알려줘요", description: "안 맞을 수 있는 성분이 들었는지 바로 확인해요.", scene: 5 },
];

/** '파우치 기능 자세히 보기'. 좋은 점 장면 바로 아래 가운데에 두는 보조 글자 버튼이다(S54a). */
function GuideLink() {
  const router = useRouter();

  return (
    <div className="flex justify-center">
      <Button
        variant="subtle"
        onClick={() => router.push("/pouch/guide")}
        trailingIcon={<Icon name="chevron-right" size={16} scalable className="text-text-secondary" />}
      >
        파우치 기능 자세히 보기
      </Button>
    </div>
  );
}

/**
 * 로그인 전 파우치(S54a). 공감 질문 → 좋은 점 세 장면 → 그 바로 아래 자세히 보기 링크.
 * [로그인하고 내 파우치 만들기]는 화면의 유일한 다음 단계라 하단 내비 위에 붙은 행동 영역에 둔다.
 */
export function ShelfSignedOut({ onStart }: { readonly onStart: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-6 pt-4 pb-inquiry">
        <h2 className="flex flex-col gap-0.5 px-gutter text-hero leading-tight font-bold">
          <span className="text-text-primary">다들 좋다는데,</span>
          <span className="text-brand-text">왜 나한테는 안 맞을까요?</span>
        </h2>
        <div className="flex flex-col">
          <GuideCarousel steps={BENEFITS} label="내 파우치를 만들면 좋은 점" textFirst />
          <GuideLink />
        </div>
      </div>

      {/* 하단 내비가 본문 흐름 끝에 붙으므로, 행동 영역은 내비 높이만큼 띄워 그 바로 위에 붙인다. */}
      <BottomActionBar
        position="above-nav"
        action={{ label: "로그인하고 내 파우치 만들기", onClick: onStart }}
        className="bottom-(--bottom-navigation-height)"
      />
    </>
  );
}

const STEPS = ["제품 담기", "잘 맞았는지 평가", "안 맞는 성분 찾기"] as const;

/** 빈 파우치의 쓰는 순서. 번호 원 셋을 가는 선으로 잇는다(S54b). */
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
 * 빈 파우치(S54b). 빈 상태 틀(F03)처럼 가운데에 아이콘 → 제목 → 설명을 두고, 쓰는 순서와 [제품 추가하기]로 이끈다.
 * 파우치 첫 사용의 핵심 행동이라 버튼은 Primary 다.
 */
export function ShelfEmpty({ onAdd }: { readonly onAdd: () => void }) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-gutter py-10 text-center">
      {/* 아이콘과 제목 사이는 다른 줄 사이(8)보다 넓은 16 이다. */}
      <span aria-hidden="true" className="flex pb-2 text-text-secondary">
        <Icon name="vanity-case" size={28} />
      </span>
      <h2 className="text-section leading-snug font-bold text-text-primary">파우치가 아직 비어 있어요</h2>
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
        <Button variant="subtle" onClick={() => router.push("/pouch/guide")}>
          파우치는 어떻게 쓰나요?
        </Button>
      </div>
    </div>
  );
}
