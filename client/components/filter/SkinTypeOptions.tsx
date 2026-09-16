"use client";

import type { SkinTypeResponse } from "@poudy/api/api.zod";

import { type SkinType } from "@/lib/domain/filter";

type SkinTypeOptionsProps = {
  readonly selected: SkinType | undefined;
  readonly onSelect: (skinType: SkinType) => void;
  /** 지금 조건에 걸린 제품이 드는 피부 타입. 고를 수 없는 것은 오지 않는다. */
  readonly skinTypes: readonly SkinTypeResponse[];
};

/**
 * 피부 타입 시트.
 *
 * 서버가 한 번에 하나만 받으므로 새로 고르면 앞의 것이 풀린다. 여럿을 함께 고를 수 없는
 * 자리라 네모가 아니라 동그라미로 그린다. 고른 것을 무르는 일은 시트 아래의 초기화가 맡는다.
 */
export function SkinTypeOptions({ selected, onSelect, skinTypes }: SkinTypeOptionsProps) {
  return (
    /* 한 무리에서 하나만 고르는 자리임을 낭독기에도 알린다. */
    <ul role="radiogroup" aria-label="피부 타입" className="pt-1">
      {skinTypes.map(({ code, name }) => {
        const skinType = code as SkinType;
        const checked = selected === skinType;

        return (
          <li key={skinType}>
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onSelect(skinType)}
              className="flex h-12 w-full items-center justify-between border-b border-border px-3 text-[15px] font-medium text-[#212124]"
            >
              {name}
              {/*
                고른 자리를 동그라미 안의 점으로 알린다. 네모 표시는 여럿을 고르는 자리에
                쓰고 있어, 하나만 고르는 여기와 모양으로 갈라 둔다.
              */}
              <span
                className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-control-state ease-out motion-reduce:transition-none ${
                  checked ? "border-[#212124]" : "border-[#B9BDC5]"
                }`}
              >
                <span
                  className={`size-2.5 rounded-full transition-colors duration-control-state ease-out motion-reduce:transition-none ${
                    checked ? "bg-[#212124]" : "bg-transparent"
                  }`}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
