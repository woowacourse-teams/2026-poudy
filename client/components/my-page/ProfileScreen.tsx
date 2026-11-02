"use client";

import { type UserResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { NicknameField } from "@/components/profile/NicknameField";
import { ProfileImageField } from "@/components/profile/ProfileImageField";
import { useProfileImage } from "@/components/profile/useProfileImage";
import { ApiError } from "@/lib/api/client";
import { findMe, isAdminSession, isSignedOut, updateMyProfile } from "@/lib/api/member";
import { nicknameError } from "@/lib/domain/nickname";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameFailure, setNicknameFailure] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [admin, setAdmin] = useState(false);

  const handleAuth = (error: unknown): boolean => {
    if (isSignedOut(error)) {
      rememberLoginReturn();
      router.replace("/login");
      return true;
    }
    if (isAdminSession(error)) {
      setAdmin(true);
      return true;
    }
    return false;
  };
  const image = useProfileImage(member?.profileImageUrl ?? null, handleAuth);

  useEffect(() => {
    let cancelled = false;
    findMe()
      .then((found) => {
        if (cancelled) return;
        setMember(found);
        setNickname(found.nickname);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSignedOut(error)) {
          rememberLoginReturn();
          router.replace("/login");
        } else if (isAdminSession(error)) setAdmin(true);
        else setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  const changed = member !== null && (nickname !== member.nickname || image.changed);
  const blocked = !changed || saving || image.uploading || Boolean(nicknameError(nickname));
  const save = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member || blocked) return;
    setSaving(true);
    setNicknameFailure(undefined);
    updateMyProfile({
      gender: member.gender,
      ageRange: member.ageRange,
      skinType: member.skinType,
      sensitiveSkin: member.sensitiveSkin,
      ...(nickname !== member.nickname ? { nickname } : {}),
      ...(image.changed ? { profileImageId: image.imageId } : {}),
    })
      .then(() => {
        if (hasInSiteHistory()) router.back();
        else router.replace("/my-page");
      })
      .catch((error: unknown) => {
        if (handleAuth(error)) return;
        if (error instanceof ApiError && (error.status === 409 || error.code.includes("NICKNAME"))) {
          setNicknameFailure(error.message);
        } else {
          toast.show({
            message:
              error instanceof ApiError && error.status === 429
                ? "수정 요청이 잦아요. 잠시 후 다시 저장해 주세요."
                : "저장하지 못했어요. 입력한 내용은 그대로 있으니 다시 시도해 주세요.",
          });
        }
        setSaving(false);
      });
  };

  if (admin)
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );

  return (
    <Screen scroll="document">
      <SubTopBar title="프로필 수정" />
      <ScreenBody>
        <main className="flex flex-1 flex-col" aria-busy={!member && !loadFailed}>
          {loadFailed ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="프로필을 불러오지 못했어요"
              description="잠시 후 다시 시도해 주세요."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLoadFailed(false);
                    setAttempt((current) => current + 1);
                  }}
                >
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          ) : member ? (
            <form id={formId} onSubmit={save} className="flex flex-col gap-8 px-gutter py-6">
              <ProfileImageField
                src={image.src}
                uploading={image.uploading}
                failure={image.failure}
                disabled={saving}
                onSelect={image.select}
                onRemove={image.remove}
                onDismissFailure={image.dismissFailure}
              />
              <NicknameField
                value={nickname}
                onChange={(value) => {
                  setNickname(value);
                  setNicknameFailure(undefined);
                }}
                disabled={saving}
                error={nicknameFailure}
              />
            </form>
          ) : (
            <div aria-hidden="true" className="flex flex-col items-center gap-8 px-gutter py-6">
              <Skeleton shape="circle" className="size-20" />
              <Skeleton shape="line" size={16} className="w-full" />
            </div>
          )}
        </main>
      </ScreenBody>
      {member && !loadFailed ? (
        <div data-toast-offset="action-bar" className="contents">
          <BottomActionBar
            position="screen-end"
            action={{ label: "저장", type: "submit", form: formId, disabled: blocked, busy: saving }}
          />
        </div>
      ) : null}
    </Screen>
  );
}
