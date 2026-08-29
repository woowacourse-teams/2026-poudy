"use client";

import { useState } from "react";

import { Icon } from "./icons/Icon";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import { sharePage } from "@/lib/interaction/share";

const COPIED_NOTICE_MS = 1600;

/** 상단바의 공유. 지금 보고 있는 주소를 그대로 내보낸다. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    requestSelectionHaptic();

    const result = await sharePage(window.location.href);

    if (result !== "copied") {
      return;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_NOTICE_MS);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="공유하기"
        className="flex size-11 items-center justify-center"
      >
        <Icon name="share" size={20} />
      </button>

      {/* 공유 시트가 없어 주소만 복사했을 때, 무엇이 일어났는지 알린다. */}
      {copied ? (
        <span
          role="status"
          className="fixed inset-x-0 bottom-24 mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-[13px] text-white"
        >
          주소를 복사했어요
        </span>
      ) : null}
    </>
  );
}
