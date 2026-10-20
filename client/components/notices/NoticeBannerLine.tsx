import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";

export function NoticeBannerLine({
  text,
  href,
  current,
  total,
  onNext,
  onClose,
}: {
  readonly text: string;
  readonly href?: string;
  readonly current: number;
  readonly total: number;
  readonly onNext?: () => void;
  readonly onClose?: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 bg-admin-brand-soft px-4 text-13 font-semibold text-admin-brand-text">
      <Icon name="speakerphone" className="size-4 shrink-0" />
      {href ? (
        <Link href={href} className="min-w-0 flex-1 truncate">
          {text}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate">{text}</span>
      )}
      <span aria-live="off">
        {current}/{total}
      </span>
      <button
        type="button"
        aria-label="다음 공지"
        disabled={total < 2 || !onNext}
        onClick={onNext}
        className="flex size-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <Icon name="chevron-right" />
      </button>
      <button
        type="button"
        aria-label="공지 알림 닫기"
        disabled={!onClose}
        onClick={onClose}
        className="flex size-11 shrink-0 items-center justify-center text-text-muted"
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
