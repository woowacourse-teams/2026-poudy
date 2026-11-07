import type { CSSProperties, ReactNode } from "react";

import { pickWidestNames } from "@/lib/domain/ingredient-tile-name";

/*
 * 칸마다 가장 긴 이름을 보이지 않게 넣어, 그 이름의 낱말이 칸의 최소 폭이 되게 한다. 두 칸과 사이 간격이 줄 폭을 넘으면 칸이
 * 다음 줄로 넘어가므로 목록 전체가 1열이 된다. 판단을 브라우저에 맡겨 실제 글꼴과 글자 배율, 낱말을 나누는 규칙을 그대로 따른다.
 *
 * em 이나 ch 로 폭을 계산하지 않는 이유: 안드로이드 WebView 는 기기 글자 크기를 글꼴에만 적용해서 1em 의 길이가 그대로이고,
 * 크롬의 텍스트 자동 크기 조절은 ch 의 길이도 그대로 둔다. 칸의 최소 폭은 어느 방식에서나 실제 글자를 따른다.
 *
 * - 기본 폭 40%: 세 칸은 들어가지 않고, 두 칸은 남는 폭을 나눠 가져 똑같이 절반이 된다.
 * - 안쪽 여백(px-3): 타일의 안쪽 12 와 같다.
 * - 줄 높이 0: 칸의 높이에 더해지지 않는다. `h-0` 을 쓰면 크롬이 고정 높이로 보고 글자 크기를 적용하지 않는다.
 * - 칸 밖으로 나가는 글자는 잘라 가로 스크롤을 만들지 않고, 칸은 줄 폭을 넘지 않는다.
 */
const TILE_CELL =
  "flex max-w-full grow basis-2/5 flex-col before:invisible before:block before:overflow-hidden before:px-3 before:text-body-sm before:leading-0 before:font-semibold before:wrap-normal before:break-keep before:content-(--ingredient-tile-widest-name)";

/**
 * 성분 타일 목록(S24a 시트, S25a 화면). 이름 하나라도 2열에서 낱말 가운데가 갈라지면 목록 전체를 1열로 놓고, 아니면 2열로 놓는다.
 * 공백과 `/` 처럼 브라우저가 줄을 바꿀 수 있는 자리에서 바뀌는 것은 갈라진 것으로 보지 않는다.
 *
 * 홀수면 마지막 타일은 2열에서 왼쪽 칸만 쓴다. 옆 칸을 내용 없는 칸으로 채우고, 1열이 되면 그 칸은 높이 없이 다음 줄로 넘어간다.
 */
export function IngredientTileGrid({
  tiles,
}: {
  readonly tiles: readonly { readonly key: number; readonly koreanName: string; readonly tile: ReactNode }[];
}) {
  const widestNames = pickWidestNames(tiles.map(({ koreanName }) => koreanName))
    .join(" ")
    .replace(/\s+/g, " ");
  const style = { "--ingredient-tile-widest-name": JSON.stringify(widestNames) } as CSSProperties;
  const lastIndex = tiles.length % 2 === 1 ? tiles.length - 1 : -1;

  return (
    <ul style={style} className="flex flex-wrap gap-2">
      {tiles.map(({ key, tile }, index) =>
        index === lastIndex ? (
          <li key={key} className="flex w-full flex-wrap gap-x-2">
            <div className={TILE_CELL}>{tile}</div>
            <div className={TILE_CELL} />
          </li>
        ) : (
          <li key={key} className={TILE_CELL}>
            {tile}
          </li>
        ),
      )}
    </ul>
  );
}
