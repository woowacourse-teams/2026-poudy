"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { cn } from "@poudy/design-system/cn";
import { Icon, type IconName } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { ReactElement } from "react";

import { RoutinePublicSwitch } from "./RoutinePublicSwitch";
import type { RoutineTextField } from "./RoutineTextSheet";

export function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
}: {
  /** 선 아이콘 이름이나, 해·달처럼 직접 그린 그림 */
  readonly icon: IconName | ReactElement;
  readonly label: string;
  readonly onPress: () => void;
  readonly danger?: boolean;
}) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      {...pressableProps}
      onClick={onPress}
      className={cn(
        "pressable fb-surface flex h-14 w-full items-center gap-3 px-gutter text-left text-body leading-none font-semibold",
        danger ? "text-danger-action" : "text-text-primary",
      )}
    >
      <span aria-hidden="true" className={cn("flex shrink-0", !danger && "text-text-body")}>
        {typeof icon === "string" ? <Icon name={icon} size={20} /> : icon}
      </span>
      {label}
    </button>
  );
}

type RoutineMenuSheetProps = {
  readonly open: boolean;
  readonly routine: RoutineResponse;
  readonly publicBusy: boolean;
  readonly onClose: () => void;
  readonly onEdit: (field: RoutineTextField) => void;
  readonly onPublicChange: (isPublic: boolean) => void;
  readonly onDelete: () => void;
};

/** 루틴 더보기 시트(RT7). 이름 수정, 메모 수정, 공개 전환, 루틴 삭제. */
export function RoutineMenuSheet({
  open,
  routine,
  publicBusy,
  onClose,
  onEdit,
  onPublicChange,
  onDelete,
}: RoutineMenuSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetHeader title={routine.name} />
      <div className="flex flex-col pb-safe">
        <MenuRow icon="pencil" label="이름 수정" onPress={() => onEdit("name")} />
        <MenuRow icon="note" label="메모 수정" onPress={() => onEdit("memo")} />
        <div className="px-gutter">
          <RoutinePublicSwitch
            checked={routine.isPublic}
            onChange={onPublicChange}
            busy={publicBusy}
            description="둘러보기에 보이고, 로그인 없이도 볼 수 있어요"
            withIcon
          />
        </div>
        <div className="border-t border-border">
          <MenuRow icon="trash" label="루틴 삭제" danger onPress={onDelete} />
        </div>
      </div>
    </BottomSheet>
  );
}
