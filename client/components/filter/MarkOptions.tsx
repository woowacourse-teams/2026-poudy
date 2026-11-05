"use client";

import type { MarkGroupOptionResponse } from "@poudy/api/api.zod";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { useId } from "react";

import { formatCount } from "@/lib/domain/format";

type MarkOptionsProps = {
  /** 서버가 내려준 후보. 어떤 그룹과 옵션을 어떤 순서로 보일지는 서버가 정한다. */
  readonly groups: readonly MarkGroupOptionResponse[];
  readonly selected: readonly string[];
  readonly onChange: (marks: readonly string[]) => void;
};

/**
 * 제품 특성 시트. 서버의 마크 그룹마다 체크 목록을 둔다. 같은 그룹은 OR, 그룹 사이는 AND 로 서버가 찾는다.
 * 후보에 없는 선택은 UnavailableSelections 가 맡으므로 여기서는 지우지 않고 앞에 둔다.
 */
export function MarkOptions({ groups, selected, onChange }: MarkOptionsProps) {
  const offered = groups.flatMap((group) => group.options.map((option) => option.code));

  if (groups.length === 0) {
    return (
      <p role="status" className="py-8 text-center text-body-sm text-text-secondary">
        지금 조건에서 고를 수 있는 제품 특성이 없어요.
      </p>
    );
  }

  const change = (group: MarkGroupOptionResponse, next: readonly string[]) => {
    const codes = group.options.map((option) => option.code);
    const kept = selected.filter((code) => !codes.includes(code));
    const picked = new Set([...kept, ...next]);
    // 누른 차례와 상관없이 같은 선택이면 같은 주소가 되도록 서버 순서로 맞춘다.
    onChange([...selected.filter((code) => !offered.includes(code)), ...offered.filter((code) => picked.has(code))]);
  };

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <MarkGroup key={group.code} group={group} selected={selected} onChange={(next) => change(group, next)} />
      ))}
    </div>
  );
}

function MarkGroup({
  group,
  selected,
  onChange,
}: {
  readonly group: MarkGroupOptionResponse;
  readonly selected: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
}) {
  const headingId = useId();

  return (
    <section className="flex flex-col gap-1">
      <h3 id={headingId} className="flex min-h-8 items-center text-body-sm font-semibold text-text-primary">
        {group.name}
      </h3>
      <CheckboxGroup
        aria-labelledby={headingId}
        value={selected.filter((code) => group.options.some((option) => option.code === code))}
        onValueChange={onChange}
      >
        {group.options.map((option) => (
          <CheckboxGroupItem key={option.code} value={option.code} description={formatCount(option.productCount)}>
            {option.name}
          </CheckboxGroupItem>
        ))}
      </CheckboxGroup>
    </section>
  );
}
