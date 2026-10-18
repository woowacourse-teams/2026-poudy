import { Skeleton } from "@poudy/design-system/skeleton";
import Image from "next/image";

import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";

type BrandHeroProps = {
  readonly name: string;
  readonly englishName?: string | null;
  readonly imageUrl?: string | null;
  /** 상세 응답에는 제품 수가 없어 목록에서 찾는다. 찾지 못하면 줄에서 뺀다. */
  readonly productCount?: string;
};

/*
 * 머리의 자리(명세 S30 '브랜드 히어로'). 위 12 · 좌우 거터(LAYOUT L09) · 안쪽 4, 로고와 이름 사이 12.
 * 본문 위 여백은 이 머리가 화면의 첫 내용이라 여기서 맡는다.
 */
const FRAME = "px-gutter pt-3";
const ROW = "flex items-center gap-3 px-1";

/**
 * 브랜드 상세의 머리. 원형 로고 40 과 이름(h1), 영문명 · 제품 수 줄이다.
 *
 * 로고 그림은 가로로 긴 것이 많아 채우면 좌우가 잘린다. 전체가 들어오게 맞추고 안쪽을 4 띄운다.
 * 옆에 이름이 있으므로 로고는 낭독하지 않는다(alt '').
 */
export function BrandHero({ name, englishName, imageUrl, productCount }: BrandHeroProps) {
  const detail = [englishName, productCount === undefined ? null : `제품 ${productCount}`].filter(Boolean).join(" · ");

  return (
    <section className={FRAME}>
      <div className={ROW}>
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-info-soft bg-background text-14 font-bold text-text-secondary"
        >
          {imageUrl ? (
            <Image
              src={imageDeliveryUrl(imageUrl)}
              alt=""
              width={40}
              height={40}
              loading="eager"
              className="size-full object-contain p-1"
            />
          ) : (
            name.trim().charAt(0)
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-screen font-bold break-keep text-text-primary">{name}</h1>
          {detail ? <p className="text-label font-medium text-text-secondary">{detail}</p> : null}
        </div>
      </div>
    </section>
  );
}

/** 제품 수가 오기 전의 자리. 실제 머리와 같은 크기로 둔다(FEEDBACK F02). */
export function BrandHeroSkeleton() {
  return (
    <div aria-hidden="true" className={FRAME}>
      <div className={ROW}>
        <Skeleton shape="circle" className="size-10" />
        <div className="flex flex-col gap-1.5">
          <Skeleton shape="line" size={20} className="w-24" />
          <Skeleton shape="line" size={11} className="w-32" />
        </div>
      </div>
    </div>
  );
}
