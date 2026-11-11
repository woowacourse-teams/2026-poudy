"use client";

import { Icon } from "@poudy/design-system/icon";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent, ReactNode } from "react";

import styles from "./ShelfFeatureSheet.module.css";
import { ShelfGuideScene } from "./ShelfGuideScene";

export type GuideStep = {
  readonly title: string;
  readonly description: string;
  readonly scene: number;
};

const DURATION_CLASSES = [
  styles.duration0,
  styles.duration1,
  styles.duration2,
  styles.duration3,
  styles.duration4,
  styles.duration5,
];
const STEP_CLASSES = [styles.step0, styles.step1, styles.step2, styles.step3, styles.step4];
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

export function GuideCarousel({
  steps,
  open = true,
  label,
  className = "",
  header,
  textFirst = false,
  wrap = (content) => content,
}: {
  readonly steps: readonly GuideStep[];
  readonly open?: boolean;
  readonly label: string;
  readonly className?: string;
  readonly textFirst?: boolean;
  readonly header?: (step: number) => ReactNode;
  readonly wrap?: (content: ReactNode) => ReactNode;
}) {
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const pending = useRef(false);
  const [{ step, run }, setPlayback] = useState({ step: 0, run: 0 });
  const [wasOpen, setWasOpen] = useState(open);
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, serverMotion);
  const visible = useSyncExternalStore(subscribeVisibility, getVisible, serverVisible);
  // 닫는 전환 중 다시 열어도 1단계부터 시작한다.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setPlayback((current) => ({ step: 0, run: current.run + 1 }));
  }
  const last = steps.length - 1;
  useEffect(() => {
    if (!visible || !open) {
      pointer.current = null;
      pending.current = false;
    }
  }, [visible, open]);
  const go = useCallback(
    (next: number) => {
      pending.current = false;
      setPlayback((current) => ({ step: Math.max(0, Math.min(last, next)), run: current.run + 1 }));
    },
    [last],
  );
  const complete = useCallback(() => {
    if (!open || step === last || reduced) return;
    if (pointer.current) pending.current = true;
    else go(step + 1);
  }, [step, last, reduced, go, open]);
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
      {header?.(step)}
      {wrap(
        <div
          className={`${styles.body} ${textFirst ? styles.textFirst : ""} ${className}`}
          role="region"
          aria-label={label}
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
              <div className={`${styles.track} ${STEP_CLASSES[step]}`}>
                {steps.map((item, index) => (
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
                          step={item.scene}
                          last={index === last}
                          compact={textFirst}
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
              disabled={step === last}
              onClick={() => go(step + 1)}
            >
              <Icon name="chevron-right" size={24} />
            </button>
          </div>
          <div className={styles.dots} aria-label="단계 선택">
            {steps.map((item, index) => (
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
                    className={`${styles.progress} ${DURATION_CLASSES[item.scene]} ${step === last || reduced ? styles.full : ""} ${!visible || !open ? styles.paused : ""}`}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>,
      )}
    </>
  );
}
