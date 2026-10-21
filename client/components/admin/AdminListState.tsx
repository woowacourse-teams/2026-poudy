type Props = {
  readonly colSpan?: number;
  readonly failed: boolean;
  readonly loading: boolean;
  readonly empty: boolean;
  readonly emptyMessage: string;
};

const MESSAGE_CLASS = "py-16 text-center text-admin-body text-admin-text-secondary";

export function AdminListState({ colSpan, failed, loading, empty, emptyMessage }: Props) {
  const message = failed
    ? "불러오지 못했어요. 잠시 후 다시 시도해 주세요."
    : loading
      ? "불러오는 중이에요"
      : empty
        ? emptyMessage
        : null;
  if (!message) return null;
  const messageElement = (
    <p role={failed ? "alert" : loading ? "status" : undefined} className={MESSAGE_CLASS}>
      {message}
    </p>
  );
  return colSpan ? (
    <tr>
      <td colSpan={colSpan}>{messageElement}</td>
    </tr>
  ) : (
    messageElement
  );
}
