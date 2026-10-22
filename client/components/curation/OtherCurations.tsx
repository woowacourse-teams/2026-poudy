"use client";

import type { BannerResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";
import Link from "next/link";

import { track } from "@/lib/analytics/track";
import { type CurationBanner, isCurationBanner } from "@/lib/domain/banner";
import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";
import { GUTTERED_FULL_SIZES } from "@/lib/layout-tokens";

type OtherCurationsProps = {
  /** 지금 보고 있는 큐레이션. 목록에서 뺀다. */
  readonly currentId: number;
  readonly curations: readonly BannerResponse[];
};

/**
 * 큐레이션을 다 읽은 뒤에 이어 볼 다른 큐레이션(명세 S20b '다른 이야기도 준비했어요').
 *
 * 본문을 끝까지 내려온 사람은 되돌아가지 않고 다음 읽을 거리를 찾는다. 홈으로 돌아가 캐러셀을 넘기지 않아도 여기서
 * 바로 이어 가게 한다. 이어 볼 것이 없으면 제목째 그리지 않는다.
 */
export function OtherCurations({ currentId, curations }: OtherCurationsProps) {
  const others = curations.filter(isCurationBanner).filter(({ target }) => target.curationId !== currentId);
  if (others.length === 0) return null;

  return (
    <section aria-labelledby="other-curations" className="flex flex-col gap-4 px-gutter pt-8">
      <h2 id="other-curations" className="text-section font-bold text-text-primary">
        다른 이야기도 준비했어요
      </h2>

      <ul className="flex flex-col gap-3">
        {others.map((curation, index) => (
          <li key={curation.id}>
            <OtherCurationCard curation={curation} position={index + 1} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 카드 하나(높이 128, 안쪽 여백 20, 모서리 16). 본문을 다 읽은 뒤 훑어보는 목록이라 낮게 두어 한 화면에 여러 장이 든다.
 * 썸네일은 자리를 채우도록 자르되 아래쪽을 붙들어 위쪽만 잘리게 한다. 높이는 최소값이라 글자를 키우면 카드가 자란다.
 * 눌림은 카드 크기와 사진 위 덮개다(STATE S07 · S10). 덮개는 ::after 라 카드 크기를 바꾸지 않는다.
 */
function OtherCurationCard({ curation, position }: { readonly curation: CurationBanner; readonly position: number }) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={`/curations/${curation.target.curationId}`}
      {...pressableProps}
      onClick={() =>
        track("curation_opened", { curation_id: curation.target.curationId, position, surface: "curation_detail" })
      }
      className="pressable press-scale fb-overlay relative flex min-h-32 flex-col justify-end overflow-clip rounded-2xl p-5 select-none"
    >
      {/* 그림 속 문구는 카드 글자가 전하므로 alt 를 비운다(A11Y D05). 본문을 다 내려온 뒤에야 보이는 자리라 미뤄 받는다. */}
      <Image
        src={imageDeliveryUrl(curation.imageUrl)}
        alt=""
        fill
        sizes={GUTTERED_FULL_SIZES}
        draggable={false}
        className="object-cover object-bottom"
      />
      <div className="relative flex flex-col gap-2">
        <h3 className="text-block font-bold whitespace-pre-line text-text-primary">{curation.title}</h3>
        <p className="text-label whitespace-pre-line text-text-primary">{curation.description}</p>
      </div>
    </Link>
  );
}
