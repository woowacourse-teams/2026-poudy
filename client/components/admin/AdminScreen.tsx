"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminBlankPage } from "./AdminBlankPage";
import { FeedbackList } from "./FeedbackList";
import { ProductRequestList } from "./ProductRequestList";
import { RestoreRequestList } from "./RestoreRequestList";
import { useAdminSession } from "./useAdminSession";

import { adminLogout } from "@/lib/api/admin";

type Tab = "feedbacks" | "productRequests" | "restoreRequests";

const TABS: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: "feedbacks", label: "피드백" },
  { id: "productRequests", label: "제품 등록 요청" },
  { id: "restoreRequests", label: "계정 복구 요청" },
];

function TabContent({ tab }: { readonly tab: Tab }) {
  if (tab === "productRequests") return <ProductRequestList />;
  if (tab === "restoreRequests") return <RestoreRequestList />;
  return <FeedbackList />;
}

export function AdminScreen() {
  const router = useRouter();
  const session = useAdminSession();
  const [tab, setTab] = useState<Tab>("feedbacks");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session === "signedOut") router.replace("/admin/login");
  }, [session, router]);

  const signOut = () => {
    setPending(true);
    adminLogout()
      .catch(() => undefined)
      .finally(() => router.replace("/admin/login"));
  };

  if (session === "checking" || session === "signedOut") return <AdminBlankPage />;

  return (
    <main data-desktop-page className="flex min-h-svh flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-8">
          <h1 className="text-[18px] font-bold tracking-tight">관리자</h1>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="h-9 rounded-button border border-border px-4 text-[14px] font-bold disabled:opacity-40"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-8 py-6">
        <div role="tablist" aria-label="관리 항목" className="flex gap-6 border-b border-border">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className="-mb-px border-b-2 border-transparent pb-3 text-[15px] font-bold text-text-secondary aria-selected:border-action aria-selected:text-text-primary"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          <TabContent key={tab} tab={tab} />
        </div>
      </div>
    </main>
  );
}
