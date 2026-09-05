type LegalDocumentProps = {
  readonly title: string;
  readonly effectiveDate: string;
  /** 아직 시행되지 않은 개정이 공지 중일 때만 적는다. */
  readonly revisionEffectiveDate?: string;
  readonly children: React.ReactNode;
};

/**
 * 처리방침과 이용약관이 함께 쓰는 문서 틀.
 * 본문 글자색을 이 자리에서 한 번만 정해 조문마다 되풀이하지 않는다.
 */
/** 공지 중인 개정이 없으면 시행일만 적는다. */
const revisionNotice = (date: string | undefined): string => {
  if (!date) return "";

  return ` · ${date} 개정 시행 예정`;
};

export function LegalDocument({ title, effectiveDate, revisionEffectiveDate, children }: LegalDocumentProps) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-10 text-[13px] leading-6 [&_a]:underline [&_li]:text-text-secondary [&_p]:text-text-secondary">
      <header className="flex flex-col gap-1">
        <h2 className="text-[18px] font-bold text-text-primary">{title}</h2>
        <p className="text-[12px]">
          시행일 {effectiveDate}
          {revisionNotice(revisionEffectiveDate)}
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
      <h3 className="text-[15px] font-bold text-text-primary">{heading}</h3>
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
        <li key={row[0]} className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <strong className="text-[13px] font-bold text-text-primary">{row[0]}</strong>

          <dl className="flex flex-col gap-1 text-[12px]">
            {labels.map((label, index) => (
              <div key={label} className="flex gap-2">
                <dt className="w-[68px] shrink-0 text-text-secondary">{label}</dt>
                <dd className="flex-1 text-text-secondary">{row[index + 1]}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
