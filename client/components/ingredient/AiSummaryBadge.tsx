import { Badge } from "@poudy/design-system/badge";

/**
 * AI 가 정리한 설명임을 알리는 배지(명세 APP · AI 요약 배지). 디자인 시스템 Badge 의 ai 변형을 그대로 쓴다.
 * 옛 시트 머리(SheetParts)가 아직 이 이름으로 부른다. 시트가 디자인 시스템으로 옮겨지면(#731) 이 파일은 지운다.
 */
export function AiSummaryBadge() {
  return <Badge variant="ai" />;
}
