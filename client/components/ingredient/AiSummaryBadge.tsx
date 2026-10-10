import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons/Icon";

/** AI 가 정리한 설명임을 알리는 배지. 성분 설명과 성분군 설명이 함께 쓴다. */
export function AiSummaryBadge() {
  return (
    <Badge variant="ai" icon={<Icon name="sparkles" size={12} filled scalable className="shrink-0 text-[#635BFF]" />}>
      AI 요약
    </Badge>
  );
}
