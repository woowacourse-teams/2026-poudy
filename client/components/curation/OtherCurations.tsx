"use client";

import type { CurationSummaryResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";

import { track } from "@/lib/analytics/track";

type OtherCurationsProps = {
  /** 지금 보고 있는 큐레이션. 목록에서 뺀다. */
  readonly currentId: number;
  readonly curations: readonly CurationSummaryResponse[];
};

/**
 * 큐레이션을 다 읽은 뒤에 이어 볼 다른 큐레이션. 홈 캐러셀과 같은 카드를 세로로 쌓는다.
 *
 * 본문을 끝까지 내려온 사람은 되돌아가지 않고 다음 읽을 거리를 찾는다. 홈으로 돌아가
 * 캐러셀을 넘기지 않아도 여기서 바로 이어 가게 한다. 이어 볼 것이 없으면 제목째 그리지 않는다.
 */
export function OtherCurations({ currentId, curations }: OtherCurationsProps) {
  const others = curations.filter(({ id }) => id !== currentId);
  if (others.length === 0) return null;

  return (
    <section aria-labelledby="other-curations" className="flex flex-col gap-4 pt-8">
      {/* 홈의 영역 제목과 같은 크기로 두어 본문 블록과 갈린다. */}
      <h2 id="other-curations" className="px-4 text-[17px] font-bold text-text-primary">
        다른 이야기도 준비했어요
      </h2>

      {/* 카드는 목록 제목, 본문의 제품 격자와 같은 16px 여백 안에 선다. */}
      <ul className="flex flex-col gap-3 px-4">
        {others.map((curation, index) => (
          <li key={curation.id}>
            <Link
              href={`/curations/${curation.id}`}
              onClick={() =>
                track("curation_opened", { curation_id: curation.id, position: index + 1, surface: "curation_detail" })
              }
              className="block"
            >
              {/*
                높이는 128px 로 낮게 둔다. 본문을 다 읽은 뒤 훑어보는 목록이라 한 화면에 여러 장이
                들어와야 고르기 쉽다. 두 줄 제목과 두 줄 설명이 잘리지 않는 가장 낮은 높이다. 썸네일은 자리를 채우도록 잘라 쓰되 아래쪽을 붙들어 위쪽만 잘리게 하고(`object-cover`, `object-bottom`), 모서리와
                제목·설명의 자리는 홈 카드와 같게 둔다. 본문을 다 내려온 뒤에야 보이는 자리라
                그림은 미뤄 받는다.
              */}
              <article className="relative flex h-32 flex-col justify-end overflow-hidden rounded-[18px] p-5">
                <Image
                  src={curation.thumbnailImageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 448px) calc(100vw - 32px), 416px"
                  className="object-cover object-bottom"
                />

                {/* 카드 위에서 줄을 나누려고 넣은 줄바꿈이라 홈 카드처럼 그대로 살린다. */}
                <div className="relative flex flex-col gap-1.5">
                  <h3 className="text-[18px] leading-[1.28] font-bold whitespace-pre-line text-text-primary">
                    {curation.title}
                  </h3>
                  <p className="text-[11px] whitespace-pre-line text-text-primary">{curation.description}</p>
                </div>
              </article>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
