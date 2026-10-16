"use client";

import { Button } from "@poudy/design-system/button";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
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
import { takeLoginReturn } from "@/lib/storage/login-return";

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

function SkipButton({ onSkip }: { readonly onSkip: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      onClick={onSkip}
      {...pressableProps}
      className="pressable fb-surface flex h-8 shrink-0 items-center rounded-sm pl-2 text-body-sm leading-snug font-medium text-text-secondary"
    >
      건너뛰기
    </button>
  );
}

function PrivacyNote() {
  return (
    <p className="flex items-center gap-1 pt-1 text-body-sm leading-snug text-text-muted">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        className="shrink-0"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      </svg>
      맞춤 추천에만 쓰고, 다른 사람에게 보이지 않아요.
    </p>
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
export function OnboardingScreen() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const router = useRouter();
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
    setFailed(false);
    updateMyProfile({ gender, ageRange, skinType, sensitiveSkin: sensitiveSkinOf(sensitivity) })
      .then(() => router.replace(takeLoginReturn()))
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        setFailed(true);
        setSaving(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );
  }

  return (
    <main className="flex min-h-svh flex-col">
      <form onSubmit={start} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-8 px-gutter py-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-hero font-bold text-text-primary">
                피부에 맞는 제품을 <br />
                보여 드릴게요
              </h1>
              <SkipButton onSkip={() => router.replace(takeLoginReturn())} />
            </div>
            <p className="text-title text-text-secondary">아는 것만 골라 주세요. 나중에 언제든 바꿀 수 있어요.</p>
            <PrivacyNote />
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
        </div>

        {/* TODO(#729): 하단 행동 영역(BottomActionBar)이 들어오면 그 안에 둔다. 지금은 화면 끝에 붙인다. */}
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-gutter pt-3 pb-safe">
          {/* TODO(#728): 저장하지 못하면 토스트로 알린다. 지금은 버튼 위에 문구를 둔다. */}
          {failed ? (
            <p role="alert" className="text-center text-body text-text-secondary">
              {SAVE_FAILED}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={!answered} busy={saving}>
            {startLabel(answered)}
          </Button>
        </div>
      </form>
    </main>
  );
}
