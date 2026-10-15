import type { ReactNode } from "react";

export function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section font-bold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}
