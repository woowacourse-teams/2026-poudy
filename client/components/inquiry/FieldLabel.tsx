/**
 * 입력 항목의 이름. 필수 항목에만 별표를 붙인다.
 * 선택 항목에는 아무 표시도 두지 않으며, 별표가 없다는 사실이 선택이라는 뜻이다.
 */
export function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  readonly htmlFor: string;
  readonly children: React.ReactNode;
  readonly required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-0.5 text-[13px] font-semibold text-text-primary">
      {children}
      {/* 별표는 옆 글자와 함께 읽히므로 낭독기에는 필수라는 말로 전한다. */}
      {required ? (
        <>
          <span aria-hidden="true" className="text-brand">
            *
          </span>
          <span className="sr-only">필수</span>
        </>
      ) : null}
    </label>
  );
}
