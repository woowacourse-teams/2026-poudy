"use client";

import type { UserResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon, type IconName } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useToast } from "@poudy/design-system/toast";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { ProviderBadge } from "@/components/login/ProviderIcon";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { findMe, isAdminSession, isSignedOut, logout } from "@/lib/api/member";
import { fetchSkinFilter } from "@/lib/api/skin-filter";
import { formatCount } from "@/lib/domain/format";
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

function RowIcon({ name }: { readonly name: IconName }) {
  return <Icon name={name} size={20} scalable className="text-text-primary" />;
}

type MenuRowProps = {
  readonly icon: IconName;
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
      {/*
        글자를 키워 한 줄에 다 들지 않으면 값이 이름 아래 줄로 내려간다. 이름과 값이 낱말 가운데에서 갈라지지 않게 한다.
        값은 남은 폭을 채우고 오른쪽에 붙어, 한 줄일 때도 내려갔을 때도 꺾쇠 쪽에 선다.
      */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3">
        <span className="text-title text-text-primary">{label}</span>
        {value === undefined ? (
          <span className="grow text-right text-body leading-snug break-keep text-warning-text">선택 필요</span>
        ) : null}
        {value ? (
          <span className="grow text-right text-body leading-snug break-keep text-text-secondary">{value}</span>
        ) : null}
      </span>
      <Icon name="chevron-right" size={20} scalable className="text-text-secondary" />
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
    // 링크가 아닌 행은 로그아웃처럼 확인 시트를 여는 행뿐이다.
    <button type="button" aria-haspopup="dialog" onClick={onPress} {...pressableProps} className={className}>
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
  return formatCount(count);
};

/** 묶음 제목 한 줄과 행 개수. 실제 화면(S55)의 묶음과 같은 순서다. */
const SKELETON_SECTIONS = [1, 3, 1, 1, 3] as const;

/** 회원 정보를 기다리는 동안 묶음과 행의 자리(FEEDBACK F02). 묶음 제목과 행 높이를 실제와 맞춘다. */
function MyPageSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {SKELETON_SECTIONS.map((rows, section) => (
        <div key={section} className="border-b border-border py-2 first:pt-0 last:border-b-0">
          <div className="px-gutter pt-5 pb-1">
            <Skeleton shape="line" size={12} className="w-12" />
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex min-h-13 items-center gap-3 px-gutter">
              <Skeleton shape="circle" className="size-5" />
              <Skeleton shape="line" size={16} className="w-20" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 마이페이지(S55). 계정 · 내 정보 · 관심 제품 · 검색 · 기타 다섯 묶음이다. */
export function MyPageScreen() {
  const router = useRouter();
  const toast = useToast();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [adminSession, setAdminSession] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // 나만의 필터에 든 성분 수. 읽지 못하면 값 자리를 비워 둔다.
  const [filterCount, setFilterCount] = useState<number>();
  const saved = useSyncExternalStore(subscribeSavedProducts, getSavedProductsSnapshot, getSavedProductsServerSnapshot);
  const loading = member === null && !loadFailed && !adminSession;
  const showSkeleton = useDelayedFlag(loading);

  // 회원 정보는 서버에만 있어 화면이 열릴 때(그리고 [다시 시도]를 누를 때) 받아 온다.
  useEffect(() => {
    let cancelled = false;
    findMe()
      .then((found) => {
        if (!cancelled) setMember(found);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  // 나만의 필터의 성분 수도 서버에만 있다. 읽지 못해도 화면은 그대로 쓴다.
  useEffect(() => {
    fetchSkinFilter().then(
      (filter) => setFilterCount(filter.items.length),
      () => undefined,
    );
  }, []);

  const retry = () => {
    setLoadFailed(false);
    setAttempt((count) => count + 1);
  };

  /** 로그아웃하면 로그인 전 상태의 홈으로 보낸다(S55e). 실패하면 시트를 연 채 토스트로 알린다(FEEDBACK F01). */
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
        toast.show({ message: LOGOUT_FAILED });
        setPending(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );
  }

  const content = (() => {
    if (loadFailed) {
      return (
        <ErrorState
          variant="screen"
          icon={<Icon name="alert-circle" size={28} />}
          title="회원 정보를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="secondary" onClick={retry}>
              다시 시도
            </Button>
          }
          className="flex-1"
        />
      );
    }
    if (!member) return showSkeleton ? <MyPageSkeleton /> : null;
    return (
      <>
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
      </>
    );
  })();

  return (
    <Screen scroll="document">
      <SubTopBar title="마이페이지" />
      <ScreenBody>
        <main aria-busy={loading} className="flex flex-1 flex-col pb-6">
          {content}
        </main>
      </ScreenBody>

      <ConfirmSheet
        open={logoutOpen}
        title="로그아웃할까요?"
        description="다시 로그인하면 선반과 위시리스트를 그대로 볼 수 있어요."
        confirmLabel="로그아웃"
        busy={pending}
        onConfirm={signOut}
        onCancel={() => setLogoutOpen(false)}
      />
    </Screen>
  );
}
