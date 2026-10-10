type Props = {
  readonly failed: boolean;
  readonly loading: boolean;
  readonly empty: boolean;
  readonly emptyMessage: string;
};

const MESSAGE_CLASS = "rounded-xl border border-border bg-background py-16 text-center text-[14px] text-text-secondary";

export function AdminListState({ failed, loading, empty, emptyMessage }: Props) {
  if (failed) {
    return (
      <p role="alert" className={MESSAGE_CLASS}>
        불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }
  if (loading) {
    return (
      <p role="status" className={MESSAGE_CLASS}>
        불러오는 중이에요
      </p>
    );
  }
  if (empty) {
    return <p className={MESSAGE_CLASS}>{emptyMessage}</p>;
  }
  return null;
}
