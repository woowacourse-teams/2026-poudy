"use client";

import type { UserResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { LogoutSheet } from "./LogoutSheet";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { ProviderBadge } from "@/components/login/ProviderIcon";
import { Icon } from "@/components/ui/icons/Icon";
import type { IconId } from "@/components/ui/icons/sprite";
import { TopBar } from "@/components/ui/TopBar";
import { findMe, isAdminSession, isSignedOut, logout } from "@/lib/api/member";
import { AGE_RANGES, GENDERS, profileLabel, SKIN_TYPES, skinChoiceOf } from "@/lib/domain/member-profile";
import { notifyAppLogout } from "@/lib/interaction/app-login";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import {
  getSavedProductsServerSnapshot,
  getSavedProductsSnapshot,
  reloadSavedProducts,
  subscribeSavedProducts,
} from "@/lib/storage/saved-products";

const LOGOUT_FAILED = "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.";

const ROW_CLASS = "flex min-h-13 w-full items-center gap-3 px-4 text-left text-[15px] text-text-primary";

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="border-b-8 border-surface py-2 last:border-b-0">
      <h2 className="px-4 pt-3 pb-1 text-[12px] font-semibold text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}

function RowLabel({ icon, label }: { readonly icon: IconId; readonly label: string }) {
  return (
    <>
      <Icon name={icon} size={20} className="shrink-0 text-text-primary" />
      <span className="flex-1">{label}</span>
    </>
  );
}

type LinkRowProps = {
  readonly href: string;
  readonly icon: IconId;
  readonly label: string;
  readonly value?: string;
};

function LinkRow({ href, icon, label, value }: LinkRowProps) {
  return (
    <Link href={href} className={ROW_CLASS}>
      <RowLabel icon={icon} label={label} />
      {value === undefined && <span className="text-[14px] font-semibold text-brand">선택 필요</span>}
      {value !== undefined && <span className="text-[14px] text-text-secondary">{value}</span>}
      <Icon name="chevron-right" size={16} className="shrink-0 text-text-secondary" />
    </Link>
  );
}

const savedCountLabel = (status: string, count: number): string => {
  if (status !== "ready") return "";
  return `${count}개`;
};

export function MyPageScreen() {
  const router = useRouter();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const saved = useSyncExternalStore(subscribeSavedProducts, getSavedProductsSnapshot, getSavedProductsServerSnapshot);

  useEffect(() => {
    findMe()
      .then(setMember)
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          rememberLoginReturn();
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        setLoadFailed(true);
      });
  }, [router]);

  const signOut = () => {
    setPending(true);
    logout()
      .then(() => {
        notifyAppLogout();
        void reloadSavedProducts();
        router.replace("/login");
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        window.alert(LOGOUT_FAILED);
        setPending(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center" />
    );
  }

  if (loadFailed) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <p role="alert" className="text-[15px] text-text-secondary">
          회원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <p role="status" className="text-[15px] text-text-secondary">
          불러오는 중이에요
        </p>
      </main>
    );
  }

  return (
    <>
      <TopBar title="마이페이지" variant="sub" />
      <main className="flex flex-1 flex-col pb-6">
        <Section title="계정">
          <div className={ROW_CLASS}>
            <RowLabel icon="mail" label="이메일" />
            <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-text-secondary">
              <ProviderBadge provider={member.provider} size="small" />
              <span className="truncate">{member.email}</span>
            </span>
          </div>
        </Section>

        <Section title="내 정보">
          <LinkRow href="/my-page/gender" icon="user" label="성별" value={profileLabel(GENDERS, member.gender)} />
          <LinkRow
            href="/my-page/age-range"
            icon="cake"
            label="나이대"
            value={profileLabel(AGE_RANGES, member.ageRange)}
          />
          <LinkRow
            href="/my-page/skin-type"
            icon="droplet"
            label="피부 타입"
            value={profileLabel(SKIN_TYPES, skinChoiceOf(member))}
          />
        </Section>

        <Section title="관심 제품">
          <LinkRow
            href="/wishlist"
            icon="bookmark"
            label="위시리스트"
            value={savedCountLabel(saved.status, saved.ids.length)}
          />
        </Section>

        <Section title="기타">
          <button type="button" onClick={() => setLogoutOpen(true)} disabled={pending} className={ROW_CLASS}>
            <RowLabel icon="logout" label="로그아웃" />
            <Icon name="chevron-right" size={16} className="shrink-0 text-text-secondary" />
          </button>
          <Link href="/my-page/withdraw" className={ROW_CLASS}>
            <RowLabel icon="user-x" label="탈퇴하기" />
            <Icon name="chevron-right" size={16} className="shrink-0 text-text-secondary" />
          </Link>
        </Section>
      </main>

      <LogoutSheet open={logoutOpen} pending={pending} onClose={() => setLogoutOpen(false)} onConfirm={signOut} />
    </>
  );
}
