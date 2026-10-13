import { REQUEST_STATUSES } from "./labels";

import type { AdminRequestStatus } from "@/lib/api/admin";

type Props = {
  readonly value: AdminRequestStatus;
  readonly disabled: boolean;
  readonly onChange: (status: AdminRequestStatus) => void;
};

const isRequestStatus = (value: string): value is AdminRequestStatus =>
  REQUEST_STATUSES.some((status) => status.value === value);

export function RequestStatusSelect({ value, disabled, onChange }: Props) {
  return (
    <select
      aria-label="처리 상태"
      value={value}
      disabled={disabled}
      onChange={(event) => {
        if (isRequestStatus(event.target.value)) onChange(event.target.value);
      }}
      className="h-9 rounded-button border border-border bg-background px-2 text-[14px] disabled:opacity-40"
    >
      {REQUEST_STATUSES.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  );
}
