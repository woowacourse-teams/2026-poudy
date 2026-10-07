import { Icon } from "@/components/ui/icons/Icon";

/** AI 가 정리한 설명임을 알리는 배지. 성분 설명과 성분군 설명이 함께 쓴다. */
export function AiSummaryBadge() {
  return (
    <span className="flex h-6 shrink-0 items-center gap-1 rounded-xl bg-[#EEEBFF] px-2">
      <Icon name="sparkles" size={12} filled className="text-[#635BFF]" />
      <span className="text-[12px] font-semibold text-[#4A3B8C]">AI 요약</span>
    </span>
  );
}
