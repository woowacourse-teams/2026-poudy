/**
 * 입력 칸 아래 한 줄. 잘못이 있으면 잘못을, 없으면 설명을 보여 준다.
 *
 * 둘 중 무엇이 오든 자리를 미리 잡아 둔다. 잘못이 생길 때마다 아래 내용이
 * 밀려 내려가면 누르려던 것이 움직인다.
 */
export function FieldMessage({
  error,
  hint,
  id,
}: {
  readonly error?: string;
  readonly hint?: string;
  readonly id?: string;
}) {
  return (
    <p
      id={id}
      /* 잘못은 곧바로 읽어 주고, 설명은 읽던 흐름을 끊지 않는다. */
      role={error ? "alert" : undefined}
      className={`min-h-4 text-[12px] leading-4 ${error ? "text-brand" : "text-text-secondary"}`}
    >
      {error ?? hint ?? ""}
    </p>
  );
}
