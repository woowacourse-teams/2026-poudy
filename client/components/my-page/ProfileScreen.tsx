"use client";

import { type UserResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton, SkeletonSlowNotice } from "@poudy/design-system/skeleton";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { type NicknameAvailability, NicknameField } from "@/components/profile/NicknameField";
import { ProfileImageField } from "@/components/profile/ProfileImageField";
import { useProfileImage } from "@/components/profile/useProfileImage";
import { ApiError } from "@/lib/api/client";
import { checkNicknameAvailability, findMe, isAdminSession, isSignedOut, updateMyProfile } from "@/lib/api/member";
import { RETRY_LATER } from "@/lib/domain/messages";
import { NICKNAME_TAKEN, nicknameError, nicknameServerError } from "@/lib/domain/nickname";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameFailure, setNicknameFailure] = useState<string>();
  const [nicknameCheck, setNicknameCheck] = useState<{ readonly nickname: string; readonly available: boolean }>();
  // 확인 응답이 오기 전에 닉네임을 고쳤으면 그 응답은 지금 값의 결과가 아니다.
  const latestNickname = useRef("");
  const debouncedNickname = useDebouncedValue(nickname);
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
        latestNickname.current = found.nickname;
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

  useEffect(() => {
    if (!member || debouncedNickname === member.nickname || nicknameError(debouncedNickname)) return;
    let cancelled = false;
    const check = async () => {
      try {
        const { available } = await checkNicknameAvailability(debouncedNickname);
        if (cancelled || debouncedNickname !== latestNickname.current) return;
        setNicknameCheck({ nickname: debouncedNickname, available });
        if (!available) setNicknameFailure(NICKNAME_TAKEN);
      } catch (error: unknown) {
        if (cancelled || debouncedNickname !== latestNickname.current) return;
        if (isSignedOut(error)) {
          rememberLoginReturn();
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) {
          setAdmin(true);
          return;
        }
        setNicknameCheck({ nickname: debouncedNickname, available: false });
        if (error instanceof ApiError && error.status === 400)
          setNicknameFailure(nicknameServerError(error.code, debouncedNickname));
        else toast.show({ message: `닉네임 중복을 확인하지 못했어요. ${RETRY_LATER}` });
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [debouncedNickname, member, router, toast]);

  const availabilityOf = (): NicknameAvailability => {
    if (!member || nickname === member.nickname) return "unchanged";
    if (nicknameError(nickname)) return "unavailable";
    if (nicknameCheck?.nickname !== nickname) return "checking";
    if (nicknameCheck.available) return "available";
    return "unavailable";
  };
  const availability = availabilityOf();
  const changed = member !== null && (nickname !== member.nickname || image.changed);
  const blocked =
    !changed ||
    saving ||
    image.uploading ||
    image.failed ||
    (availability !== "unchanged" && availability !== "available");
  // 화면 하단 버튼은 막힌 이유를 버튼 글자로 말한다(S55k, FEEDBACK F06).
  const actionLabelOf = (): string => {
    if (!changed) return "바꾼 내용이 없어요";
    if (image.uploading) return "사진을 올리는 중이에요";
    if (image.failed) return "사진을 확인해 주세요";
    if (availability === "unavailable") return "닉네임을 확인해 주세요";
    return "저장";
  };

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
          setNicknameCheck({ nickname, available: false });
          setNicknameFailure(nicknameServerError(error.code, nickname));
        } else {
          toast.show({
            message:
              error instanceof ApiError && error.status === 429
                ? `수정 요청이 잦아요. ${RETRY_LATER}`
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
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar title="프로필 수정" />
      <ScreenBody>
        <main className="flex flex-1 flex-col" aria-busy={!member && !loadFailed}>
          {loadFailed ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="프로필을 불러오지 못했어요"
              description={RETRY_LATER}
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
            <form id={formId} onSubmit={save} className="flex flex-col gap-8 px-gutter pt-6 pb-inquiry">
              <ProfileImageField
                src={image.src}
                uploading={image.uploading}
                failed={image.failed}
                rejection={image.rejection}
                disabled={saving}
                onSelect={image.select}
                onRetry={image.retry}
                onRemove={image.remove}
              />
              <NicknameField
                value={nickname}
                onChange={(value) => {
                  latestNickname.current = value;
                  setNickname(value);
                  setNicknameFailure(undefined);
                }}
                availability={availability}
                disabled={saving}
                error={nicknameFailure}
              />
            </form>
          ) : (
            <>
              {/* 10초가 넘으면 스켈레톤 위에 안내와 [다시 시도]를 보인다(F02). */}
              <SkeletonSlowNotice active onRetry={() => setAttempt((current) => current + 1)} />
              <div aria-hidden="true" className="flex flex-col items-center gap-8 px-gutter py-6">
                <Skeleton shape="circle" className="size-20" />
                <Skeleton shape="line" size={16} className="w-full" />
              </div>
            </>
          )}
        </main>
      </ScreenBody>
      {member && !loadFailed ? (
        <div data-toast-offset="action-bar" className="contents">
          <BottomActionBar
            position="screen-end"
            action={{ label: actionLabelOf(), type: "submit", form: formId, disabled: blocked, busy: saving }}
          />
        </div>
      ) : null}
    </Screen>
  );
}
