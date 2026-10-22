"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 푸터의 약관 링크.
 *
 * 지금 보고 있는 문서는 굵게 둔다. 목록에서 제 자리를 짚어 주면 어디에 와 있는지
 * 따로 찾지 않아도 된다. 푸터가 홈에만 있는 동안에는 굵어지는 자리가 없고,
 * 약관 화면에도 푸터를 두면 그때부터 드러난다.
 *
 * 굵기만 바꾸면 글자 폭이 달라져 옆 항목이 밀린다. 자리를 잡아 두고 굵은 사본을
 * 겹쳐 두어, 어느 쪽이 굵어져도 줄의 길이가 그대로다.
 */
export function FooterLink({ href, children }: { readonly href: string; readonly children: string }) {
  const pathname = usePathname();
  const current = pathname === href;
  const { pressableProps } = usePressable();

  // 밑줄이 없어 손이 닿았을 때 글자색을 본문색(primary)까지 올려 누를 수 있는 자리임을 알린다.
  // 들 때는 fast 로 바뀌고, 누르는 순간에는 바로 바뀐다(STATE).
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      {...pressableProps}
      // 지금 보고 있는 문서는 굵기와 함께 색도 본문색으로 둔다. 포커스 링은 디자인 시스템 공통 규칙(STATE S06)이 맡는다.
      className={`pressable grid transition-colors duration-(--duration-fast) data-hovered:text-text-primary data-pressed:text-text-primary data-pressed:duration-0 ${current ? "text-text-primary" : ""}`}
    >
      {/* 자리는 굵은 쪽이 잡는다. 굵어져도 이만큼을 넘지 않는다. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-bold">
        {children}
      </span>
      <span className={`col-start-1 row-start-1 ${current ? "font-bold" : ""}`}>{children}</span>
    </Link>
  );
}
