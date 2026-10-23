"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { productEntryPointOf } from "@/lib/analytics/events";
import { rememberPageEntry, separateEntry } from "@/lib/analytics/page-entry";
import { rememberProductEntry } from "@/lib/analytics/product-entry";

/** 같은 탭에서 실제 이동할 때만 유입 경로를 저장하고 HTML에는 추적 쿼리 없는 링크를 제공한다. */
export function AttributionLink({
  href,
  onNavigate,
  entryPoint,
  ...props
}: ComponentProps<typeof Link> & { readonly entryPoint?: string }) {
  const separated = typeof href === "string" ? separateEntry(href) : { href, entryPoint: undefined };
  const source = entryPoint ?? separated.entryPoint;
  return (
    <Link
      {...props}
      href={separated.href}
      onNavigate={(event) => {
        if (source && typeof separated.href === "string") {
          rememberPageEntry(separated.href, source);
          const product = /^\/products\/(\d+)$/.exec(new URL(separated.href, window.location.origin).pathname);
          if (product) rememberProductEntry(Number(product[1]), productEntryPointOf(source));
        }
        onNavigate?.(event);
      }}
    />
  );
}
