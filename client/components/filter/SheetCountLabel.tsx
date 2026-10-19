import { RollingNumber } from "@/components/ui/RollingNumber";
import { formatCount } from "@/lib/domain/format";

/**
 * 필터 시트 주 버튼의 글자. 조건을 바꿀 때마다 센 개수가 바뀌면 숫자가 굴러가며 바뀐다.
 *
 * 구르는 숫자는 자리마다 0~9 를 모두 그려 두므로 보조 기술에서 감추고, 완성된 문구를 따로 읽힌다.
 * 아직 개수를 모르면 숫자 없이 '제품 보기'만 쓴다.
 */
export function SheetCountLabel({ count }: { readonly count: number | undefined }) {
  if (count === undefined) return "제품 보기";

  return (
    <>
      <span className="sr-only">{formatCount(count)} 제품 보기</span>
      <span aria-hidden="true" className="inline-flex items-center">
        <RollingNumber value={count} />개 제품 보기
      </span>
    </>
  );
}
