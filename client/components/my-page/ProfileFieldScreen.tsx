"use client";

import type { MemberProfileRequest, MemberResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/ui/TopBar";
import { findMe, isAdminSession, isSignedOut, updateMyProfile } from "@/lib/api/member";
import { AGE_RANGES, GENDERS, type ProfileOption, SKIN_TYPES, type SkinTypeOption } from "@/lib/domain/member-profile";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export type ProfileField = keyof MemberProfileRequest;

const TITLES: Readonly<Record<ProfileField, string>> = { gender: "성별", ageRange: "나이대", skinType: "피부 타입" };

const OPTIONS: Readonly<Record<ProfileField, readonly ProfileOption<string>[]>> = {
  gender: GENDERS,
  ageRange: AGE_RANGES,
  skinType: SKIN_TYPES,
};

const isSkinTypeOption = (option: ProfileOption<string>): option is SkinTypeOption => "icon" in option;

function OptionContent({ option }: { readonly option: ProfileOption<string> }) {
  if (!isSkinTypeOption(option)) return <span className="flex-1 text-[15px]">{option.label}</span>;

  return (
    <>
      <Image src={`/images/skin-types/${option.icon}.svg`} alt="" width={24} height={24} />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{option.label}</span>
        <span className="text-[13px] text-text-secondary">{option.description}</span>
      </span>
    </>
  );
}

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

const valueIn = <T extends string>(options: readonly ProfileOption<T>[], value: string | null): T | null =>
  options.find((option) => option.value === value)?.value ?? null;

const profileWith = (member: MemberResponse, field: ProfileField, value: string | null): MemberProfileRequest => {
  const profile = { gender: member.gender, ageRange: member.ageRange, skinType: member.skinType };
  if (field === "gender") return { ...profile, gender: valueIn(GENDERS, value) };
  if (field === "ageRange") return { ...profile, ageRange: valueIn(AGE_RANGES, value) };
  return { ...profile, skinType: valueIn(SKIN_TYPES, value) };
};

const radioMarkClass = (checked: boolean): string => {
  if (checked) return "border-action";
  return "border-[#c9cdd2]";
};

export function ProfileFieldScreen({ field }: { readonly field: ProfileField }) {
  const router = useRouter();
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [adminSession, setAdminSession] = useState(false);

  const leaveSignedOut = (error: unknown): boolean => {
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

  useEffect(() => {
    findMe()
      .then((loaded) => {
        setMember(loaded);
        setSelected(loaded[field]);
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          rememberLoginReturn();
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) setAdminSession(true);
      });
  }, [field, router]);

  const save = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member || saving) return;

    setSaving(true);
    setFailed(false);
    updateMyProfile(profileWith(member, field, selected))
      .then(() => {
        if (hasInSiteHistory()) {
          router.back();
          return;
        }
        router.replace("/my-page");
      })
      .catch((error: unknown) => {
        if (leaveSignedOut(error)) return;
        setFailed(true);
        setSaving(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center" />
    );
  }

  const title = TITLES[field];

  return (
    <>
      <TopBar title={title} variant="sub" />
      <form onSubmit={save} className="flex flex-1 flex-col">
        <fieldset className="flex flex-1 flex-col gap-2.5 px-4 pt-4 pb-10">
          <legend className="sr-only">{title}</legend>
          {OPTIONS[field].map((option) => (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                name={field}
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
                disabled={!member}
                className="peer sr-only"
              />
              <span className="flex min-h-13 items-center gap-3 rounded-xl border border-[#d3d6dc] bg-background px-4 py-3 peer-checked:border-action peer-checked:ring-1 peer-checked:ring-action peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-action">
                <OptionContent option={option} />
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${radioMarkClass(
                    selected === option.value,
                  )}`}
                >
                  {selected === option.value && <span className="size-2.5 rounded-full bg-action" />}
                </span>
              </span>
            </label>
          ))}
          {field === "skinType" && (
            <p className="py-1.5 text-[14px] font-semibold text-text-secondary">내 피부 타입을 잘 모르겠어요</p>
          )}
        </fieldset>

        <div className="sticky bottom-0 border-t border-border bg-background px-4 pt-3 pb-6">
          {failed && (
            <p role="alert" className="mb-3 text-center text-[14px] text-text-secondary">
              {SAVE_FAILED}
            </p>
          )}
          <Button type="submit" disabled={!member || saving}>
            저장
          </Button>
        </div>
      </form>
    </>
  );
}
