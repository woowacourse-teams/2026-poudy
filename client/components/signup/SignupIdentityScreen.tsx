"use client";

import { type UserResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { NicknameField } from "@/components/profile/NicknameField";
import { ProfileImageField } from "@/components/profile/ProfileImageField";
import { useProfileImage } from "@/components/profile/useProfileImage";
import { completeLoginAnalytics } from "@/lib/analytics/login";
import { ApiError } from "@/lib/api/client";
import { findMe, isAdminSession, isSignedOut, updateMyProfile } from "@/lib/api/member";
import { nicknameError } from "@/lib/domain/nickname";

/** 가입 첫 단계. 닉네임·사진을 선택한 다음 피부 정보 페이지로 이동한다. */
export function SignupIdentityScreen() {
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameFailure, setNicknameFailure] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const handleAuth = (error: unknown): boolean => {
    if (isSignedOut(error)) {
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
        completeLoginAnalytics(found);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSignedOut(error)) router.replace("/login");
        else if (isAdminSession(error)) setAdmin(true);
        else setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  const blocked = !member || image.uploading || Boolean(nicknameError(nickname, true));
  const next = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member || blocked || saving) return;
    if (member.profileSetupCompleted !== false && (!nickname || nickname === member.nickname) && !image.changed) {
      router.push("/signup/skin");
      return;
    }
    setSaving(true);
    setNicknameFailure(undefined);
    updateMyProfile({
      gender: member.gender,
      ageRange: member.ageRange,
      skinType: member.skinType,
      sensitiveSkin: member.sensitiveSkin,
      profileSetupCompleted: true,
      ...(nickname ? { nickname } : {}),
      ...(image.changed ? { profileImageId: image.imageId } : {}),
    })
      .then(() => router.push("/signup/skin"))
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
      <ScreenBody>
        <main className="flex flex-1 flex-col" aria-busy={!member && !loadFailed}>
          <form id={formId} onSubmit={next} className="flex flex-1 flex-col gap-8 px-gutter py-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-hero font-bold text-text-primary">프로필을 만들어 주세요</h1>
              <p className="text-body-sm text-text-secondary">닉네임과 사진은 나중에도 바꿀 수 있어요.</p>
            </div>
            {loadFailed ? (
              <div role="alert" className="flex flex-col items-start gap-2">
                <p className="text-body-sm text-danger-action">프로필을 불러오지 못했어요. 다시 시도해 주세요.</p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setLoadFailed(false);
                    setAttempt((current) => current + 1);
                  }}
                >
                  다시 시도
                </Button>
              </div>
            ) : null}
            <ProfileImageField
              src={image.src}
              uploading={image.uploading}
              failure={image.failure}
              disabled={!member || saving}
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
              placeholder={member?.nickname}
              optional
              disabled={!member || saving}
              error={nicknameFailure}
            />
          </form>
        </main>
      </ScreenBody>
      <div data-toast-offset="action-bar" className="contents">
        <BottomActionBar
          position="screen-end"
          action={{ label: "다음", type: "submit", form: formId, disabled: blocked, busy: saving }}
        />
      </div>
    </Screen>
  );
}
