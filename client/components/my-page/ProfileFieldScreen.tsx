"use client";

import type { UserProfileRequest, UserResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { findMe, isAdminSession, isSignedOut, updateMyProfile } from "@/lib/api/member";
import {
  AGE_RANGES,
  GENDERS,
  type ProfileOption,
  SENSITIVITIES,
  type Sensitivity,
  sensitiveSkinOf,
  sensitivityOf,
  SKIN_KINDS,
} from "@/lib/domain/member-profile";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export type ProfileField = Exclude<
  keyof UserProfileRequest,
  "sensitiveSkin" | "profileImageId" | "nickname" | "profileSetupCompleted"
>;

const TITLES: Readonly<Record<ProfileField, string>> = { gender: "성별", ageRange: "나이대", skinType: "피부 타입" };

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const LOAD_FAILED = "회원 정보를 불러오지 못했어요";

const valueIn = <T extends string>(options: readonly ProfileOption<T>[], value: string | null): T | null =>
  options.find((option) => option.value === value)?.value ?? null;

const profileOf = (member: UserResponse): UserProfileRequest => ({
  gender: member.gender,
  ageRange: member.ageRange,
  skinType: member.skinType,
  sensitiveSkin: member.sensitiveSkin,
});

/** 회원 정보를 읽고, 고친 정보를 저장한 뒤 마이페이지로 돌아간다. 로그인 전·관리자 세션은 화면마다 같은 방식으로 처리한다. */
function useProfileEditor() {
  const router = useRouter();
  const toast = useToast();
  const [member, setMember] = useState<UserResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [adminSession, setAdminSession] = useState(false);

  const handleAuthError = (error: unknown): boolean => {
    if (isSignedOut(error)) {
      rememberLoginReturn();
      router.replace("/login");
      return true;
    }
    if (isAdminSession(error)) {
      setAdminSession(true);
      return true;
    }
    return false;
  };

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

  const retry = () => {
    setLoadFailed(false);
    setAttempt((count) => count + 1);
  };

  const save = (profile: UserProfileRequest) => {
    if (saving) return;
    setSaving(true);
    updateMyProfile(profile)
      .then(() => {
        if (hasInSiteHistory()) {
          router.back();
          return;
        }
        router.replace("/my-page");
      })
      .catch((error: unknown) => {
        if (handleAuthError(error)) return;
        // 고른 값은 화면에 남겨 두고 다시 누를 수 있게 한다(FEEDBACK F01).
        toast.show({ message: SAVE_FAILED });
        setSaving(false);
      });
  };

  return { member, saving, loadFailed, retry, adminSession, save };
}

type FieldFormProps = {
  readonly title: string;
  readonly changed: boolean;
  readonly saving: boolean;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
  readonly onSave: () => void;
  readonly children: React.ReactNode;
};

/**
 * 고르기 페이지의 틀(S55a·b·c). 지금 값이 골라진 채 열리고, 값을 바꾸면 [저장]이 켜진다.
 * 한 번 고른 값은 다른 값으로 바꿀 수만 있어 고른 것을 다시 눌러도 비지 않는다.
 */
function FieldForm({ title, changed, saving, loadFailed, onRetry, onSave, children }: FieldFormProps) {
  const formId = useId();
  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 입력 칸에서 Enter 로 보낼 때도 바뀐 것이 없으면 보내지 않는다. 버튼은 aria-disabled 라 누름만 막힌다.
    if (!changed) return;
    onSave();
  };

  return (
    <Screen scroll="document">
      <SubTopBar title={title} />
      <ScreenBody>
        {loadFailed ? (
          <main className="flex flex-1 flex-col">
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title={LOAD_FAILED}
              description="잠시 후 다시 시도해 주세요."
              action={
                <Button variant="secondary" onClick={onRetry}>
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          </main>
        ) : (
          <main className="flex flex-1 flex-col">
            <form id={formId} onSubmit={submit} className="flex flex-1 flex-col px-gutter pt-4 pb-6">
              {children}
            </form>
          </main>
        )}
      </ScreenBody>
      {loadFailed ? null : (
        // 토스트를 이 줄 위로 올리는 표식(globals.css). contents 라 줄의 sticky 는 그대로다.
        <div data-toast-offset="action-bar" className="contents">
          <BottomActionBar
            position="screen-end"
            action={{ label: "저장", type: "submit", form: formId, disabled: !changed, busy: saving }}
          />
        </div>
      )}
    </Screen>
  );
}

const OPTIONS: Readonly<Record<Exclude<ProfileField, "skinType">, readonly ProfileOption<string>[]>> = {
  gender: GENDERS,
  ageRange: AGE_RANGES,
};

/** 성별(S55a) · 나이대(S55b). 선택 행을 12 간격으로 쌓는다. */
function ChoiceFieldScreen({ field }: { readonly field: "gender" | "ageRange" }) {
  const { member, saving, loadFailed, retry, adminSession, save } = useProfileEditor();
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<UserResponse | null>(null);

  if (member !== loaded) {
    setLoaded(member);
    if (member) setSelected(member[field]);
  }

  if (adminSession)
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );

  const title = TITLES[field];
  const changed = member !== null && selected !== null && selected !== member[field];

  return (
    <FieldForm
      title={title}
      changed={changed}
      saving={saving}
      loadFailed={loadFailed}
      onRetry={retry}
      onSave={() => {
        if (!member) return;
        if (field === "gender") save({ ...profileOf(member), gender: valueIn(GENDERS, selected) });
        else save({ ...profileOf(member), ageRange: valueIn(AGE_RANGES, selected) });
      }}
    >
      <RadioGroup
        aria-label={title}
        variant="card-row"
        value={selected ?? undefined}
        onValueChange={setSelected}
        disabled={!member}
      >
        {OPTIONS[field].map((option) => (
          <RadioGroupItem key={option.value} value={option.value}>
            {option.label}
          </RadioGroupItem>
        ))}
      </RadioGroup>
    </FieldForm>
  );
}

