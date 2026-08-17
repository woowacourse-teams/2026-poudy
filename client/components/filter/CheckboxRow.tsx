"use client";

type CheckboxRowProps = {
  readonly label: string;
  readonly detail?: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
};

/** 바텀시트 안의 선택 행. 라벨 전체가 누를 수 있는 영역이다. */
export function CheckboxRow({ label, detail, checked, onToggle }: CheckboxRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-3">
      <span className="flex flex-col">
        <span className="text-[14px] text-text-primary">{label}</span>
        {detail ? <span className="text-[12px] text-text-secondary">{detail}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="size-5 accent-[#212124]" />
    </label>
  );
}
