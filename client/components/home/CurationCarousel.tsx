"use client";

import {
  CurationCarousel as Carousel,
  CurationCarouselCard,
  CurationCarouselGuideCard,
  CurationCarouselSlide,
} from "@poudy/design-system/curation-carousel";
import Image from "next/image";
import Link from "next/link";

import { track } from "@/lib/analytics/track";
import type { CurationBanner } from "@/lib/domain/banner";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";
import { GUTTERED_FULL_SIZES } from "@/lib/layout-tokens";

type CurationCarouselProps = {
  readonly items: readonly CurationBanner[];
  /** 맨 앞에 서비스 가이드 장을 둘지. 홈은 늘 둔다. 큐레이션 동작만 따로 살필 때 끈다. */
  readonly withGuide?: boolean;
};

/**
 * 디자인 S01 의 큐레이션 캐러셀. 넘기는 동작과 카드 모양은 디자인 시스템의 CurationCarousel 이 맡고,
 * 여기서는 받은 큐레이션을 카드로 채우고 분석 이벤트를 보낸다.
 *
 * 카드를 받은 순서대로 한 번씩만 그린다. 끝에서 처음으로 이어 돌지 않고, 스스로 넘기다 마지막 카드에 닿으면
 * 첫 카드로 되감는다(design-system/src/curation-carousel.tsx).
 */
export function CurationCarousel({ items, withGuide = true }: CurationCarouselProps) {
  const sectionRef = useHomeSectionView("curation", 1);
  /*
   * 맨 앞에 서비스 가이드(디자인 S20c)를 한 장 더 둔다. 서비스를 막 연 때라 누구에게나 첫 장으로
   * 보여 준다. 그 장이 있으면 큐레이션은 한 칸씩 뒤로 밀리므로, 칸 번호에서 큐레이션 번호를 얻을 때
   * 이만큼 뺀다.
   */
  const offset = withGuide ? 1 : 0;

  return (
    <Carousel
      ref={sectionRef}
      label="큐레이션"
      onSlideSettle={(slideIndex, transition) => {
        /* 가이드 장은 큐레이션이 아니라 세지 않는다. 자리는 큐레이션 목록 안에서 센다. */
        const item = items[slideIndex - offset];
        if (!item) return;
        track("curation_slide_viewed", {
          curation_id: item.target.curationId,
          position: slideIndex - offset + 1,
          transition,
        });
      }}
    >
      {withGuide ? (
        /*
          서비스 소개(/about)로 가는 길을 연다. 닫기 버튼은 두지 않는다.
          넘기기와 옆 칸 누르기는 큐레이션 카드와 똑같이 다룬다.
        */
        <CurationCarouselSlide
          key="service-guide"
          index={0}
          onOpen={() => track("service_guide_opened", { surface: "home" })}
        >
          <Link href="/about">
            <CurationCarouselGuideCard
              badge="서비스 가이드"
              badgeIcon="book"
              title={"다들 좋다는데,\n왜 나한테는 안 맞을까요?"}
              description="선반에 모으면 안 맞는 성분을 찾아 드려요"
            />
          </Link>
        </CurationCarouselSlide>
      ) : null}
      {items.map((curation, itemIndex) => (
        /* 카드 전체가 상세로 가는 링크다. 그림과 글자 어디를 눌러도 같은 곳으로 간다. */
        <CurationCarouselSlide
          key={curation.id}
          index={itemIndex + offset}
          onOpen={() =>
            track("curation_opened", {
              curation_id: curation.target.curationId,
              position: itemIndex + 1,
              surface: "home",
            })
          }
        >
          <Link href={`/curations/${curation.target.curationId}`}>
            <CurationCarouselCard
              /*
                그림을 끌어도 브라우저가 그것을 집어 들지 않게 한다. 그대로 두면 마우스로
                카드를 끄는 순간 그림 옮기기가 시작되어, 목록을 미는 동작이 끊긴다.
              */
              image={
                <Image
                  src={curation.imageUrl}
                  alt=""
                  fill
                  sizes={GUTTERED_FULL_SIZES}
                  {...(itemIndex === 0 ? { priority: true } : { loading: "eager" as const })}
                  draggable={false}
                  className="object-cover select-none"
                />
              }
              title={curation.title}
              description={curation.description}
            />
          </Link>
        </CurationCarouselSlide>
      ))}
    </Carousel>
  );
}
