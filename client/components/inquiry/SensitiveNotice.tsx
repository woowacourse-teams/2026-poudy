import { Icon } from "@/components/ui/icons/Icon";

/** 자유 입력을 받는 화면에 공통으로 둔다. */
export function SensitiveNotice() {
  return (
    <section className="flex gap-3 rounded-xl bg-surface-subtle p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft">
        <Icon name="info" size={16} className="text-brand" />
      </span>

      <span className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-text-primary">입력 전 확인해주세요</span>
        <span className="text-[12px] text-text-secondary">
          개인정보나 비밀번호처럼 민감한 정보는 입력하거나 첨부하지 마세요.
        </span>
      </span>
    </section>
  );
}
