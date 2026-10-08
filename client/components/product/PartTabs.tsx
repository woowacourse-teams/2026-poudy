"use client";

import type { ProductDetailResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { partHref, partTabId } from "@/lib/domain/product-parts";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import { useScrollEdges } from "@/lib/hooks/useScrollEdges";

/** 탭 하나의 좌우 여백. design/v2.pen 의 `구성품 탭` 을 따른다. */
const TAB_PADDING = 12;
/** 고정 모드에서 바 양옆에 두는 여백. 스크롤 모드는 4 로 줄인다. */
const FIXED_GUTTER = 16;
/** 스크롤 모드에서 고른 탭을 맞출 때 끝에서 띄우는 폭. 끝을 흐리는 폭(24px)에 가리지 않게 한다. */
const FADE_CLEARANCE = 24;

/**
 * S39b·S39c 구성품 탭. 구성품이 둘 이상인 제품만 둔다.
 *
 * 탭은 `partId` 를 붙인 주소로 가는 링크다. 주소에 고른 구성품이 남아 그대로 공유되고, 서버가
 * 그 구성품을 그린 화면을 돌려준다. 진입 경로도 이어 붙여 조회 이벤트가 다시 나가지 않게 한다.
 *
 * 폭은 개수가 아니라 내용으로 정한다. 모든 탭의 내용 폭이 바에 들어가면 폭을 똑같이 나누고(고정),
 * 넘치면 내용 폭 그대로 두고 가로로 밀게 한다(스크롤). 화면 폭과 글자 크기 설정에 따라 같은 제품도
 * 달라지므로 그린 뒤에 잰다.
 */
export function PartTabs({
  product,
  entryPoint,
}: {
  readonly product: ProductDetailResponse;
  readonly entryPoint: ProductEntryPoint;
}) {
  const { ref, edges, onScroll } = useScrollEdges("horizontal");
  const anchorRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const scrollToPanel = useRef(false);
  const [scrollable, setScrollable] = useState(false);
  const selectedId = product.selectedPart?.id;
  // 넘쳐서 밀어야 할 때만 마우스 끌기를 받는다. 고정 모드에서는 끌 것이 없다.
  useDragScroll(ref, scrollable);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;

    const measure = () => {
      const contents = [...bar.querySelectorAll<HTMLElement>("[data-tab-content]")];
      const total = contents.reduce((sum, content) => sum + content.offsetWidth + TAB_PADDING * 2, 0);
      setScrollable(total > bar.clientWidth - FIXED_GUTTER * 2);
    };

    measure();
    // 글꼴이 앉기 전에는 글자가 좁게 재진다. 준비된 뒤 한 번 더 잰다.
    document.fonts?.ready.then(measure).catch(() => {});

    if (typeof ResizeObserver === "undefined") return;
    // 기기에서 글자 크기를 바꾸면 바 폭은 그대로여도 탭 내용이 커진다. 내용의 크기 변화도 지켜본다.
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    bar.querySelectorAll("[data-tab-content]").forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [ref, product.productParts]);

  // 스크롤 모드에서 고른 탭이 화면 밖이면 보이도록 민다. 공유받은 주소로 들어온 경우가 그렇다.
  useEffect(() => {
    const bar = ref.current;
    const tab = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!scrollable || !bar || !tab) return;

    const left = tab.offsetLeft - FADE_CLEARANCE;
    const right = tab.offsetLeft + tab.offsetWidth + FADE_CLEARANCE;
    if (left < bar.scrollLeft) bar.scrollLeft = left;
    if (right > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = right - bar.clientWidth;
  }, [ref, scrollable, selectedId]);

  /*
   * 머리에 붙은 채로 탭을 바꾸면 새 구성품의 처음부터 읽게 패널 시작점으로 한 번에 올린다.
   *
   * 탭이 붙어 있으면 축약형도 나와 있고, 올린 뒤에도 축약형이 사라지는 자리까지 내려가지 않는다.
   * 그래서 붙는 높이가 바뀌지 않아 다시 맞출 일이 없다. 축약형이 나타나는 자리는 ProductDetail 이 정한다.
   */
  useEffect(() => {
    const anchor = anchorRef.current;
    const sticky = stickyRef.current;
    if (!scrollToPanel.current || !anchor || !sticky) return;
    scrollToPanel.current = false;

    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
    window.scrollTo({ top: window.scrollY + anchor.getBoundingClientRect().top - stickyTop });
  }, [selectedId]);

  if (product.productParts.length < 2) return null;

  const rememberStuck = () => {
    const anchor = anchorRef.current;
    const sticky = stickyRef.current;
    if (!anchor || !sticky) return;
    scrollToPanel.current = anchor.getBoundingClientRect().top < sticky.getBoundingClientRect().top;
  };

  return (
    <>
      {/* 탭 바가 원래 놓이는 자리. 붙었는지 가늠하고, 패널 시작점으로 올릴 때 기준으로 쓴다. */}
      <div ref={anchorRef} aria-hidden="true" />

      {/*
        머리(44px)와 그 아래 축약형 밑에 붙는다. 축약형은 탭이 붙기 전에 이미 나와 있어 붙는 높이가
        바뀌는 동안 탭은 흐름 안에 있다. 그래서 높이 전환을 걸지 않는다. 본문에 좌우 여백이 없어
        화면 양끝까지 선이 그어진다.
      */}
      <div ref={stickyRef} className="sticky top-[calc(2.75rem+var(--summary-bar-height,0px))] z-20 bg-background">
        <div
          ref={ref}
          onScroll={onScroll}
          data-axis="horizontal"
          data-start={scrollable && edges.start}
          data-end={scrollable && edges.end}
          className={`edge-fade scrollbar-none relative overflow-x-auto border-b border-[#DEE2E9] ${scrollable ? "px-1 pointer-fine:cursor-grab pointer-fine:data-[dragging=true]:cursor-grabbing" : "px-4"}`}
        >
          <div role="tablist" aria-label="구성품" className="flex">
            {product.productParts.map((part, index) => {
              const selected = part.id === selectedId;
              const caution = part.cautionCount > 0;

              return (
                <Link
                  key={part.id}
                  id={partTabId(part.id)}
                  href={partHref(product.id, part.id, entryPoint)}
                  role="tab"
                  aria-selected={selected}
                  // 탭을 오가는 것은 화면을 옮기는 일이 아니다. 뒤로 가기가 탭을 되짚지 않고 이전 화면으로 가게 한다.
                  replace
                  scroll={false}
                  // 마우스로 끌면 브라우저가 링크째 끌어 가 줄이 밀리지 않는다. 링크 끌기는 끈다.
                  draggable={false}
                  // 동적 화면이라 기본값으로는 미리 받지 않는다. 구성품은 몇 개뿐이라 모두 받아 두어 바로 바뀌게 한다.
                  prefetch
                  onClick={() => {
                    rememberStuck();
                    // 이미 보고 있는 탭을 다시 누른 것은 바꾼 것이 아니다. 끌기 뒤의 클릭은 useDragScroll 이 막아 여기로 오지 않는다.
                    if (selectedId === undefined || part.id === selectedId) return;
                    track("product_part_selected", {
                      product_id: product.id,
                      part_id: part.id,
                      previous_part_id: selectedId,
                    });
                  }}
                  className={`flex h-12 min-w-max shrink-0 items-center justify-center border-b-2 px-3 ${scrollable ? "" : "flex-1 basis-0"} ${selected ? "border-[#182132]" : "border-transparent"}`}
                >
                  <span data-tab-content className="flex items-center gap-1 whitespace-nowrap">
                    <span
                      className={`text-[14px] ${selected ? "font-bold text-[#182132]" : "font-medium text-[#566273]"}`}
                    >
                      {part.name ?? `구성품 ${index + 1}`}
                    </span>
                    <CautionStatusIcon caution={caution} size={13} />
                    <span className="sr-only">, 주의 성분 {caution ? "있음" : "없음"}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
