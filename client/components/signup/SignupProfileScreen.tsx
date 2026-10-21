"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useId, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { findMe, isAdminSession, isSignedOut, updateMyProfile } from "@/lib/api/member";
import {
  AGE_RANGES,
  type AgeRange,
  type Gender,
  GENDERS,
  type ProfileOption,
  SENSITIVITIES,
  type Sensitivity,
  sensitiveSkinOf,
  sensitivityOf,
  SKIN_KINDS,
  type SkinType,
} from "@/lib/domain/member-profile";
import { completeLoginReturn } from "@/lib/storage/login-return";

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

const valueIn = <T extends string>(options: readonly ProfileOption<T>[], value: string): T | null =>
  options.find((option) => option.value === value)?.value ?? null;

/**
 * 고른 선택지를 다시 누르면 선택을 푼다. 가입 정보는 모두 고르지 않아도 되므로, 잘못 고른 것을 비울 수 있어야 한다.
 * 이미 골라진 radio 는 change 가 일어나지 않아 묶음에서 click 을 받아 확인한다.
 */
function Deselectable({
  selected,
  onClear,
  children,
}: {
  readonly selected: string | null;
  readonly onClear: () => void;
  readonly children: ReactNode;
}) {
  const clearOnRepeat = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "radio" && target.value === selected) onClear();
  };

  return <div onClick={clearOnRepeat}>{children}</div>;
}

type FieldProps = {
  readonly title: string;
  readonly description?: string;
  readonly children: (labelId: string) => ReactNode;
};

/** 한 항목의 머리(16 굵게)와 선택지. 머리와 선택지 사이는 12 다. */
function Field({ title, description, children }: FieldProps) {
  const labelId = useId();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={labelId} className="text-section font-bold text-text-primary">
          {title}
        </h2>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
      </div>
      {children(labelId)}
    </section>
  );
}

/**
 * 글자 끝을 거터에 맞추려고 오른쪽 여백이 없다(명세 왼쪽 8 · 오른쪽 0). 그래서 hover 면은 버튼이 아니라 가상 요소에 그려
 * 오른쪽으로 8 넓힌다. 글자 양옆이 8 로 같아지고, 버튼 자리와 글자 위치는 바뀌지 않는다.
 */
function SkipButton({ onSkip }: { readonly onSkip: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      onClick={onSkip}
      {...pressableProps}
      className="pressable isolate flex h-8 shrink-0 items-center rounded-sm pl-2 text-body-sm leading-snug font-medium text-text-secondary before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:-right-2 before:-z-1 before:rounded-sm before:transition-colors before:duration-(--duration-fast) data-hovered:before:bg-hover data-pressed:before:bg-hover"
    >
      건너뛰기
    </button>
  );
}

const startLabel = (answered: boolean): string => {
  if (answered) return "시작하기";
  return "하나 이상 골라 주세요";
};

/**
 * 가입 정보 입력(S38 · S38a · S38b). 성별·나이대·피부 타입·민감한지를 따로 묻고, 아는 것만 골라도 시작할 수 있다.
 * 마이페이지 피부 타입(S55c)과 같이 피부 타입과 민감한지를 따로 저장한다.
 * 명세의 '내 피부 타입을 잘 모르겠어요' 링크는 피부 타입 테스트를 열기 전까지 숨긴다.
 */
export function SignupProfileScreen() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const answered = Boolean(gender || ageRange || skinType || sensitivity);

  useEffect(() => {
    findMe()
      .then((member) => {
        setGender(member.gender);
        setAgeRange(member.ageRange);
        setSkinType(member.skinType);
        setSensitivity(sensitivityOf(member.sensitiveSkin));
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) router.replace("/login");
        if (isAdminSession(error)) setAdminSession(true);
      });
  }, [router]);

  const start = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answered || saving) return;

    setSaving(true);
    updateMyProfile({ gender, ageRange, skinType, sensitiveSkin: sensitiveSkinOf(sensitivity) })
      .then(() => completeLoginReturn(router.replace))
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        setSaving(false);
        toast.show({ message: SAVE_FAILED });
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );
  }

  return (
    <Screen scroll="document">
      <ScreenBody>
        <main className="flex flex-1 flex-col">
          {/* 토스트는 하단 행동 영역 바로 위에 뜬다(data-toast-offset, globals.css). */}
          <form
            id={formId}
            onSubmit={start}
            data-toast-offset="action-bar"
            className="flex flex-1 flex-col gap-8 px-gutter py-6"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-hero font-bold text-text-primary">나에 대해 알려 주세요</h1>
                <SkipButton onSkip={() => completeLoginReturn(router.replace)} />
              </div>
              <p className="text-body-sm text-text-secondary">알려 주실수록 내 피부에 더 맞는 제품을 추천해 드려요.</p>
            </div>

            <Field title="성별">
              {(labelId) => (
                <Deselectable selected={gender} onClear={() => setGender(null)}>
                  <RadioGroup
                    aria-labelledby={labelId}
                    variant="choice"
                    columns={2}
                    value={gender ?? undefined}
                    onValueChange={(value) => setGender(valueIn(GENDERS, value))}
                  >
                    {GENDERS.map(({ value, label }) => (
                      <RadioGroupItem key={value} value={value}>
                        {label}
                      </RadioGroupItem>
                    ))}
                  </RadioGroup>
                </Deselectable>
              )}
            </Field>

            <Field title="나이대">
              {(labelId) => (
                <Deselectable selected={ageRange} onClear={() => setAgeRange(null)}>
                  <RadioGroup
                    aria-labelledby={labelId}
                    variant="choice"
                    columns={3}
                    value={ageRange ?? undefined}
                    onValueChange={(value) => setAgeRange(valueIn(AGE_RANGES, value))}
                  >
                    {AGE_RANGES.map(({ value, label }) => (
                      <RadioGroupItem key={value} value={value}>
                        {label}
                      </RadioGroupItem>
                    ))}
                  </RadioGroup>
                </Deselectable>
              )}
            </Field>

            <Field title="피부 타입">
              {(labelId) => (
                <Deselectable selected={skinType} onClear={() => setSkinType(null)}>
                  <RadioGroup
                    aria-labelledby={labelId}
                    variant="card"
                    columns={3}
                    value={skinType ?? undefined}
                    onValueChange={(value) => setSkinType(valueIn(SKIN_KINDS, value))}
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
                </Deselectable>
              )}
            </Field>

            <Field title="피부가 민감한 편인가요?" description="쉽게 붉어지고 따가워요">
              {(labelId) => (
                <Deselectable selected={sensitivity} onClear={() => setSensitivity(null)}>
                  <RadioGroup
                    aria-labelledby={labelId}
                    variant="choice"
                    columns={2}
                    value={sensitivity ?? undefined}
                    onValueChange={(value) => setSensitivity(valueIn(SENSITIVITIES, value))}
                  >
                    {SENSITIVITIES.map(({ value, label }) => (
                      <RadioGroupItem key={value} value={value}>
                        {label}
                      </RadioGroupItem>
                    ))}
                  </RadioGroup>
                </Deselectable>
              )}
            </Field>
          </form>
        </main>
      </ScreenBody>

      <BottomActionBar
        position="screen-end"
        action={{ label: startLabel(answered), type: "submit", form: formId, disabled: !answered, busy: saving }}
      />
    </Screen>
  );
}
