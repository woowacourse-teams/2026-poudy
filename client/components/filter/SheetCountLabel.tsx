import { RollingNumber } from "@/components/ui/RollingNumber";
import { formatCount } from "@/lib/domain/format";

type SheetCountLabelProps = {
  readonly count: number | undefined;
  /** 지금 조건의 개수를 세는 중인지. 조건을 바꾼 순간부터 새 개수를 받을 때까지 숫자가 돈다. */
  readonly counting?: boolean;
};

/**
 * 필터 시트 주 버튼의 글자. 조건을 바꾸면 곧바로 숫자가 돌고, 센 개수를 받으면 그 숫자에 멈춘다.
 *
 * 구르는 숫자는 자리마다 0~9 를 모두 그려 두므로 보조 기술에서 감추고, 완성된 문구를 따로 읽힌다.
 * 세는 동안에는 이미 틀린 개수를 읽히지 않는다.
 * 개수를 모르면(첫 응답 전이나 요청 실패) 숫자 없이 '제품 보기'만 쓴다. 없는 숫자를 돌리면 실패할 때마다 글자가 바뀌어 깜빡인다.
 *
 * 숫자와 '개'를 한 덩어리로 묶는다. 글자를 크게 키워 두 줄이 될 때 '1 / 개 제품 보기'처럼 숫자에서 갈리지 않고
 * '1개 / 제품 보기'처럼 낱말 사이에서 줄이 바뀐다.
 */
export function SheetCountLabel({ count, counting = false }: SheetCountLabelProps) {
  if (count === undefined) return "제품 보기";

  return (
    <>
      <span className="sr-only">{counting ? "제품 보기" : `${formatCount(count)} 제품 보기`}</span>
      {/* 칸끼리 가운데를 맞춘다. 줄이 모자라면 '제품 보기' 칸이 통째로 다음 줄로 간다. 칸 사이 4 는 낱말 사이 띄어쓰기 폭이다. */}
      <span aria-hidden="true" className="inline-flex flex-wrap items-center justify-center gap-x-1">
        <span className="inline-flex items-center whitespace-nowrap">
          <RollingNumber value={count} spinning={counting} />개
        </span>
        <span>제품 보기</span>
      </span>
    </>
  );
}
