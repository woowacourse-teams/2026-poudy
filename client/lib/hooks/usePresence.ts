"use client";

import { useEffect, useState } from "react";

/**
 * 닫으라는 말을 듣고도 나가는 전환이 끝날 때까지 남아 있게 한다.
 *
 * `open` 이 false 가 되자마자 지우면 내려가는 모습을 그릴 틈이 없다. 그래서 자리에
 * 남는 것(`present`)과 열려 보이는 것(`shown`)을 나눈다. 열 때는 붙자마자 올리지 않고
 * 한 프레임 뒤에 올린다. 시작점 없이 끝나 버리면 전환이 그려지지 않는다.
 *
 * 지우는 시점은 쓰는 쪽이 정한다. 전환이 끝났다는 신호를 받아 `done` 을 부르면 된다.
 */
export const usePresence = (open: boolean) => {
  const [present, setPresent] = useState(open);
  const [shown, setShown] = useState(false);

  // 렌더 중에 맞춰 두면 effect 가 한 번 더 그리지 않는다.
  if (open && !present) setPresent(true);
  if (!open && shown) setShown(false);

  useEffect(() => {
    if (!present || !open || shown) return;

    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [present, open, shown]);

  return {
    present,
    shown,
    /** 나가는 전환이 끝났을 때 부른다. */
    done: () => setPresent(false),
  };
};
