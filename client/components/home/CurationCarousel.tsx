"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, type PointerEvent, type ReactNode, useCallback, useRef, useState } from "react";

import { track } from "@/lib/analytics/track";
import type { CurationBanner } from "@/lib/domain/banner";
import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";
import { CURATION_CARD_SIZES } from "@/lib/layout-tokens";

type CurationCarouselProps = {
  readonly items: readonly CurationBanner[];
  /** 맨 앞에 서비스 가이드 장을 둘지. 홈은 늘 둔다. 큐레이션 동작만 따로 살필 때 끈다. */
  readonly withGuide?: boolean;
};

/** 카드가 이만큼 보이면 가운데에 왔다고 본다. 옆에 걸친 카드는 10px 남짓이라 이 값에 닿지 않는다. */
const CENTERED_RATIO = 0.75;

/**
 * 마우스로 끌기로 받아들이는 최소 거리(px). 누를 때 손이 미세하게 흔들리는 것까지 끌기로 받으면, 카드를 눌러 상세로
 * 갈 때마다 목록이 조금씩 밀린다.
 */
const DRAG_THRESHOLD = 5;

/** 마우스로 이만큼 넘게 끌고 놓으면 옆 카드로 넘긴다(px). 덜 끌었으면 제자리로 돌아온다. */
const DRAG_SWITCH = 40;

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** 한 칸을 가운데로 데려온다. 스냅이 켜진 목록이라 브라우저가 칸 가운데에 맞춰 멈춘다. */
const bringToCenter = (slide: Element | undefined) =>
  slide?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest", inline: "center" });

/**
 * 홈 큐레이션 캐러셀(명세 S20 · S20c).
 *
 * 첫 장은 서비스 가이드이고 그 뒤로 큐레이션을 받은 순서대로 한 번씩 놓는다. 카드는 거터 안쪽 폭에서 좌우 18(옆 카드가
 * 걸치는 10 + 사이 8)을 뺀 폭이다.
 *
 * 넘기는 일은 브라우저의 가로 스크롤과 스냅에 맡긴다. 손가락·트랙패드·휠·키보드(Tab 으로 옆 카드에 가면 브라우저가 그
 * 카드를 화면 안으로 스크롤한다)가 모두 기본 동작을 쓴다. 마우스만 끄는 기본 동작이 없어 끌기를 직접 받는다.
 *
 * 스스로 넘기지 않는다. 5초 넘게 이어지는 장식 반복은 쓰지 않는다(MOTION M03). 옆 카드를 줄여 그리지도 않는다.
 * 가운데 카드를 알려면 스크롤마다 자리를 재야 하기 때문이다. 어느 카드가 가운데인지는 IntersectionObserver 가 알린다.
 */
