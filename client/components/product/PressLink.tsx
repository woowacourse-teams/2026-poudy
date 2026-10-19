"use client";

import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

/**
 * 글자만 있는 작은 링크(분류 경로, 브랜드명). 가만히 있을 때는 글자 그대로 두고, 손이 닿는 동안에만 옅어진다(fb-dim).
 *
 * 12px 글자는 그대로 두면 누를 자리가 24px 에 못 미친다. 글자 위아래로 6px 씩 겹쳐 그린 가상 요소가 손을 받게 해
 * 누를 자리만 넓힌다. 여백으로 넓히지 않으므로 링크가 차지하는 높이는 그대로다.
 */
export function PressLink({
  href,
  label,
  className,
  children,
}: {
  readonly href: string;
  /** 대상이 드러나는 이름(A11Y D05). 예: '스킨케어 카테고리 제품' */
  readonly label: string;
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      aria-label={label}
      {...pressableProps}
      className={cn("pressable fb-dim relative after:absolute after:inset-x-0 after:-inset-y-1.5", className)}
    >
      {children}
    </Link>
  );
}
