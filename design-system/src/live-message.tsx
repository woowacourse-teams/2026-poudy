"use client";

import { useEffect, useState } from "react";

/** 빈 라이브 영역이 먼저 자리 잡은 뒤 문구를 넣기까지의 시간. 같은 순간에 넣으면 낭독기가 바뀜을 놓친다. */
const ANNOUNCE_DELAY_MS = 100;

/**
 * 화면에 그려지는 순간 한 번 알릴 문구(A11Y D06). 패키지 안에서만 쓴다.
 *
 * 라이브 영역은 이미 있던 영역의 내용이 바뀔 때만 읽힌다. 문구를 품은 채 새로 그려진 영역은 읽히지 않으므로,
 * 빈 영역을 먼저 그리고 잠시 뒤 문구를 넣는다. polite 라 포커스를 옮기지 않고 하던 낭독을 끊지 않는다.
 *
 * 같은 글이 화면에도 보이면 그쪽은 aria-hidden 으로 낭독에서 빼서, 훑어 읽을 때 두 번 읽지 않게 한다.
 */
export function LiveMessage({ children }: { readonly children: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setText(children), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [children]);

  return (
    <span role="status" className="sr-only">
      {text}
    </span>
  );
}
