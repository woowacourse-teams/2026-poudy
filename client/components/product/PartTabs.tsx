"use client";

import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { PartChips, PartChipsToggle } from "./PartChips";

import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import { track } from "@/lib/analytics/track";
import { partHref, partOrder } from "@/lib/domain/product-parts";

/** 하위 상단 내비(TopBar sub)의 높이. 탭 줄은 그 바로 아래에 붙는다. */
const TOP_BAR_HEIGHT = 44;

type Parts = ProductDetailResponse["productParts"];

/**
 * 탭 줄이 넘치는지 지켜본다. 첫 탭과 마지막 탭이 탭 목록 안에 다 보이면 넘치지 않는 것이다.
 * 탭 목록을 기준으로 한 IntersectionObserver 라, 탭 줄이 화면 밖에 있어도 판단이 흔들리지 않는다.
 */
const useOverflowing = () => {
  const [overflowing, setOverflowing] = useState(false);

  const watch = useCallback((bar: HTMLDivElement | null) => {
    const list = bar?.querySelector<HTMLElement>('[role="tablist"]');
    const tabs = list?.querySelectorAll<HTMLElement>('[role="tab"]');
    const first = tabs?.[0];
    const last = tabs?.[tabs.length - 1];
    if (!list || !first || !last || typeof IntersectionObserver === "undefined") return undefined;

    const visible = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        /*
         * 넘침은 가로로만 따진다. 탭은 밑줄 자리를 겹치려고 목록 아래로 1px 나가 있어(-mb-px), 면적 비율로 보면
         * 다 들어가도 98% 쯤으로 잡혀 늘 넘친다고 보았다. 위아래는 rootMargin 으로 넉넉히 두고, 보이는 폭이 탭 폭보다
         * 1 넘게 모자랄 때만 잘렸다고 본다(반올림 여유).
         */
        for (const entry of entries) {
          visible.set(entry.target, entry.intersectionRect.width >= entry.boundingClientRect.width - 1);
        }
        setOverflowing(visible.get(first) === false || visible.get(last) === false);
      },
      { root: list, rootMargin: "2px 0px", threshold: [0.99, 1] },
    );
    observer.observe(first);
    observer.observe(last);
    return () => observer.disconnect();
  }, []);

  return { overflowing, watch };
};

/**
 * 탭 줄이 상단 내비 밑에 붙었는지. 붙은 채로 구성품을 바꾸면 새 구성품의 처음부터 읽게 패널 시작점으로 올린다.
 * 탭 줄 바로 앞의 표식이 내비 아래로 지나갔는지를 IntersectionObserver 로 안다.
 */
