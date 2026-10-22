"use client";

import { Icon } from "@poudy/design-system/icon";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export function AdminDialog({
  title,
  children,
  onClose,
  drawer = false,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly drawer?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={onClose}
      className={
        drawer
          ? "m-0 ml-auto h-svh max-h-none w-full max-w-none overflow-y-auto border-0 bg-admin-elevated p-6 text-admin-text backdrop:bg-admin-scrim md:w-3/5"
          : "m-auto max-h-svh w-full max-w-xl overflow-y-auto rounded-admin-xl border-0 bg-admin-elevated p-7 text-admin-text backdrop:bg-admin-scrim"
      }
    >
      <header className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-admin-heading font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-admin-md text-admin-text-muted hover:bg-admin-selected"
        >
          <Icon name="x" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
