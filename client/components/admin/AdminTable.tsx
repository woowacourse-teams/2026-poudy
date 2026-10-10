import type { ReactNode } from "react";

type Props = {
  readonly label: string;
  readonly columns: readonly string[];
  readonly children: ReactNode;
};

export const CELL_CLASS = "px-4 py-3 align-top text-[14px]";

export function AdminTable({ label, columns, children }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table aria-label={label} className="w-full border-collapse text-left">
        <thead className="border-b border-border bg-surface-subtle">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-4 py-3 text-[13px] font-bold whitespace-nowrap text-text-secondary"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">{children}</tbody>
      </table>
    </div>
  );
}
