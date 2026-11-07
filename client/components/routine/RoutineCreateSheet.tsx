"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { TextArea } from "@poudy/design-system/text-area";
import { TextField } from "@poudy/design-system/text-field";
import { useState } from "react";

import { RoutinePublicSwitch } from "./RoutinePublicSwitch";

import { createRoutine } from "@/lib/api/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { ROUTINE_MEMO_MAX_LENGTH, ROUTINE_NAME_MAX_LENGTH, routineTextLength } from "@/lib/domain/routine";

type RoutineCreateSheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: (routine: RoutineResponse) => void;
};

/** 새 루틴 시트(RT3). 이름·메모·공개 여부로 만들고, 제품은 상세에서 추가한다. */
export function RoutineCreateSheet({ open, onClose, onCreated }: RoutineCreateSheetProps) {
  // 열 때마다 입력을 새로 시작한다. 닫히는 전환 동안에는 앞의 입력을 그대로 둔다.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((count) => count + 1);
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <CreateForm key={session} onClose={onClose} onCreated={onCreated} />
    </BottomSheet>
  );
}

function CreateForm({ onClose, onCreated }: Omit<RoutineCreateSheetProps, "open">) {
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const nameLength = routineTextLength(name);
  const ready = nameLength > 0 && nameLength <= ROUTINE_NAME_MAX_LENGTH;

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    try {
      onCreated(await createRoutine({ name: name.trim(), memo: memo.trim() || null, isPublic }));
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <>
      <BottomSheetHeader title="새 루틴" onClose={onClose} />
      <BottomSheetBody>
        <div className="flex flex-col gap-4 pb-2">
          <TextField
            label="루틴 이름"
            value={name}
            onChange={setName}
            maxLength={ROUTINE_NAME_MAX_LENGTH}
            hint="예: 평소 루틴, 트러블 올라올 때, 여행용"
            serverError={failed ? `루틴을 만들지 못했어요. ${RETRY_LATER}` : undefined}
          />
          <TextArea
            label="메모"
            optional
            value={memo}
            onChange={setMemo}
            maxLength={ROUTINE_MEMO_MAX_LENGTH}
            countOf={routineTextLength}
            placeholder="언제 쓰는 루틴인지, 바를 때 주의할 점을 적어 두세요"
          />
          <RoutinePublicSwitch checked={isPublic} onChange={setIsPublic} />
        </div>
      </BottomSheetBody>
      <BottomSheetFooter primary={{ label: "만들기", onClick: submit, busy, disabled: !ready }} />
    </>
  );
}