type SkinDraft = { readonly skinType: string | null; readonly sensitivity: Sensitivity | null };

const draftOf = (member: UserResponse): SkinDraft => ({
  skinType: member.skinType,
  sensitivity: sensitivityOf(member.sensitiveSkin),
});

const SENSITIVITY_VALUES = new Set<string>(SENSITIVITIES.map((option) => option.value));

const isSensitivity = (value: string): value is Sensitivity => SENSITIVITY_VALUES.has(value);

/**
 * 피부 타입(S55c). 가입(S38)처럼 피부 타입(선택 카드 3열)과 민감한지(선택 버튼)를 따로 묻는다.
 * 명세의 '내 피부 타입을 잘 모르겠어요' 링크는 피부 타입 테스트를 열기 전까지 숨긴다.
 */
function SkinTypeFieldScreen() {
  const { member, saving, loadFailed, retry, adminSession, save } = useProfileEditor();
  const [draft, setDraft] = useState<SkinDraft>({ skinType: null, sensitivity: null });
  const [loaded, setLoaded] = useState<UserResponse | null>(null);
  const skinTypeId = useId();
  const sensitivityId = useId();

  if (member !== loaded) {
    setLoaded(member);
    if (member) setDraft(draftOf(member));
  }

  if (adminSession)
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );

  const saved = member ? draftOf(member) : draft;
  const changed = member !== null && (draft.skinType !== saved.skinType || draft.sensitivity !== saved.sensitivity);

  const submit = () => {
    if (!member) return;
    save({
      ...profileOf(member),
      skinType: valueIn(SKIN_KINDS, draft.skinType),
      sensitiveSkin: sensitiveSkinOf(draft.sensitivity),
    });
  };

  return (
    <FieldForm
      title={TITLES.skinType}
      changed={changed}
      saving={saving}
      loadFailed={loadFailed}
      onRetry={retry}
      onSave={submit}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 id={skinTypeId} className="text-section font-bold text-text-primary">
            피부 타입
          </h2>
          <RadioGroup
            aria-labelledby={skinTypeId}
            variant="card"
            columns={3}
            value={draft.skinType ?? undefined}
            onValueChange={(skinType) => setDraft((current) => ({ ...current, skinType }))}
            disabled={!member}
          >
            {SKIN_KINDS.map(({ value, icon, label, description: [first, second] }) => (
              <RadioGroupItem
                key={value}
                value={value}
                image={<Image src={`/images/skin-types/${icon}.svg`} alt="" width={28} height={28} />}
                description={
                  <>
                    {first}
                    <br />
                    {second}
                  </>
                }
              >
                {label}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id={sensitivityId} className="text-section font-bold text-text-primary">
              피부가 민감한 편인가요?
            </h2>
            <p className="text-body-sm text-text-secondary">쉽게 붉어지고 따가워요</p>
          </div>
          <RadioGroup
            aria-labelledby={sensitivityId}
            variant="choice"
            columns={2}
            value={draft.sensitivity ?? undefined}
            onValueChange={(value) => {
              if (isSensitivity(value)) setDraft((current) => ({ ...current, sensitivity: value }));
            }}
            disabled={!member}
          >
            {SENSITIVITIES.map((option) => (
              <RadioGroupItem key={option.value} value={option.value}>
                {option.label}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </section>
      </div>
    </FieldForm>
  );
}

/** 마이페이지에서 내 정보 한 항목을 고르는 페이지(S55a · S55b · S55c). */
export function ProfileFieldScreen({ field }: { readonly field: ProfileField }) {
  if (field === "skinType") return <SkinTypeFieldScreen />;
  return <ChoiceFieldScreen field={field} />;
}
