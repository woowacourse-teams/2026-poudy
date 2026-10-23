"use client";

import { useEffect } from "react";

/** 칸이 화면 아래에서 이만큼 올라와야 떠오른다. 끝에 걸치자마자 움직이면 다 보기도 전에 끝난다. */
const ROOT_MARGIN = "0px 0px -10% 0px";
const VISIBLE_EDGE = 0.9;

/**
 * 서비스 소개(S56)의 스크롤 등장. `data-about-reveal` 이 붙은 칸이 화면에 들어오면 `data-revealed` 를 붙인다.
 * 움직임은 globals.css 가 맡고, 여기서는 언제 보였는지만 알린다.
 *
 * 숨기는 일도 여기서 시작한다(`data-about-reveal-ready`). CSS 만으로 처음부터 숨기면 스크립트가 늦게 도는 동안
 * 아래 섹션이 비어 보인다. 시작할 때 이미 화면 안이나 위에 있던 칸은 움직이지 않고 그대로 둔다. 보던 내용이
 * 사라졌다가 다시 떠오르면 어지럽다.
 *
 * 칸마다 관찰자를 따로 두지 않고 하나로 모두 본다. 한 번 보인 칸은 관찰을 끊어, 지나갔다 돌아와도 다시 움직이지 않는다.
 * 보이는지 알 수 없는 환경에서는 숨기지 않는다.
 */
export function AboutReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const root = document.documentElement;
    const targets = [...document.querySelectorAll<HTMLElement>("[data-about-reveal]:not([data-revealed])")];
    const pending = targets.filter((target) => {
      const shown = target.getBoundingClientRect().top < window.innerHeight * VISIBLE_EDGE;
      if (shown) target.setAttribute("data-revealed", "");
      return !shown;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const target of pending) observer.observe(target);
    root.setAttribute("data-about-reveal-ready", "");

    return () => {
      observer.disconnect();
      // 다른 화면으로 가면 숨김 규칙을 걷는다. 문서 뿌리에 남으면 같은 속성을 쓰는 칸이 생겼을 때 숨겨진다.
      root.removeAttribute("data-about-reveal-ready");
    };
  }, []);

  return null;
}
