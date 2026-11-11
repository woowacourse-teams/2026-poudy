import styles from "./ShelfGuideScene.module.css";
export const GUIDE_DURATIONS = [4000, 3750, 3750, 3750, 3250] as const;
type Position = {
  readonly x: number;
  readonly y: number;
};
/** 06 시안의 시간표를 컴포넌트 수명에 묶는다. 재생을 바꾸거나 닫으면 예약·반복·이동 효과를 모두 끝낸다. */
export function startGuideAnimation({
  root,
  step,
  reduced,
  onComplete,
}: {
  readonly root: HTMLElement;
  readonly step: number;
  readonly reduced: boolean;
  readonly onComplete: () => void;
}): () => void {
  const timeouts = new Set<number>();
  let disposed = false;
  let repeat: number | undefined;
  const SPEED = 1.6;
  const S = 0.674;
  const SCENE_HEIGHT = 540;
  const $ = (selector: string, within: ParentNode = root): HTMLElement => {
    const element = within.querySelector<HTMLElement>(
      selector.replace(/\.([a-zA-Z][\w-]*)/g, (_, name: string) => `.${styles[name]}`),
    );
    if (!element) throw new Error(`파우치 시안 요소 누락: ${selector}`);
    return element;
  };
  const $$ = (selector: string, within: ParentNode = root): HTMLElement[] => [
    ...within.querySelectorAll<HTMLElement>(
      selector.replace(/\.([a-zA-Z][\w-]*)/g, (_, name: string) => `.${styles[name]}`),
    ),
  ];
  const schedule = (fn: () => void, delay: number): number => {
    if (disposed) return 0;
    if (reduced) {
      fn();
      return 0;
    }
    const timer = window.setTimeout(() => {
      timeouts.delete(timer);
      if (!disposed) fn();
    }, delay);
    timeouts.add(timer);
    return timer;
  };
  const at = (ms: number, fn: () => void) => schedule(fn, ms / SPEED);
  const instant = (element: HTMLElement, fn: () => void) => {
    element.classList.add(styles.nt);
    fn();
    void element.offsetWidth;
    element.classList.remove(styles.nt);
  };
  const posIn = (scr: HTMLElement, el: HTMLElement, fx = 0.5) => {
    const a = scr.getBoundingClientRect(),
      b = el.getBoundingClientRect();
    return { x: (b.left - a.left + b.width * fx) / S, y: (b.top - a.top + b.height / 2) / S };
  };
  const moveTo = (scr: HTMLElement, p: Position) => {
    const c = $(".cursor", scr);
    c.style.opacity = "1";
    c.style.left = p.x + "px";
    c.style.top = p.y + "px";
  };
  const tap = ({
    scr,
    el,
    t,
    fn,
  }: {
    readonly scr: HTMLElement;
    readonly el: HTMLElement;
    readonly t: number;
    readonly fn: () => void;
  }) => {
    at(t, () => moveTo(scr, posIn(scr, el)));
    at(t + 550, () => {
      $(".cursor", scr).classList.add(styles.tap);
      el.classList.add(styles.press);
    });
    at(t + 700, () => {
      $(".cursor", scr).classList.remove(styles.tap);
      el.classList.remove(styles.press);
      fn();
    });
  };
  const hideCursor = (scr: HTMLElement) => {
    $(".cursor", scr).style.opacity = "0";
  };
  const parkCursor = (scr: HTMLElement) => {
    const c = $(".cursor", scr);
    c.style.opacity = "0";
    c.style.left = "300px";
    c.style.top = "500px";
  };
  function resetSheet(s: HTMLElement) {
    instant(s, () => {
      $(".dim", s).classList.remove(styles.on);
      $(".rsheet", s).classList.remove(styles.on);
      $(".preview", s).classList.remove(styles.on);
      $(".fitBad", s).classList.remove(styles.bad);
      $(".pvsub", s).textContent = "지금 결과 · 안 맞은 제품 2개 기준";
      $$(".preview .n", s).forEach((n) => {
        if (n.dataset.a) n.textContent = n.dataset.a;
        n.classList.remove(styles.up);
      });
      const nw = $(".chip.new", s);
      nw.style.display = "none";
      nw.classList.remove(styles.on);
      parkCursor(s);
    });
  }
  const placePreview = (s: HTMLElement) => {
    const sheet = $(".rsheet", s),
      pv = $(".preview", s);
    pv.style.top = SCENE_HEIGHT - sheet.offsetHeight - pv.offsetHeight - 12 + "px";
  };
  const openSheet = (s: HTMLElement) => {
    $(".dim", s).classList.add(styles.on);
    $(".rsheet", s).classList.add(styles.on);
    placePreview(s);
    $(".preview", s).classList.add(styles.on);
  };
  const closeSheet = (s: HTMLElement) => {
    $(".rsheet", s).classList.remove(styles.on);
    $(".dim", s).classList.remove(styles.on);
    $(".preview", s).classList.remove(styles.on);
    hideCursor(s);
  };
  function scene1() {
    const s = root;
    resetSheet(s);
    instant(s, () => {
      $(".typed", s).textContent = "";
      $(".ph", s).style.display = "";
      $(".hint", s).style.display = "";
      $(".results", s).classList.remove(styles.on);
      const add = $(".addbtn", s);
      add.className = `${styles.obtn} ${styles.addbtn}`;
      add.textContent = "추가";
      $(".useYes", s).classList.remove(styles.yes);
      $(".toast", s).classList.remove(styles.on);
    });
    ["뉴", "트", "리", "브", " ", "로", "션"].forEach((ch, i) =>
      at(300 + i * 140, () => {
        $(".ph", s).style.display = "none";
        $(".typed", s).textContent += ch;
      }),
    );
    at(1300, () => {
      $(".hint", s).style.display = "none";
      $(".results", s).classList.add(styles.on);
    });
    tap({ scr: s, el: $(".addbtn", s), t: 1700, fn: () => openSheet(s) });
    tap({ scr: s, el: $(".useYes", s), t: 3000, fn: () => $(".useYes", s).classList.add(styles.yes) });
    tap({
      scr: s,
      el: $(".secondary", s),
      t: 4000,
      fn: () => {
        closeSheet(s);
        const add = $(".addbtn", s);
        add.className = `${styles.muted} ${styles.addbtn}`;
        add.textContent = "파우치에 있음";
        $(".toast", s).classList.add(styles.on);
      },
    });
  }
  function scene2() {
    const s = root;
    resetSheet(s);
    instant(s, () => {
      $('[data-guide-id="rate2"]').style.display = "";
      $('[data-guide-id="badge2"]').style.display = "none";
      $(".useYes", s).classList.add(styles.yes);
    });
    tap({ scr: s, el: $('[data-guide-id="rate2"]'), t: 400, fn: () => openSheet(s) });
    tap({
      scr: s,
      el: $(".fitBad", s),
      t: 1700,
      fn: () => {
        $(".fitBad", s).classList.add(styles.bad);
        const count = document.createElement("em");
        count.textContent = "3개";
        $(".pvsub", s).replaceChildren("안 맞은 제품 ", count, " 기준 · 이 제품에 든 성분이 더해져요");
        $$(".preview .n", s).forEach((n) => {
          if (n.dataset.b) {
            n.textContent = n.dataset.b;
            n.classList.add(styles.up);
          }
        });
        const nw = $(".chip.new", s);
        nw.style.display = "inline-flex";
        void nw.offsetWidth;
        nw.classList.add(styles.on);
        placePreview(s);
      },
    });
    tap({
      scr: s,
      el: $(".primary", s),
      t: 3600,
      fn: () => {
        closeSheet(s);
        $('[data-guide-id="rate2"]').style.display = "none";
        $('[data-guide-id="badge2"]').style.display = "";
      },
    });
  }
  function scene3() {
    const s = root,
      rows = $$(".ings", s),
      cardChips = $$('[data-guide-id="ac3"] .chip');
    instant(s, () => {
      rows.forEach((r) => r.classList.remove(styles.on));
      $$(".ing", s).forEach((i) => i.classList.remove(styles.hit, styles.fade));
      cardChips.forEach((c) => {
        c.classList.remove(styles.on);
        c.style.visibility = "";
      });
      $('[data-guide-id="ac3"] .empty').style.display = "";
      $$(".ghost", s).forEach((g) => g.remove());
    });
    rows.forEach((r, i) => at(400 + i * 350, () => r.classList.add(styles.on)));
    at(1900, () =>
      $$(".ing", s).forEach((i) => i.classList.add(i.classList.contains(styles.k) ? styles.hit : styles.fade)),
    );
    at(2900, () => {
      $('[data-guide-id="ac3"] .empty').style.display = "none";
      instant($('[data-guide-id="ac3"]'), () =>
        cardChips.forEach((c) => {
          c.style.visibility = "hidden";
          c.classList.add(styles.on);
        }),
      );
      const a = s.getBoundingClientRect();
      $$(".ing.k", s).forEach((src) => {
        const target = cardChips.find((c) => c.dataset.k === src.textContent);
        if (!target) return;
        const b = src.getBoundingClientRect(),
          t = target.getBoundingClientRect();
        const g = document.createElement("span");
        g.className = styles.ghost;
        g.textContent = src.textContent;
        g.style.left = (b.left - a.left) / S + "px";
        g.style.top = (b.top - a.top) / S + "px";
        s.appendChild(g);
        void g.offsetWidth;
        g.style.left = (t.left - a.left) / S + 6 + "px";
        g.style.top = (t.top - a.top) / S + 6 + "px";
      });
      instant($('[data-guide-id="ac3"]'), () => cardChips.forEach((c) => c.classList.remove(styles.on)));
    });
    at(3500, () => {
      $$(".ghost", s).forEach((g) => g.remove());
      cardChips.forEach((c, i) =>
        schedule(() => {
          c.style.visibility = "";
          c.classList.add(styles.on);
        }, i * 120),
      );
    });
  }
  function scene4() {
    const s = root,
      bad = $$(".clist .bad", s),
      n = $('[data-guide-id="n4"]');
    instant(s, () => {
      $('[data-guide-id="mf4"]').classList.remove(styles.on);
      bad.forEach((b) => b.classList.remove(styles.mark, styles.out));
      n.textContent = "299";
      parkCursor(s);
    });
    tap({
      scr: s,
      el: $('[data-guide-id="mf4"]'),
      t: 600,
      fn: () => {
        $('[data-guide-id="mf4"]').classList.add(styles.on);
        bad.forEach((b) => b.classList.add(styles.mark));
      },
    });
    at(1800, () => hideCursor(s));
    at(2300, () => {
      bad.forEach((b) => b.classList.add(styles.out));
      [270, 230, 190, 160, 152].forEach((v, i) => schedule(() => (n.textContent = String(v)), i * 70));
    });
  }

  function filterScene() {
    root.dataset.guidePhase = "choosing";
    const page = $(".filterPage");
    const action = $('[data-guide-id="add-filter"]');
    instant(root, () => {
      page.classList.remove(styles.on);
      $$(".filterRow").forEach((row) => row.classList.remove(styles.selected));
      action.textContent = "성분을 골라 주세요";
      $(".toast").classList.remove(styles.on);
      parkCursor(root);
    });
    tap({ scr: root, el: $('[data-guide-id="open-filter"]'), t: 200, fn: () => page.classList.add(styles.on) });
    [0, 1, 2].forEach((i) =>
      tap({
        scr: root,
        el: $(`[data-guide-id="filter-${i}"]`),
        t: 1000 + i * 700,
        fn: () => {
          $(`[data-guide-id="filter-${i}"]`).classList.add(styles.selected);
          action.textContent = `성분 ${i + 1}개 추가하기`;
        },
      }),
    );
    tap({
      scr: root,
      el: action,
      t: 3100,
      fn: () => {
        page.classList.remove(styles.on);
        root.dataset.guidePhase = "added";
        $(".toast").classList.add(styles.on);
        hideCursor(root);
      },
    });
  }
  const scenes = [scene1, scene2, scene3, filterScene, scene4];
  const play = () => {
    scenes[step]();
  };
  play();
  if (!reduced) {
    repeat = window.setInterval(() => {
      if (!disposed) play();
    }, GUIDE_DURATIONS[step]);
    if (step < GUIDE_DURATIONS.length - 1) schedule(onComplete, GUIDE_DURATIONS[step]);
  }
  return () => {
    disposed = true;
    timeouts.forEach(window.clearTimeout);
    timeouts.clear();
    if (repeat !== undefined) window.clearInterval(repeat);
    $$(".ghost").forEach((element) => element.remove());
  };
}
