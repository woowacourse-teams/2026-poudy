/** 탈퇴하면 지워지고, 되살리면 돌아오는 정보(S55f · S55g). 개수 없이 종류로만 보여 준다. */
export const ACCOUNT_DATA_ITEMS = [
  "선반에 올린 제품과 평가",
  "위시리스트에 추가한 제품",
  "성별 · 나이대 · 피부 타입 정보",
] as const;

/** 회색 칸(여백 16)에 머리 한 줄(13/600)과 점 목록을 둔다. 머리와 목록 사이는 12, 항목 사이는 8, 항목 글은 14/1.5 다. */
export function AccountDataSummary({ title }: { readonly title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <p className="text-body-sm leading-snug font-semibold text-text-secondary">{title}</p>
      <ul className="flex flex-col gap-2">
        {ACCOUNT_DATA_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-2 text-body text-text-primary">
            <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-text-secondary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
