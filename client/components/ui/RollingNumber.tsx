"use client";

import { RollingDigit } from "./RollingDigit";

/**
 * 숫자가 바뀔 때 자리마다 다이얼이 굴러가듯 바뀐다.
 *
 * 자리마다 0-9 를 세로로 세워 두고 필요한 만큼 밀어 올린다. 자릿수가 바뀌어도
 * 각 자리가 제 숫자로 굴러가므로 값 사이를 이어 그리지 않아도 된다.
 *
 * 구르는 동안에는 열 개의 숫자가 모두 DOM 에 있다. 그대로 읽히면 뜻이 되지 않으므로
 * 쓰는 쪽에서 `aria-hidden` 으로 감추고 완성된 문구를 따로 전한다.
 */
export function RollingNumber({ value }: { readonly value: number }) {
  const characters = value.toLocaleString("ko-KR").split("");

  return (
    <span className="inline-flex items-center">
      {characters.map((character, index) => {
        // 오른쪽에서 센 자리. 앞자리가 늘어도 일의 자리는 같은 칸에 남는다.
        const place = characters.length - index;

        return character === "," ? (
          // 쉼표는 굴리지 않는다. 자리 이동이 아니라 자릿수 표기라 함께 구르면 어지럽다.
          <span key={`comma-${place}`}>{character}</span>
        ) : (
          <RollingDigit key={`digit-${place}`} digit={Number(character)} place={place} />
        );
      })}
    </span>
  );
}
