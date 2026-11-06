"use client";

import type { MarkGroupOptionResponse } from "@poudy/api/api.zod";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";

type MarkOptionsProps = {
  /** 이 시트가 고치는 그룹. */
  readonly group: MarkGroupOptionResponse;
  /** 서버가 내려준 모든 그룹. 주소의 순서를 맞추는 데 쓴다. */
  readonly groups: readonly MarkGroupOptionResponse[];
  /** 고른 마크 전체. 다른 그룹에서 고른 값도 담겨 있다. */
  readonly selected: readonly string[];
  readonly onChange: (marks: readonly string[]) => void;
};

/**
 * 마크 그룹 시트. 피부 타입 시트(명세 S23j)처럼 체크 목록 행에 이름만 둔다. 어떤 옵션을 어떤 순서로 보일지는 서버가 정한다. 고른 값을 OR 로 찾을지 AND 로 찾을지도 그룹마다 서버가 정한다.
 * 후보에 없는 선택은 UnavailableSelections 가 맡으므로 여기서는 지우지 않고 앞에 둔다.
 */
export function MarkOptions({ group, groups, selected, onChange }: MarkOptionsProps) {
  const codes = group.options.map((option) => option.code);
  const offered = groups.flatMap(({ options }) => options.map((option) => option.code));

  const change = (next: readonly string[]) => {
    const picked = new Set([...selected.filter((code) => !codes.includes(code)), ...next]);
    // 누른 차례와 상관없이 같은 선택이면 같은 주소가 되도록 서버 순서로 맞춘다.
    onChange([...selected.filter((code) => !offered.includes(code)), ...offered.filter((code) => picked.has(code))]);
  };

  return (
    <CheckboxGroup
      aria-label={group.name}
      value={selected.filter((code) => codes.includes(code))}
      onValueChange={change}
    >
      {group.options.map((option) => (
        <CheckboxGroupItem key={option.code} value={option.code}>
          {option.name}
        </CheckboxGroupItem>
      ))}
    </CheckboxGroup>
  );
}
