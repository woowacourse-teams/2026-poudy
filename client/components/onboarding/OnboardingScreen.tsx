"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";

const GENDERS = ["여성", "남성"] as const;
const AGE_GROUPS = ["10대", "20대", "30대", "40대", "50대", "60대 이상"] as const;
const SKIN_TYPES = [
  { value: "dry", name: "건성", description: "세안 후 자주 당겨요" },
  { value: "oily", name: "지성", description: "오후면 번들거려요" },
  { value: "sensitive", name: "민감성", description: "쉽게 붉어지고 따가워요" },
  { value: "combination", name: "복합성", description: "T존만 번들거려요" },
] as const;

type ChoiceProps = {
  readonly group: string;
  readonly value: string;
  readonly selected: boolean;
  readonly onSelect: (value: string) => void;
  readonly children: React.ReactNode;
  readonly card?: boolean;
};

function Choice({ group, value, selected, onSelect, children, card = false }: ChoiceProps) {
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
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [skinType, setSkinType] = useState("");
  const router = useRouter();
  const canStart = Boolean(gender && ageGroup && skinType);

  const start = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canStart) router.push("/");
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
              {GENDERS.map((value) => (
                <Choice key={value} group="gender" value={value} selected={gender === value} onSelect={setGender}>
                  <span className={gender === value ? "font-bold" : "font-medium text-[#55585e]"}>{value}</span>
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-9">
            <legend className="mb-3 text-[16px] font-bold">나이대</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {AGE_GROUPS.map((value) => (
                <Choice
                  key={value}
                  group="age-group"
                  value={value}
                  selected={ageGroup === value}
                  onSelect={setAgeGroup}
                >
                  <span className={ageGroup === value ? "font-bold" : "font-medium text-[#55585e]"}>{value}</span>
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-9">
            <legend className="mb-3 text-[16px] font-bold">피부 타입</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {SKIN_TYPES.map(({ value, name, description }) => (
                <Choice
                  key={value}
                  group="skin-type"
                  value={value}
                  selected={skinType === value}
                  onSelect={setSkinType}
                  card
                >
                  <Image src={`/images/skin-types/${value}.svg`} alt="" width={24} height={24} />
                  <span className="font-bold">{name}</span>
                  <span className="text-[13px] leading-relaxed text-text-secondary">{description}</span>
                </Choice>
              ))}
            </div>
            <label className="relative mt-3 inline-flex cursor-pointer items-center gap-1 py-1.5 text-[14px] font-semibold text-text-secondary">
              <input
                type="radio"
                name="skin-type"
                value="unknown"
                checked={skinType === "unknown"}
                onChange={() => setSkinType("unknown")}
                className="peer sr-only"
              />
              <span className="rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-action">
                내 피부 타입을 잘 모르겠어요
              </span>
              <Icon name={skinType === "unknown" ? "check" : "chevron-right"} size={16} />
            </label>
          </fieldset>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background px-4 pt-3 pb-6">
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
