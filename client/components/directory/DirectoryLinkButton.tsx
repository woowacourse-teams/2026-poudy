"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

/**
 * 다른 화면으로 가는 BTN · Secondary(md 48). 빈 상태와 없는 주소의 행동이 이 모양을 쓴다.
 *
 * 패키지 Button 은 링크로 그릴 수 없어 같은 모양과 누름 상태(usePressable, fb-secondary, press-scale)만 옮겼다.
 * 이동하는 행동이라 버튼이 아니라 링크로 둬야 새 탭에서 열 수 있고 낭독기도 링크로 읽는다.
 * 패키지에 링크용 Button(asChild)이 생기면 그것으로 바꾼다.
 *
 * Button 처럼 높이를 최소 높이로 두고 낱말 단위로 줄을 넘긴다. 기기 글자 크기를 키워도 글자가 버튼 밖으로 넘치지 않는다.
 */
export function DirectoryLinkButton({ href, children }: { readonly href: string; readonly children: string }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      {...pressableProps}
      className="pressable press-scale fb-secondary inline-flex min-h-12 items-center justify-center rounded-xl bg-button-secondary px-4 py-3 text-center text-14 leading-none font-semibold break-keep text-text-primary select-none"
    >
      {children}
    </Link>
  );
}
