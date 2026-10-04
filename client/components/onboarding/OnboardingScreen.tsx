"use client";

import type { MemberProfileRequest } from "@poudy/api/api.zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { findMe, isSignedOut, updateMyProfile } from "@/lib/api/member";

type Gender = MemberProfileRequest["gender"];
type AgeRange = MemberProfileRequest["ageRange"];
type SkinType = MemberProfileRequest["skinType"];

const GENDERS: readonly { readonly value: Gender; readonly label: string }[] = [
  { value: "FEMALE", label: "여성" },
  { value: "MALE", label: "남성" },
];
const AGE_RANGES: readonly { readonly value: AgeRange; readonly label: string }[] = [
  { value: "TEENS", label: "10대" },
  { value: "TWENTIES", label: "20대" },
  { value: "THIRTIES", label: "30대" },
  { value: "FORTIES", label: "40대" },
  { value: "FIFTIES", label: "50대" },
  { value: "SIXTIES_OR_OLDER", label: "60대 이상" },
];
const SKIN_TYPES: readonly {
  readonly value: SkinType;
  readonly icon: string;
  readonly name: string;
  readonly description: string;
}[] = [
  { value: "DRY", icon: "dry", name: "건성", description: "세안 후 자주 당겨요" },
  { value: "OILY", icon: "oily", name: "지성", description: "오후면 번들거려요" },
  { value: "SENSITIVE", icon: "sensitive", name: "민감성", description: "쉽게 붉어지고 따가워요" },
  { value: "COMBINATION", icon: "combination", name: "복합성", description: "T존만 번들거려요" },
];
const UNKNOWN_SKIN_TYPE: SkinType = "UNKNOWN";

type ChoiceProps<T extends string> = {
  readonly group: string;
  readonly value: T;
  readonly selected: boolean;
  readonly onSelect: (value: T) => void;
  readonly children: React.ReactNode;
  readonly card?: boolean;
};

function Choice<T extends string>({ group, value, selected, onSelect, children, card = false }: ChoiceProps<T>) {
  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        name={group}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        className={`flex rounded-xl border border-[#d3d6dc] bg-background text-[15px] peer-checked:border-action peer-checked:ring-1 peer-checked:ring-action peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-action ${
          card ? "min-h-[108px] flex-col items-start gap-2 p-3.5" : "h-[52px] items-center justify-center gap-2"
        }`}
      >
        {!card && selected ? <Icon name="check" size={16} strokeWidth={2} /> : null}
        {children}
      </span>
      {card && selected ? (
        <span
          className="absolute top-4 right-3.5 flex size-4.5 items-center justify-center rounded-full border-[1.5px] border-action"
          aria-hidden="true"
        >
          <Icon name="check" size={11} strokeWidth={2.5} />
        </span>
      ) : null}
    </label>
  );
}

export function OnboardingScreen() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const canStart = Boolean(gender && ageRange && skinType) && !saving;

  useEffect(() => {
    findMe()
      .then((member) => {
        setGender(member.gender);
        setAgeRange(member.ageRange);
        setSkinType(member.skinType);
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) router.replace("/login");
      });
  }, [router]);

  const start = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gender || !ageRange || !skinType || saving) return;

    setSaving(true);
    setFailed(false);
    updateMyProfile({ gender, ageRange, skinType })
      .then(() => router.replace("/"))
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        setFailed(true);
        setSaving(false);
      });
  };

  return (
    <main className="flex min-h-svh flex-col">
      <form onSubmit={start} className="flex flex-1 flex-col">
        <div className="flex-1 px-4 pt-10 pb-12">
          <h1 className="text-[24px] leading-[1.4] font-bold tracking-tight">
            피부에 맞는 제품을 <br />
            보여 드릴게요
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            세 가지만 골라 주세요. 나중에 언제든 바꿀 수 있어요.
          </p>
          <p className="mt-3 flex items-start gap-1.5 text-[13px] leading-relaxed text-text-secondary">
            <svg
              width="14"
              height="16"
              viewBox="0 0 24 24"
              className="mt-0.5 shrink-0"
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

          <fieldset className="mt-9">
            <legend className="mb-3 text-[16px] font-bold">성별</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {GENDERS.map(({ value, label }) => (
                <Choice key={value} group="gender" value={value} selected={gender === value} onSelect={setGender}>
                  <span className={gender === value ? "font-bold" : "font-medium text-[#55585e]"}>{label}</span>
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-9">
            <legend className="mb-3 text-[16px] font-bold">나이대</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {AGE_RANGES.map(({ value, label }) => (
                <Choice
                  key={value}
                  group="age-range"
                  value={value}
                  selected={ageRange === value}
                  onSelect={setAgeRange}
                >
                  <span className={ageRange === value ? "font-bold" : "font-medium text-[#55585e]"}>{label}</span>
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-9">
            <legend className="mb-3 text-[16px] font-bold">피부 타입</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {SKIN_TYPES.map(({ value, icon, name, description }) => (
                <Choice
                  key={value}
                  group="skin-type"
                  value={value}
                  selected={skinType === value}
                  onSelect={setSkinType}
                  card
                >
                  <Image src={`/images/skin-types/${icon}.svg`} alt="" width={24} height={24} />
                  <span className="font-bold">{name}</span>
                  <span className="text-[13px] leading-relaxed text-text-secondary">{description}</span>
                </Choice>
              ))}
            </div>
            <label className="relative mt-3 inline-flex cursor-pointer items-center gap-1 py-1.5 text-[14px] font-semibold text-text-secondary">
              <input
                type="radio"
                name="skin-type"
                value={UNKNOWN_SKIN_TYPE}
                checked={skinType === UNKNOWN_SKIN_TYPE}
                onChange={() => setSkinType(UNKNOWN_SKIN_TYPE)}
                className="peer sr-only"
              />
              <span className="rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-action">
                내 피부 타입을 잘 모르겠어요
              </span>
              <Icon name={skinType === UNKNOWN_SKIN_TYPE ? "check" : "chevron-right"} size={16} />
            </label>
          </fieldset>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background px-4 pt-3 pb-6">
          {failed ? (
            <p role="alert" className="mb-3 text-center text-[14px] text-text-secondary">
              저장하지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canStart}
            className="flex h-14 w-full items-center justify-center rounded-button bg-action text-[16px] font-bold text-action-text disabled:cursor-default disabled:opacity-40"
          >
            시작하기
          </button>
        </div>
      </form>
    </main>
  );
}
