"use client";

import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AdminBlankPage } from "./AdminBlankPage";
import { AdminButton } from "./AdminControls";
import { useAdminSession } from "./useAdminSession";

import { adminLogout } from "@/lib/api/admin";

const NAV = [
  { href: "/admin", label: "문의 관리", icon: "message-question" },
  { href: "/admin/notices", label: "공지사항", icon: "speakerphone" },
  { href: "/admin/members/withdrawn", label: "회원 복구", icon: "user" },
] as const;

export function AdminShell({
  title,
  description,
  actions,
  meta,
  children,
}: {
  readonly title: ReactNode;
  readonly description?: string;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAdminSession();
  const [pending, setPending] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  useEffect(() => {
    if (session === "signedOut") router.replace("/admin/login");
  }, [session, router]);
  if (session === "checking" || session === "signedOut") return <AdminBlankPage />;
  if (session === "unknown")
    return (
      <main data-desktop-page className="p-8">
        <p role="alert">관리자 세션을 확인하지 못했어요. 다시 시도해 주세요.</p>
        <AdminButton onClick={() => window.location.reload()}>다시 시도</AdminButton>
      </main>
    );
  const logout = async () => {
    setPending(true);
    setLogoutFailed(false);
    try {
      await adminLogout();
      router.replace("/admin/login");
    } catch {
      setPending(false);
      setLogoutFailed(true);
    }
  };
  return (
    <main data-desktop-page className="flex min-h-svh bg-admin-bg text-admin-body leading-normal text-admin-text">
      <aside className="sticky top-0 flex h-svh w-48 shrink-0 flex-col border-r border-admin-border px-4 py-5 lg:w-69">
        <Link href="/admin" className="mb-5 flex items-center gap-2 px-1 font-bold">
          <span className="flex size-8 items-center justify-center rounded-admin-lg bg-admin-brand text-admin-on-action">
            P
          </span>
          <span>
            POUDY
            <br />
            <span className="text-admin-text-secondary">ADMIN</span>
          </span>
        </Link>
        <p className="mb-2 text-admin-caption text-admin-text-muted">운영</p>
        <nav aria-label="관리자 메뉴" className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)) ? "page" : undefined
              }
              className="flex min-h-10 items-center gap-3 rounded-admin-md px-3 text-admin-text-secondary hover:bg-admin-selected aria-[current=page]:bg-admin-selected aria-[current=page]:font-semibold aria-[current=page]:text-admin-text"
            >
              <Icon name={item.icon} className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-admin-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">관리자</p>
              <p className="text-admin-caption text-admin-text-muted">운영 관리자</p>
            </div>
            <AdminButton
              busy={pending}
              onClick={logout}
              className="min-h-8 shrink-0 px-2 text-admin-caption font-normal"
            >
              로그아웃
            </AdminButton>
          </div>
          {logoutFailed && (
            <p role="alert" className="mt-2 text-admin-caption text-admin-danger">
              로그아웃하지 못했어요. 다시 시도해 주세요.
            </p>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col p-5 lg:p-7.5">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-admin-heading font-bold">{title}</h1>
            {description && <p className="mt-1 text-admin-text-muted">{description}</p>}
            {meta && <p className="mt-1 text-admin-caption text-admin-text-muted">{meta}</p>}
          </div>
          {actions}
        </header>
        {children}
      </div>
    </main>
  );
}
