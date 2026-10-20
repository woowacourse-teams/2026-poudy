import type { ReactNode } from "react";

type Props = {
  readonly label: string;
  readonly columns: readonly ReactNode[];
  readonly children: ReactNode;
};

export const CELL_CLASS = "px-4 py-3 align-top text-admin-body";

export function AdminTable({ label, columns, children }: Props) {
  return (
    <div className="overflow-x-auto rounded-admin-xl border border-admin-border bg-admin-elevated">
      <table aria-label={label} className="w-full border-collapse text-left">
        <thead className="border-b border-admin-border bg-admin-surface">
          <tr>
            {columns.map((column, index) => (
              <th
                key={typeof column === "string" ? column : index}
                scope="col"
                className="px-4 py-3 text-admin-caption font-bold whitespace-nowrap text-admin-text-secondary"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border">{children}</tbody>
      </table>
    </div>
  );
}