export function CurationCarousel({ items, withGuide = true }: CurationCarouselProps) {
  const sectionRef = useHomeSectionView("curation", 1);
  /* 가이드 장이 있으면 큐레이션은 한 칸씩 뒤로 밀린다. 칸 번호에서 큐레이션 번호를 얻을 때 이만큼 뺀다. */
  const offset = withGuide ? 1 : 0;
  const slideCount = items.length + offset;
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLUListElement | null>(null);
  /* 마우스로 끄는 동안의 상태. 누른 자리와 바로 전 자리를 담아 움직인 만큼만 목록을 민다. */
  const drag = useRef<{ pointerId: number; startX: number; lastX: number; moved: boolean } | undefined>(undefined);
  /*
   * 방금 끝난 동작이 끌기였는지. 브라우저는 끌기가 끝난 자리에서도 클릭을 한 번 보낸다. 카드가 상세로 가는 링크라
   * 가리지 않으면 목록을 밀 때마다 상세 화면이 열린다.
   */
  const dragged = useRef(false);

  /*
   * 가운데에 온 카드를 듣는다. 스크롤마다 자리를 재지 않고 브라우저가 겹침을 알려 줄 때만 받는다.
   * ref 콜백이 정리 함수를 돌려주므로(React 19) 효과 훅 없이 목록이 붙을 때 지켜보고 떨어질 때 멈춘다.
   */
  const observeSlides = useCallback(
    (list: HTMLUListElement | null) => {
      trackRef.current = list;
      if (!list || typeof IntersectionObserver === "undefined") return;

      let viewed = 0;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < CENTERED_RATIO) continue;
            const slide = Number((entry.target as HTMLElement).dataset.slide);
            setCurrent(slide);
            if (slide === viewed) continue;
            viewed = slide;
            /* 가이드 장은 큐레이션이 아니라 세지 않는다. 자리는 큐레이션 목록 안에서 센다. */
            const item = items[slide - offset];
            if (item) {
              track("curation_slide_viewed", {
                curation_id: item.target.curationId,
                position: slide - offset + 1,
                transition: "manual",
              });
            }
          }
        },
        { root: list, threshold: CENTERED_RATIO },
      );
      for (const slide of list.children) observer.observe(slide);
      return () => observer.disconnect();
    },
    [items, offset],
  );

  const onPointerDown = (event: PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX, moved: false };
  };

  /** 끈 만큼 목록을 민다. 자리를 재지 않고 움직인 거리만 넘긴다. */
  const onPointerMove = (event: PointerEvent<HTMLUListElement>) => {
    const list = trackRef.current;
    const active = drag.current;
    if (!list || !active || active.pointerId !== event.pointerId) return;
    if (!active.moved && Math.abs(event.clientX - active.startX) < DRAG_THRESHOLD) return;

    if (!active.moved) {
      active.moved = true;
      /* 목록 밖으로 나가도 끌기가 이어지게 포인터를 붙든다. 끄는 동안 스냅이 칸으로 끌어당기지 않게 끈다. */
      list.setPointerCapture(event.pointerId);
      list.style.scrollSnapType = "none";
    }
    list.scrollBy({ left: active.lastX - event.clientX });
    active.lastX = event.clientX;
  };

  /** 손을 뗐다. 충분히 끌었으면 옆 카드로, 아니면 제자리 카드로 붙인다. */
  const endDrag = (event: PointerEvent<HTMLUListElement>) => {
    const list = trackRef.current;
    const finished = drag.current;
    drag.current = undefined;
    if (!list || !finished || finished.pointerId !== event.pointerId || !finished.moved) return;

    if (list.hasPointerCapture(event.pointerId)) list.releasePointerCapture(event.pointerId);
    list.style.scrollSnapType = "";
    dragged.current = true;
    setTimeout(() => {
      dragged.current = false;
    }, 0);

    const shifted = finished.startX - event.clientX;
    const step = Math.abs(shifted) < DRAG_SWITCH ? 0 : Math.sign(shifted);
    const target = Math.min(slideCount - 1, Math.max(0, current + step));
    bringToCenter(list.children[target]);
  };

  /**
   * 카드를 눌렀다. 끈 뒤라면 무시하고, 옆에 걸친 카드라면 상세로 가지 않고 그 카드를 가운데로 데려온다.
   * 걸친 카드는 대개 넘기려고 누른 것이다. 가운데 카드면 true 를 돌려 이동을 이어 간다.
   */
  const pass = (event: MouseEvent<HTMLAnchorElement>, slide: number) => {
    if (dragged.current) {
      event.preventDefault();
      return false;
    }
    if (slide !== current) {
      event.preventDefault();
      bringToCenter(trackRef.current?.children[slide]);
      return false;
    }
    return true;
  };

  /* 가이드 장을 끄고 큐레이션도 없으면 보여 줄 것이 없다. */
  if (slideCount === 0) return null;

  return (
    <section ref={sectionRef} aria-label="큐레이션">
      <ul
        ref={observeSlides}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="scrollbar-none flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto px-4.5"
      >
        {withGuide ? (
          <Slide index={0}>
            <GuideCard
              onClick={(event) => {
                if (pass(event, 0)) track("service_guide_opened", { surface: "home" });
              }}
            />
          </Slide>
        ) : null}
        {items.map((curation, itemIndex) => {
          const slide = itemIndex + offset;
          return (
            <Slide key={curation.id} index={slide}>
              <CurationCard
                curation={curation}
                priority={itemIndex === 0}
                onClick={(event) => {
                  if (pass(event, slide)) {
                    track("curation_opened", {
                      curation_id: curation.target.curationId,
                      position: itemIndex + 1,
                      surface: "home",
                    });
                  }
                }}
              />
            </Slide>
          );
        })}
      </ul>

      {/* 어느 카드가 가운데인지 낭독기에 알린다. 화면에는 자리 표시를 두지 않는다(명세 S20). */}
      {slideCount > 1 ? (
        <p aria-live="polite" className="sr-only">
          큐레이션 {current + 1} / {slideCount}
        </p>
      ) : null}
    </section>
  );
}

