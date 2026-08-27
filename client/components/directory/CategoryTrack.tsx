"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useScrollEdges } from "@/lib/hooks/useScrollEdges";

type CategoryTrackItem = {
  readonly id: number;
  readonly name: string;
};

/**
 * 디자인의 가로 카테고리 선택 행.
 * 같은 대분류에 속한 소분류를 옆으로 늘어놓고 지금 보는 것만 강조한다.
 */
export function CategoryTrack({
  items,
  selectedId,
}: {
  readonly items: readonly CategoryTrackItem[];
  readonly selectedId: number;
}) {
  const { ref, edges, onScroll } = useScrollEdges("horizontal");

  /*
   * 고른 소분류가 목록 뒤쪽에 있으면 화면 밖에서 시작한다. 어디를 보고 있는지
   * 드러나도록 그것을 왼쪽 끝으로 당긴다. 오른쪽에 남은 것이 모자라면 갈 수 있는
   * 데까지만 간다. 넘치는 값은 브라우저가 알아서 자르므로 따로 죄지 않는다.
   *
   * 화면에 붙는 첫 순간에 자리를 잡아야 하므로 애니메이션 없이 옮긴다.
   * 사용자가 민 것이 아니라 처음부터 그 자리였던 것처럼 보이게 한다.
   *
   * 자리를 옮기면 어느 쪽에 더 볼 것이 남았는지도 달라지므로 흐림을 다시 읽는다.
   */
  useEffect(() => {
    const track = ref.current;
    const selected = track?.querySelector<HTMLElement>("[aria-current='page']");
    if (!track || !selected) return;

    /*
     * 목록 안쪽 여백만큼 덜어 낸다. 그러지 않으면 맨 앞 항목을 골랐을 때도
     * 여백 폭만큼 밀려 왼쪽 끝에 닿지 않는다.
     */
    const list = selected.closest("ul");
    const inset = list ? Number.parseFloat(getComputedStyle(list).paddingLeft) : 0;

    // offsetLeft 는 자리 잡은 조상 기준이라 둘의 차이로 목록 안에서의 자리를 얻는다.
    track.scrollLeft = selected.offsetLeft - track.offsetLeft - inset;
    onScroll();
  }, [selectedId, ref, onScroll]);

  if (items.length === 0) return null;

  return (
    /* 스크롤막대를 감췄으므로 더 밀 수 있다는 것을 양 끝의 흐림으로 알린다(필터 칩 줄과 같다). */
    <nav
      ref={ref}
      onScroll={onScroll}
      data-axis="horizontal"
      data-start={edges.start}
      data-end={edges.end}
      aria-label="같은 분류의 카테고리"
      className="edge-fade scrollbar-none -mx-4 overflow-x-auto"
    >
      {/* 넘칠 때 컨테이너의 오른쪽 padding 은 잘리므로 여백을 목록 안쪽에 준다. */}
      <ul className="flex w-max gap-2 px-4">
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={`/categories/${item.id}`}
                aria-current={selected ? "page" : undefined}
                className={`flex h-10 items-center rounded-xl px-3.5 text-[13px] ${
                  selected
                    ? "border border-[#F5CBD4] bg-[#FFF0F4] font-bold text-[#E83D61]"
                    : "bg-[#F2F3F5] font-semibold text-[#54575C]"
                }`}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