const useStuck = () => {
  const stuck = useRef(false);

  const watch = useCallback((marker: HTMLDivElement | null) => {
    if (!marker || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        stuck.current = entry.boundingClientRect.top < (entry.rootBounds?.top ?? TOP_BAR_HEIGHT);
      },
      { rootMargin: `-${TOP_BAR_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  return { stuck, watch };
};

function PartLabel({ order, part }: { readonly order: string; readonly part: Parts[number] }) {
  const caution = part.cautionCount > 0;

  return (
    <span className="flex items-center gap-1">
      <span className="text-caption leading-none font-semibold text-text-secondary">{order}</span>{" "}
      <span className="flex items-center gap-0.5">
        <TabLabel>{part.name ?? `구성품 ${order}`}</TabLabel>
        <CautionStatusIcon caution={caution} size={14} />
      </span>
      <span className="sr-only">, 주의 성분 {caution ? "있음" : "없음"}</span>
    </span>
  );
}

/**
 * S39b·S39c 구성품 탭. 구성품이 둘 이상인 제품만 탭을 두고, 하나면 패널만 그린다.
 *
 * 탭은 `partId` 를 붙인 주소로 가는 링크다(asChild). 주소에 고른 구성품이 남아 그대로 공유되고, 서버가 그 구성품을
 * 그린 화면을 돌려준다. 진입 경로도 이어 붙여 조회 이벤트가 다시 나가지 않게 한다.
 *
 * 다 들어가면 폭을 똑같이 나누고 넘치면 내용 폭대로 민다(Tabs `fit`). 넘칠 때만 오른쪽 끝에 [전체 보기]를 두고,
 * 누르면 탭 줄 자리에 구성품 칩을 펼친다(S39c-1·S39c-5·S39c-8).
 */
export function PartTabs({
  product,
  className,
  children,
}: {
  readonly product: ProductDetailResponse;
  /** 패널의 자리(여백·간격) */
  readonly className?: string;
  /** 고른 구성품의 패널 내용. 서버 컴포넌트가 그린다. */
  readonly children: React.ReactNode;
}) {
  const parts = product.productParts;
  const selectedId = product.selectedPart?.id;
  const { overflowing, watch: watchOverflow } = useOverflowing();
  const { stuck, watch: watchStuck } = useStuck();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollToPanel = useRef(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  const chipsId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  /*
   * 구성품을 바꾼 뒤 새 패널이 그려지고 나서 패널 시작점으로 올린다. 새 패널은 주소가 바뀌어 서버가 돌려준 뒤에야 생기므로
   * 누를 때 바로 옮길 수 없고, 그린 뒤에 옮긴다. 붙는 줄의 높이만큼은 패널의 scroll-margin 이 띄운다.
   */
  useEffect(() => {
    if (!scrollToPanel.current) return;
    scrollToPanel.current = false;
    panelRef.current?.scrollIntoView({ block: "start" });
  }, [selectedId]);

  if (parts.length < 2 || selectedId === undefined) {
    return <div className={className}>{children}</div>;
  }

  const select = (partId: number, always: boolean) => {
    // 이미 보고 있는 구성품을 다시 누른 것은 바꾼 것이 아니다.
    if (partId === selectedId) return;
    scrollToPanel.current = always || stuck.current;
    track("product_part_selected", { product_id: product.id, part_id: partId, previous_part_id: selectedId });
  };

  return (
    <Tabs value={String(selectedId)} onValueChange={() => undefined} layout="fit">
      {/* 탭 줄이 원래 놓이는 자리. 상단 내비 밑에 붙었는지 가늠한다. */}
      <div ref={watchStuck} aria-hidden="true" className="pointer-events-none h-0" />

      {/* 상단 내비 밑에 붙는다. 본문에 좌우 여백이 없어 화면 양끝까지 선이 그어진다. */}
      <div ref={watchOverflow} className="sticky top-11 z-(--z-sticky) bg-background">
        <TabList
          label="구성품"
          end={
            overflowing ? (
              <PartChipsToggle ref={toggleRef} controls={chipsId} open={chipsOpen} onOpen={() => setChipsOpen(true)} />
            ) : null
          }
        >
          {parts.map((part, index) => (
            <Tab key={part.id} value={String(part.id)} asChild>
              <Link
                href={partHref(product.id, part.id)}
                // 탭을 오가는 것은 화면을 옮기는 일이 아니다. 뒤로 가기가 탭을 되짚지 않고 이전 화면으로 가게 한다.
                replace
                scroll={false}
                // 동적 화면이라 기본값으로는 미리 받지 않는다. 구성품은 몇 개뿐이라 모두 받아 두어 바로 바뀌게 한다.
                prefetch
                // 마우스로 끌면 브라우저가 링크째 끌어 간다. 링크 끌기는 끈다.
                draggable={false}
                onClick={() => select(part.id, false)}
                className="min-h-12"
              >
                <PartLabel order={partOrder(index)} part={part} />
              </Link>
            </Tab>
          ))}
        </TabList>

        {chipsOpen ? (
          <PartChips
            id={chipsId}
            product={product}
            onClose={() => {
              setChipsOpen(false);
              // 고르지 않고 닫으면 연 버튼으로 포커스를 돌려준다(A11Y D02).
              toggleRef.current?.focus({ preventScroll: true });
            }}
            onSelect={(partId) => {
              select(partId, true);
              setChipsOpen(false);
              toggleRef.current?.focus({ preventScroll: true });
            }}
          />
        ) : null}
      </div>

      <div ref={panelRef} className="scroll-mt-24">
        <TabPanel value={String(selectedId)} className={className}>
          {children}
        </TabPanel>
      </div>
    </Tabs>
  );
}
