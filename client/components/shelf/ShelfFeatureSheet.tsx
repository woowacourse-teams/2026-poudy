"use client";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent } from "react";

import styles from "./ShelfFeatureSheet.module.css";
import { ShelfGuideScene } from "./ShelfGuideScene";

const STEPS = [
  { title: "사용해본 제품을 담아요", description: "평가는 나중에 해도 돼요." },
  { title: "잘 맞았는지 골라요", description: "평가한 제품이 많을수록 결과가 정확해져요." },
  { title: "안 맞는 성분을 찾아요", description: "평가한 제품을 통해서 나에게 안 맞는 성분을 찾아줘요." },
  { title: "나만의 필터에 추가해요", description: "피하고 싶은 성분을 골라 추가해요." },
  { title: "그 성분은 검색에서 빼요", description: "제품 검색에서 나만의 필터를 켜면 나에게 맞는 제품만 보여줘요." },
] as const;
const DURATION_CLASSES = [styles.duration0, styles.duration1, styles.duration2, styles.duration3, styles.duration4];
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia?.(MOTION_QUERY);
  media?.addEventListener?.("change", notify);
  return () => media?.removeEventListener?.("change", notify);
};
const getMotion = () => window.matchMedia?.(MOTION_QUERY).matches ?? false;
const serverMotion = () => true;
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};
const getVisible = () => document.visibilityState !== "hidden";
const serverVisible = () => false;

/** 06 시안의 구조와 움직임을 TSX로 옮기고 기존 BottomSheet의 접근성·닫기를 사용한다. */
export function ShelfFeatureSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} handle={false}>
      <Guide open={open} onClose={onClose} />
    </BottomSheet>
  );
}
function Guide({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, serverMotion);
  const visible = useSyncExternalStore(subscribeVisibility, getVisible, serverVisible);
  const [{ step, run }, setPlayback] = useState({ step: 0, run: 0 });
  const [wasOpen, setWasOpen] = useState(open);
  // 닫는 전환 중 다시 열어도 1단계부터 시작한다.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setPlayback((current) => ({ step: 0, run: current.run + 1 }));
  }
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!visible || !open) {
      pointer.current = null;
      pending.current = false;
    }
  }, [visible, open]);
  const go = useCallback((next: number) => {
    pending.current = false;
    setPlayback((current) => ({ step: Math.max(0, Math.min(STEPS.length - 1, next)), run: current.run + 1 }));
  }, []);
  const complete = useCallback(() => {
    if (!open || step === STEPS.length - 1 || reduced) return;
    if (pointer.current) pending.current = true;
    else go(step + 1);
  }, [step, reduced, go, open]);
  const release = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (!cancelled && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) go(step + (dx < 0 ? 1 : -1));
    else if (pending.current && !reduced) go(step + 1);
    pending.current = false;
  };
  return (
    <>
      <div data-sheet-grab="" className={styles.grab}>
        <span />
      </div>
      <div className={styles.header}>
        <BottomSheetHeader
          title={
            <>
              파우치 사용법{" "}
              <span className={styles.count}>
                <b>{step + 1}</b> / {STEPS.length}
              </span>
            </>
          }
          onClose={onClose}
        />
      </div>
      <BottomSheetBody>
        <div
          className={`-mx-5 ${styles.body}`}
          role="region"
          aria-label="파우치 사용법 단계"
          data-sheet-no-drag
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              go(step + (event.key === "ArrowLeft" ? -1 : 1));
            }
          }}
        >
          <div className={styles.carousel}>
            <div
              className={styles.viewport}
              onPointerDown={(event) => {
                if (event.button !== 0 || pointer.current) return;
                pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => release(event)}
              onPointerCancel={(event) => release(event, true)}
              onLostPointerCapture={(event) => release(event, true)}
            >
              <div
                className={`${styles.track} ${[styles.step0, styles.step1, styles.step2, styles.step3, styles.step4][step]}`}
              >
                {STEPS.map((item, index) => (
                  <section
                    key={item.title}
                    className={styles.slide}
                    aria-label={`${index + 1}단계`}
                    aria-hidden={index !== step}
                    inert={index !== step}
                  >
                    <div className={styles.stage}>
                      {index === step && visible ? (
                        <ShelfGuideScene
                          key={`${run}-${reduced}-${visible}`}
                          step={step}
                          active={open}
                          reduced={reduced}
                          onComplete={complete}
                        />
                      ) : null}
                    </div>
                    <div className={styles.text}>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </section>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={`${styles.arrow} ${styles.previous}`}
              aria-label="이전 단계"
              disabled={step === 0}
              onClick={() => go(step - 1)}
            >
              <Icon name="chevron-left" size={24} />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              aria-label="다음 단계"
              disabled={step === STEPS.length - 1}
              onClick={() => go(step + 1)}
            >
              <Icon name="chevron-right" size={24} />
            </button>
          </div>
          <div className={styles.dots} aria-label="단계 선택">
            {STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`${index + 1}단계로`}
                aria-current={index === step ? "step" : undefined}
                onClick={() => go(index)}
                className={index === step ? styles.current : ""}
              >
                {index === step ? (
                  <span
                    key={`${run}-${reduced}-${visible}`}
                    className={`${styles.progress} ${DURATION_CLASSES[step]} ${step === STEPS.length - 1 || reduced ? styles.full : ""} ${!visible || !open ? styles.paused : ""}`}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </BottomSheetBody>
    </>
  );
}
