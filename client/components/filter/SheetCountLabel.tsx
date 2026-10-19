import { RollingNumber } from "@/components/ui/RollingNumber";
import { formatCount } from "@/lib/domain/format";

/**
 * 필터 시트 주 버튼의 글자. 조건을 바꿀 때마다 센 개수가 바뀌면 숫자가 굴러가며 바뀐다.
 *
 * 구르는 숫자는 자리마다 0~9 를 모두 그려 두므로 보조 기술에서 감추고, 완성된 문구를 따로 읽힌다.
 * 아직 개수를 모르면 숫자 없이 '제품 보기'만 쓴다.
 *
 * 숫자와 '개'만 한 덩어리로 묶는다. 글자를 크게 키워 두 줄이 될 때 '1 / 개 제품 보기'처럼 숫자에서 갈리지 않고
 * '1개 제품 / 보기'처럼 낱말 사이에서 줄이 바뀐다.
 */
export function SheetCountLabel({ count }: { readonly count: number | undefined }) {
  if (count === undefined) return "제품 보기";

  return (
    <>
      <span className="sr-only">{formatCount(count)} 제품 보기</span>
      <span aria-hidden="true">
        <span className="inline-flex items-center whitespace-nowrap">
          <RollingNumber value={count} />개
        </span>{" "}
        제품 보기
      </span>
    </>
  );
}
