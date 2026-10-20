import type { ReactNode } from "react";

/** 화면 폭 견본. 본문의 거터를 빼고 화면 끝까지 그린다. 화면 골격 부품(TopBar 등)에 쓴다. */
export function Frame({ children }: { readonly children: ReactNode }) {
  return <div className="-mx-(--gutter) border-y border-dashed border-border-strong">{children}</div>;
}
