"use client";

import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const ADMIN_FIELD =
  "min-h-11 rounded-admin-lg border border-admin-border-strong bg-admin-elevated px-3 text-admin-body text-admin-text outline-none focus-visible:ring-2 focus-visible:ring-admin-brand disabled:opacity-50";

export function AdminButton({
  children,
  className,
  primary = false,
  busy = false,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly primary?: boolean;
  readonly busy?: boolean;
  readonly children: ReactNode;
}) {
  const { pressableProps } = usePressable({ disabled, busy });
  return (
    <button
      {...rest}
      {...pressableProps}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-admin-lg border px-4 text-admin-body font-semibold focus-visible:ring-2 focus-visible:ring-admin-brand disabled:opacity-50 data-[hovered]:brightness-95",
        primary
          ? "border-admin-action bg-admin-action text-admin-on-action"
          : "border-admin-border-strong bg-admin-elevated text-admin-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AdminSummary({
  items,
}: {
  readonly items: readonly { readonly label: string; readonly value: number; readonly description: string }[];
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-admin-border overflow-hidden rounded-admin-xl border border-admin-border bg-admin-elevated lg:flex">
      {items.map((item) => (
        <div key={item.label} className="flex-1 px-5 py-4">
          <p className="text-admin-body text-admin-text-secondary">{item.label}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <strong className="text-admin-metric font-bold">{item.value.toLocaleString()}건</strong>
            <span className="text-admin-caption text-admin-text-muted">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminSwitch({
  checked,
  onChange,
  label,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 focus-visible:ring-2 focus-visible:ring-admin-brand",
        checked ? "bg-admin-action" : "bg-admin-border-strong",
      )}
    >
      <span
        className={cn(
          "block size-5 rounded-full bg-admin-elevated transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
