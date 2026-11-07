/**
 * 주의 성분 '들어 있어요' 행의 칩 묶음 배치(S24).
 *
 * 칩이 이만큼 이상인 행은 칩 묶음을 늘 이름 아래에 행 폭으로 둔다. 이름 옆 좁은 자리에 칩을 많이 늘어놓으면
 * 여러 줄로 길게 쌓여, 아래로 내려 행 폭을 쓰는 편이 짧고 읽기 쉽다.
 */
export const STACKED_CHIP_COUNT = 4;

/**
 * 칩 묶음의 클래스. 칩이 적으면 기본 폭을 행의 절반으로 두고 최소 폭은 내용(가장 넓은 칩)에 맡긴다.
 * 이름 옆에 행 폭의 절반이 남지 않거나 가장 넓은 칩이 들어가지 않으면 묶음 전체가 이름 아래로 내려가고, 남으면 이름 옆의 남은 폭을 모두 쓴다.
 * 칩이 `STACKED_CHIP_COUNT` 개 이상이면 기본 폭을 행 폭으로 두어 늘 이름 아래로 내린다.
 * 최대 폭은 행 폭이라, 행보다 넓은 칩은 줄을 바꾸지 않고 말줄임으로 자른다(CONTENT W06).
 */
export const chipBlockClass = (chipCount: number): string =>
  chipCount >= STACKED_CHIP_COUNT
    ? "flex max-w-full basis-full flex-wrap gap-2"
    : "flex max-w-full grow basis-1/2 flex-wrap gap-2";
