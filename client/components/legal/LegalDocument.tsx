type LegalDocumentProps = {
  readonly title: string;
  readonly effectiveDate: string;
  readonly effectiveDateLabel?: string;
  readonly children: React.ReactNode;
};

/**
 * 처리방침과 이용약관이 함께 쓰는 문서 틀(문서 스크롤형, LAYOUT L04).
 * 본문 글자색과 크기를 이 자리에서 한 번만 정해 조문마다 되풀이하지 않는다.
 * 긴 읽기 문단이라 행간은 relaxed 다(TYPO T02). 하단 고정 영역 없이 끝나므로 끝 여백은 40 이다.
 */
export function LegalDocument({ title, effectiveDate, effectiveDateLabel = "시행일", children }: LegalDocumentProps) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-gutter pt-4 pb-10 text-body-sm leading-relaxed text-text-secondary [&_a]:underline [&_a]:underline-offset-2">
      <header className="flex flex-col gap-1">
        <h2 className="text-block font-bold text-text-primary">{title}</h2>
        <p className="text-caption">
          {effectiveDateLabel} {effectiveDate}
        </p>
      </header>

      {children}
    </main>
  );
}

type LegalArticleProps = {
  readonly heading: string;
  readonly children: React.ReactNode;
};

export function LegalArticle({ heading, children }: LegalArticleProps) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-title font-bold text-text-primary">{heading}</h3>
      {children}
    </section>
  );
}

export function LegalList({ children }: { readonly children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>;
}

type LegalRecordsProps = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

/**
 * 표로 두면 좁은 화면에서 칸이 잘려 옆으로 밀어야 읽힌다.
 * 한 줄을 한 장의 카드로 세워 첫 칸을 제목으로, 나머지를 이름과 값으로 보여 준다.
 */
export function LegalRecords({ headers, rows }: LegalRecordsProps) {
  const [title, ...labels] = headers;

  return (
    <ul className="flex flex-col gap-2" aria-label={title}>
      {rows.map((row) => (
        <li key={row[0]} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <strong className="text-body-sm font-bold text-text-primary">{row[0]}</strong>

          <dl className="flex flex-col gap-1 text-caption">
            {labels.map((label, index) => (
              <div key={label} className="flex gap-2">
                <dt className="w-17 shrink-0">{label}</dt>
                <dd className="min-w-0 flex-1">{row[index + 1]}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
