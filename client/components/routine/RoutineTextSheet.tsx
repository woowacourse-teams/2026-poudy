"use client";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { TextArea } from "@poudy/design-system/text-area";
import { TextField } from "@poudy/design-system/text-field";
import { useState } from "react";

import { RETRY_LATER } from "@/lib/domain/messages";
import { ROUTINE_MEMO_MAX_LENGTH, ROUTINE_NAME_MAX_LENGTH, routineTextLength } from "@/lib/domain/routine";

export type RoutineTextField = "name" | "memo";

type RoutineTextSheetProps = {
  /** 고치는 칸. 닫혀 있으면 undefined 다. */
  readonly field: RoutineTextField | undefined;
  readonly initial: string;
  readonly onClose: () => void;
  /** 고친 값을 저장한다. 실패하면 거부된 약속을 돌려준다. */
  readonly onSave: (value: string) => Promise<unknown>;
};

const COPY = {
  name: { title: "이름 바꾸기", label: "루틴 이름" },
  memo: { title: "메모 고치기", label: "메모" },
} as const satisfies Record<RoutineTextField, { readonly title: string; readonly label: string }>;

/** 이름 바꾸기(RT7-c)와 메모 고치기(RT7-a) 시트. */
export function RoutineTextSheet({ field, initial, onClose, onSave }: RoutineTextSheetProps) {
  const [session, setSession] = useState(0);
  const [wasField, setWasField] = useState(field);
  const [shown, setShown] = useState(field);
  if (field !== wasField) {
    setWasField(field);
    if (field) {
      setShown(field);
      setSession((count) => count + 1);
    }
  }

  return (
    <BottomSheet open={field !== undefined} onClose={onClose}>
      {shown ? <TextForm key={session} field={shown} initial={initial} onClose={onClose} onSave={onSave} /> : null}
    </BottomSheet>
  );
}

function TextForm({
  field,
  initial,
  onClose,
  onSave,
}: Omit<RoutineTextSheetProps, "field"> & { readonly field: RoutineTextField }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const length = routineTextLength(value);
  const ready = field === "memo" || (length > 0 && length <= ROUTINE_NAME_MAX_LENGTH);
  const error = failed ? `저장하지 못했어요. ${RETRY_LATER}` : undefined;

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onSave(value.trim());
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <>
      <BottomSheetHeader title={COPY[field].title} onClose={onClose} />
      <BottomSheetBody>
        <div className="pb-2">
          {field === "name" ? (
            <TextField
              label={COPY.name.label}
              value={value}
              onChange={setValue}
              maxLength={ROUTINE_NAME_MAX_LENGTH}
              serverError={error}
            />
          ) : (
            <TextArea
              label={COPY.memo.label}
              optional
              value={value}
              onChange={setValue}
              maxLength={ROUTINE_MEMO_MAX_LENGTH}
              countOf={routineTextLength}
              serverError={error}
            />
          )}
        </div>
      </BottomSheetBody>
      <BottomSheetFooter divided primary={{ label: "저장", onClick: save, busy, disabled: !ready }} />
    </>
  );
}
