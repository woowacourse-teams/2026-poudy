import Image from "next/image";

import { Icon } from "@/components/ui/icons/Icon";

const CHECKS = [
  "쓰는 제품도, 써 본 제품도 선반에 올려요",
  "제품마다 맞았는지 골라요",
  "평가한 제품이 늘수록 더 많은 기록으로 비교해요",
];

type ShelfIntroProps = {
  /** 제목의 수준. 화면 본문이면 h2, 시트 안이면 시트 제목으로 쓴다. */
  readonly titleId?: string;
};

/**
 * 선반 소개 본문(명세 APP · 선반 소개 본문). 로그인 전(S54a), 빈 선반(S54b), 기능 설명 시트(S54c)가 함께 쓴다.
 * 아래에 둘 버튼은 쓰는 쪽이 붙인다.
 */
export function ShelfIntro({ titleId }: ShelfIntroProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2">
        <h2 id={titleId} className="text-hero font-bold text-text-primary">
          안 맞았던 제품을 알려 주면
          <br />
          <span className="text-brand-text">함께 든 성분</span>을 찾아 드려요
        </h2>
        <p className="text-title leading-normal text-text-secondary">
          안 맞았던 제품들을 비교해 함께 든 성분을 찾아요. 그중 원하는 성분만 골라 검색에서 제외할 수 있어요.
        </p>
      </div>

      <div className="flex justify-center py-6">
        <Image src="/images/shelf/intro.webp" alt="" width={200} height={150} priority />
      </div>

      <ul className="flex flex-col gap-3 rounded-xl bg-surface px-5 py-4">
        {CHECKS.map((check) => (
          <li key={check} className="flex items-center gap-2 text-title text-text-body">
            <Icon name="check" size={16} className="shrink-0 text-brand-strong" />
            {check}
          </li>
        ))}
      </ul>
    </div>
  );
}
