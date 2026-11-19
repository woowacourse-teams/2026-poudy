"use client";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import type { ReactNode } from "react";

import { TimeOfDayIcon } from "./TimeOfDayIcon";

const STEPS = ["루틴을 만들고 이름을 붙여요", "아침과 저녁에 쓰는 제품을 담아요", "공개할지 나만 볼지 정해요"] as const;

const USES: readonly { readonly icon: ReactNode; readonly text: string }[] = [
  { icon: <TimeOfDayIcon timeOfDay="morning" size={20} />, text: "쓰는 제품을 기록해 두고 관리해요" },
  { icon: <Icon name="message-circle" size={20} />, text: "다른 사람과 공유하고 꿀팁을 주고받아요" },
  // 명세는 내려받기 그림이지만 디자인 시스템 아이콘에 없어, 들여 두는 뜻이 가까운 보관함 그림을 쓴다.
  { icon: <Icon name="archive" size={20} />, text: "마음에 드는 루틴은 가져와 내 것으로 써요" },
];

/**
 * 루틴 이용 안내 시트(S180). 루틴 탭 상단의 도움말(?)이 연다. 이용 방법과 루틴으로 할 수 있는 것 두 묶음만 알리고
 * 버튼은 두지 않는다. 만들기 입구는 화면의 '새 루틴' 하나다. 닫기는 ✕ · 딤 · 아래로 끌기다.
 */
export function RoutineHelpSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetHeader title="루틴 이용 안내" onClose={onClose} />
      <BottomSheetBody>
        <div className="flex flex-col gap-5 pb-safe">
          <section aria-labelledby="routine-help-steps" className="flex flex-col gap-3">
            <h3 id="routine-help-steps" className="text-body-sm font-semibold text-text-secondary">
              이용 방법
            </h3>
            <ol className="flex flex-col gap-3">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-body text-text-body">
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-caption font-bold text-text-primary"
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="routine-help-uses" className="flex flex-col gap-3">
            <h3 id="routine-help-uses" className="text-body-sm font-semibold text-text-secondary">
              루틴으로 할 수 있는 것
            </h3>
            <ul className="flex flex-col gap-3">
              {USES.map((use) => (
                <li key={use.text} className="flex items-center gap-3 text-body text-text-body">
                  <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center text-text-body">
                    {use.icon}
                  </span>
                  {use.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </BottomSheetBody>
    </BottomSheet>
  );
}
