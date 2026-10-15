"use client";

import { useEffect, useRef, useState } from "react";

import { RollingDigit } from "@/components/ui/RollingDigit";

/** 숫자 줄이 이만큼 보여야 굴린다. 화면 끝에 살짝 걸친 채로 굴러 버리면 아무도 보지 못한다. */
const VISIBLE_RATIO = 0.6;

/**
 * 자리마다 구르기 시작하는 간격(ms). 왼쪽 자리부터 차례로 굴러 숫자가 한꺼번에 바뀌지 않고
 * 읽히는 순서대로 맞춰진다.
 */
const STAGGER = 60;

/**
 * 보이자마자 구르면 다이얼이 아직 전환을 켜지 않아(`RollingDigit` 은 붙은 다음 프레임에 켠다)
 * 숫자가 한 번에 바뀐다. 전환이 켜질 틈을 둔다.
 */
const START_DELAY = 120;

/**
 * 서비스 소개(S56) '파우디는 지금' 의 숫자. 숫자 줄이 화면에 들어오면 0 에서 실제 값까지
 * 다이얼처럼 굴러간다.
 *
 * 처음에는 같은 자릿수의 0 으로 그린다. 같은 자릿수에서 출발해야 자리마다 제 숫자로 굴러간다.
 * 서버가 실제 값을 그리고 나중에 0 으로 돌리면, 스크립트가 늦게 도는 회선에서 실제 값이 보이다가
 * 0 으로 떨어진 뒤 다시 굴러간다.
 *
 * 구르는 동안에는 자리마다 0-9 가 모두 DOM 에 있으므로 낭독기에서 감추고 완성된 숫자를 따로 전한다.
 * 검색 엔진도 이 글자로 실제 값을 읽는다. 움직임을 줄인 환경에서는 `RollingDigit` 이 전환을 끄므로
 * 보이는 순간 실제 값으로 바뀐다.
 */
export function StatDial({ value }: { readonly value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [revealed, setRevealed] = useState(false);
  const formatted = value.toLocaleString("ko-KR");
  const characters = formatted.split("");

  useEffect(() => {
    const element = ref.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      timer = setTimeout(() => setRevealed(true), START_DELAY);
    };

    // 보이는지 알 길이 없으면 기다리지 않고 바로 맞춘다.
    if (!element || typeof IntersectionObserver === "undefined") {
      reveal();
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        reveal();
      },
      { threshold: VISIBLE_RATIO },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="inline-flex items-center">
        {characters.map((character, index) => {
          // 오른쪽에서 센 자리. 앞자리가 늘어도 일의 자리는 같은 칸에 남는다.
          const place = characters.length - index;
          if (character === ",") return <span key={`comma-${place}`}>{character}</span>;

          // 쉼표는 세지 않는다. 자리 사이에 쉼표가 있어도 같은 간격으로 이어 구른다.
          const delay = characters.slice(0, index).filter((previous) => previous !== ",").length * STAGGER;
          return (
            <RollingDigit key={`digit-${place}`} digit={revealed ? Number(character) : 0} place={place} delay={delay} />
          );
        })}
      </span>
      <span className="sr-only">{formatted}</span>
    </>
  );
}
