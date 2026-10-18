"use client";

import { Skeleton } from "@poudy/design-system/skeleton";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";

/* 행 이름 자리의 폭. 실제 이름처럼 길이를 섞는다. Tailwind 가 클래스를 찾도록 요소마다 통째로 적는다. */
const NAMES = [
  <Skeleton key="0" shape="line" size={15} className="w-24" />,
  <Skeleton key="1" shape="line" size={15} className="w-16" />,
  <Skeleton key="2" shape="line" size={15} className="w-28" />,
  <Skeleton key="3" shape="line" size={15} className="w-20" />,
  <Skeleton key="4" shape="line" size={15} className="w-16" />,
];

/**
 * 디렉터리 두 단이 올 자리(FEEDBACK F02). 300ms 안에 오면 아무것도 보이지 않고, 그 뒤에는 회색 레일과 행 자리를 그린다.
 * 레일 칸은 회색 레일과 같은 면이라 자리를 따로 그리지 않는다.
 */
export function DirectorySkeleton() {
  const shown = useDelayedFlag(true);

  return (
    <div aria-busy="true" className="directory-rail-width flex min-h-80 grow basis-0 text-body">
      {shown ? (
        <>
          <div className="w-(--directory-rail) shrink-0 bg-surface" />
          <ul className="flex min-w-0 grow flex-col pt-1">
            {NAMES.map((name) => (
              <li
                key={name.key}
                className="flex h-13 items-center justify-between gap-2 border-b border-border pr-4 pl-5"
              >
                {name}
                <Skeleton shape="line" size={13} className="w-10" />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
