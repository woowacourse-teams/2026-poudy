"use client";

import type { UserResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { LogoutSheet } from "./LogoutSheet";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { ProviderBadge } from "@/components/login/ProviderIcon";
// TODO(#729): 아이콘과 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 부품을 쓴다.
import { Icon } from "@/components/ui/icons/Icon";
import type { IconId } from "@/components/ui/icons/sprite";
import { TopBar } from "@/components/ui/TopBar";
import { findMe, isAdminSession, isSignedOut, logout } from "@/lib/api/member";
import { fetchSkinFilter } from "@/lib/api/skin-filter";
import { AGE_RANGES, GENDERS, profileLabel, skinSummaryOf } from "@/lib/domain/member-profile";
import { filterCountLabel } from "@/lib/domain/skin-filter";
import { providerName } from "@/lib/domain/social-provider";
import { notifyAppLogout } from "@/lib/interaction/app-login";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import {
  getSavedProductsServerSnapshot,
  getSavedProductsSnapshot,
  reloadSavedProducts,
  subscribeSavedProducts,
} from "@/lib/storage/saved-products";

const LOGOUT_FAILED = "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 묶음(S55). 묶음 사이에만 구분선을 긋고 줄 사이에는 긋지 않는다. */
function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-2 first:pt-0 last:border-b-0">
      <h2 className="px-gutter pt-5 pb-1 text-caption font-semibold text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}

function RowIcon({ name }: { readonly name: IconId }) {
  return <Icon name={name} size={20} strokeWidth={1.67} className="shrink-0 text-text-primary" />;
}

type MenuRowProps = {
  readonly icon: IconId;
  readonly label: string;
  /** 지금 값. undefined 면 고르지 않은 항목이라 '선택 필요'를 띄운다. 값 자리가 없는 줄은 null 이다. */
  readonly value: string | null | undefined;
} & ({ readonly href: string; readonly onPress?: never } | { readonly href?: never; readonly onPress: () => void });

/** 내 정보 행 · 메뉴 행(APP · 내 정보 행). 높이 52, 줄 전체가 누르는 영역이다. */
function MenuRow({ icon, label, value, href, onPress }: MenuRowProps) {
  const { pressableProps } = usePressable();
  const className = "pressable fb-surface flex min-h-13 w-full items-center gap-3 px-gutter text-left";
  const content = (
    <>
      <RowIcon name={icon} />
      <span className="min-w-0 flex-1 text-title text-text-primary">{label}</span>
      {value === undefined ? <span className="text-body leading-snug text-warning-text">선택 필요</span> : null}
      {value ? <span className="text-body leading-snug text-text-secondary">{value}</span> : null}
      <Icon name="chevron-right" size={20} strokeWidth={1.67} className="shrink-0 text-text-secondary" />
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} {...pressableProps} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onPress} {...pressableProps} className={className}>
      {content}
    </button>
  );
}

/** 계정 정보 행(APP · 계정 정보 행). 로그인 서비스에서 받은 값이라 고칠 수 없어 꺾쇠와 누르는 영역이 없다. */
function AccountRow({ member }: { readonly member: UserResponse }) {
  return (
    <div className="flex min-h-13 items-center gap-3 px-gutter">
      <RowIcon name="mail" />
      <span className="flex-1 text-title text-text-primary">이메일</span>
      <span className="flex min-w-0 items-center gap-3">
        <ProviderBadge provider={member.provider} size="medium" />
        <span className="sr-only">{providerName(member.provider)} 계정</span>
        <span className="truncate text-body leading-snug text-text-secondary">{member.email}</span>
      </span>
    </div>
  );
}

const savedCountLabel = (status: string, count: number): string | null => {
  if (status !== "ready") return null;
  return `${count}개`;
};

function CenterMessage({ role, children }: { readonly role: "alert" | "status"; readonly children: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-gutter">
      <p role={role} className="text-title text-text-secondary">
        {children}
      </p>
    </main>
  );
}

/** 마이페이지(S55). 계정 · 내 정보 · 관심 제품 · 검색 · 기타 다섯 묶음이다. */
export function MyPageScreen() {
  const router = useRouter();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // 나만의 필터에 든 성분 수. 읽지 못하면 값 자리를 비워 둔다.
  const [filterCount, setFilterCount] = useState<number>();
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

  useEffect(() => {
    fetchSkinFilter().then(
      (filter) => setFilterCount(filter.items.length),
      () => undefined,
    );
  }, []);

  /** 로그아웃하면 로그인 전 상태의 홈으로 보낸다(S55e). */
  const signOut = () => {
    setPending(true);
    logout()
      .then(() => {
        notifyAppLogout();
        void reloadSavedProducts();
        router.replace("/");
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        // TODO(#728): 토스트로 알린다. 지금은 브라우저 알림 창을 쓴다.
        window.alert(LOGOUT_FAILED);
        setPending(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );
  }

  // TODO(#728): 화면 오류(ErrorState)와 스켈레톤으로 바꾼다.
  if (loadFailed)
    return <CenterMessage role="alert">회원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</CenterMessage>;
  if (!member) return <CenterMessage role="status">불러오는 중이에요</CenterMessage>;

  return (
    <>
      <TopBar title="마이페이지" variant="sub" />
      <main className="flex flex-1 flex-col pb-6">
        <Section title="계정">
          <AccountRow member={member} />
        </Section>

        <Section title="내 정보">
          <MenuRow href="/my-page/gender" icon="user" label="성별" value={profileLabel(GENDERS, member.gender)} />
          <MenuRow
            href="/my-page/age-range"
            icon="cake"
            label="나이대"
            value={profileLabel(AGE_RANGES, member.ageRange)}
          />
          <MenuRow href="/my-page/skin-type" icon="droplet" label="피부 타입" value={skinSummaryOf(member)} />
        </Section>

        <Section title="관심 제품">
          <MenuRow
            href="/my-page/wishlist"
            icon="bookmark"
            label="위시리스트"
            value={savedCountLabel(saved.status, saved.ids.length)}
          />
        </Section>

        <Section title="검색">
          <MenuRow
            href="/my-page/filter"
            icon="filter"
            label="나만의 필터"
            value={filterCount === undefined ? null : filterCountLabel(filterCount)}
          />
        </Section>

        <Section title="기타">
          <MenuRow href="/about" icon="info-circle" label="서비스 소개" value={null} />
          <MenuRow icon="logout" label="로그아웃" value={null} onPress={() => setLogoutOpen(true)} />
          <MenuRow href="/my-page/withdraw" icon="user-x" label="탈퇴하기" value={null} />
        </Section>
      </main>

      <LogoutSheet open={logoutOpen} pending={pending} onClose={() => setLogoutOpen(false)} onConfirm={signOut} />
    </>
  );
}
