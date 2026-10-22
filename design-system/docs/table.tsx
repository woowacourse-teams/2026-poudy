/**
 * Storybook 문서(docs/, src/*.mdx)가 함께 쓰는 표 조각. 문서 스타일을 피하려고 MDX 에서는 <Unstyled> 안에 둔다.
 */
import type { ReactNode } from "react";

export function Code({ children }: { readonly children: ReactNode }) {
  return (
    <code className="rounded-xs bg-surface px-1 font-mono text-12 whitespace-nowrap text-text-primary">{children}</code>
  );
}

export function Table({ head, children }: { readonly head: readonly string[]; readonly children: ReactNode }) {
  return (
    <div className="overflow-x-auto font-sans">
      <table className="w-full border-collapse text-left text-13 text-text-body">
        <thead>
          <tr className="border-b border-border-strong">
            {head.map((title) => (
              <th key={title} className="px-2 py-2 text-12 font-semibold text-text-secondary">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { readonly children: ReactNode }) {
  return <tr className="border-b border-border align-middle">{children}</tr>;
}

export function Cell({ children }: { readonly children: ReactNode }) {
  return <td className="px-2 py-2">{children}</td>;
}
