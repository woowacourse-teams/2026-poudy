import type { HighlightPart } from "@/lib/domain/highlight";
import { hasMatch } from "@/lib/domain/highlight";

type MatchedTextProps = {
  /** 화면에 읽히는 온전한 글자. 토막을 이어 붙인 것과 같아야 한다. */
  readonly label: string;
  readonly parts: readonly HighlightPart[];
  /** 맞는 자리가 없을 때 통째로 두는 결. */
  readonly plainClassName: string;
  /** 맞는 자리가 있을 때 바탕이 되는 결. */
  readonly dimmedClassName: string;
  /** 맞는 자리에만 얹는 결. 굵기가 아니라 색으로 가른다. */
  readonly matchedClassName: string;
};

/**
 * 검색어와 맞는 자리를 색으로 가른다.
 *
 * 굵기로 가르지 않는다. 이름은 이미 굵게 서 있어 한 단계 더 굵혀도 눈에 잘 띄지 않고,
 * 이름 전체가 맞은 줄은 평소와 똑같아 보여 어디가 걸렸는지 알 수 없다. 색은 이름
 * 전체가 맞아도 걸렸다는 것이 드러난다.
 *
 * 자동완성과 필터 목록이 같은 규칙을 쓴다. 한쪽만 고쳐 결이 갈라지지 않도록 한자리에
 * 둔다. 색과 크기는 쓰는 자리마다 달라 밖에서 받는다.
 */
export function MatchedText({ label, parts, plainClassName, dimmedClassName, matchedClassName }: MatchedTextProps) {
  if (!hasMatch(parts)) {
    return <span className={plainClassName}>{label}</span>;
  }

  return (
    <span className={dimmedClassName}>
      {/* 낭독기와 검사 도구에는 온전한 이름 하나로 남긴다. 토막은 눈으로 보는 결에만 쓴다. */}
      <span className="sr-only">{label}</span>
      {parts.map((part, at) => (
        // 토막은 자리로만 구분된다. 같은 글자가 되풀이될 수 있어 글자를 키로 쓰지 못한다.
        <span key={at} aria-hidden="true" className={part.matched ? matchedClassName : undefined}>
          {part.text}
        </span>
      ))}
    </span>
  );
}