/** 칸 하나. 칸의 폭은 목록의 안쪽 폭(좌우 18 을 뺀 폭)이고, 높이는 가장 높은 카드에 맞춘다. */
function Slide({ index, children }: { readonly index: number; readonly children: ReactNode }) {
  return (
    <li data-slide={index} className="flex w-full shrink-0 snap-center">
      {children}
    </li>
  );
}

/*
 * 카드 모양. 비율은 약 15:8 이고(IMAGE P01) 최소 높이로만 쓴다. 기기 글자 크기를 키워 글자가 다 들어가지 않으면 그만큼
 * 세로로 자란다. overflow-hidden 이면 비율이 높이를 고정해 넘친 제목이 잘리므로 overflow-clip 을 쓴다.
 * 눌림은 카드 크기(press-scale)와 사진 위 덮개(fb-overlay)다(STATE S07 · S10). 덮개는 ::after 라 카드 크기를 바꾸지 않는다.
 */
const CARD =
  // eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 큐레이션 배너 비율 15:8(IMAGE P01)을 표현할 토큰이 없다 · 만료 2026-11-30
  "pressable press-scale fb-overlay relative flex aspect-[15/8] w-full overflow-clip rounded-3xl px-5 pt-5 pb-2 select-none";

function GuideCard({ onClick }: { readonly onClick: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href="/about"
      draggable={false}
      {...pressableProps}
      onClick={onClick}
      className={`${CARD} flex-col items-start justify-between gap-2 bg-brand-soft`}
    >
      {/* 오른쪽 위의 빛은 꾸밈이다. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-1.5 -right-8 size-44 rounded-full bg-radial from-background to-brand-soft"
      />
      <span className="relative flex min-h-5.5 items-center gap-1 rounded-full bg-background px-2 text-label font-semibold text-brand-text">
        <Icon name="book" size={12} scalable />
        서비스 가이드
      </span>
      <div className="relative flex flex-col gap-1">
        <h3 className="text-block font-bold whitespace-pre-line text-text-primary">
          {"3단계로 알아보는\n파우디 사용법"}
        </h3>
        <p className="text-caption text-brand-text">원하는 성분, 피하고 싶은 성분만 고르면 돼요</p>
      </div>
    </Link>
  );
}

function CurationCard({
  curation,
  priority,
  onClick,
}: {
  readonly curation: CurationBanner;
  readonly priority: boolean;
  readonly onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={`/curations/${curation.target.curationId}`}
      draggable={false}
      {...pressableProps}
      onClick={onClick}
      className={`${CARD} flex-col justify-end`}
    >
      {/*
        카드는 몇 장 되지 않고 넘기자마자 보여야 해서 미루지 않는다. 가이드 장이 없을 때 첫 화면이 되는 첫 카드는 먼저 받는다.
        그림 속 문구는 카드 글자가 전하므로 alt 를 비운다(A11Y D05). 그림 위 막은 두지 않아 글자는 짙은 색이다.
      */}
      <Image
        src={imageDeliveryUrl(curation.imageUrl)}
        alt=""
        fill
        sizes={CURATION_CARD_SIZES}
        loading="eager"
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
        className="object-cover"
      />
      <div className="relative flex flex-col gap-1">
        <h3 className="text-block font-bold whitespace-pre-line text-curation-title">{curation.title}</h3>
        <p className="text-caption whitespace-pre-line text-curation-body">{curation.description}</p>
      </div>
    </Link>
  );
}
