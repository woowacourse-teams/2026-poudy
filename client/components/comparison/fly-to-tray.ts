/*
 * 담은 제품이 어디로 갔는지 보여 주는 움직임. 제품 사진의 사본이 한 바퀴 돌며 비교함의 칸(접혔으면 알약)으로 들어간다.
 *
 * 화면을 가로지르며 한 바퀴를 도는 움직임이라 눈으로 따라갈 시간이 필요해 UI 기본 길이(280)보다 길게 둔다.
 * 사본은 fixed 로 띄우고 transform 과 opacity 만 바꾸므로 배치에 영향을 주지 않는다.
 * 움직임 줄이기에서는 날리지 않는다. 담긴 것은 칸의 사진과 버튼 모양으로 알 수 있다.
 */
const FLIGHT_MS = 450;
const LANDING_MS = 150;
/** 디자인 시스템의 --ease-in-out. 화면 위에서 옮겨 가는 움직임의 곡선이다. WAAPI 는 CSS 변수를 읽지 못해 값을 적는다. */
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
/** 디자인 시스템의 --ease-out. */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** 들어갈 자리. 펼쳐져 있으면 그 칸의 사진이고, 접혔으면 알약이다. */
const landingTargetOf = (slot: number): HTMLElement | null =>
  document.querySelector<HTMLElement>("[data-comparison-pill='shown']") ??
  document.querySelector<HTMLElement>(`[data-comparison-slot="${slot}"] img`);

export const flyToComparisonTray = (source: HTMLImageElement | null, slot: number): void => {
  const target = landingTargetOf(slot);
  if (!source || !target || reducedMotion() || typeof target.animate !== "function") return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const flying = source.cloneNode() as HTMLImageElement;
  flying.removeAttribute("loading");
  flying.alt = "";
  flying.setAttribute("aria-hidden", "true");
  Object.assign(flying.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "60",
    pointerEvents: "none",
    willChange: "transform",
  });
  document.body.append(flying);

  const x = to.left + to.width / 2 - (from.left + from.width / 2);
  const y = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = to.height / from.height;

  flying
    .animate(
      [
        { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: `translate(${x}px, ${y}px) rotate(360deg) scale(${scale})`, opacity: 1 },
      ],
      { duration: FLIGHT_MS, easing: EASE_IN_OUT },
    )
    .finished.catch(() => undefined)
    .finally(() => flying.remove());

  // 칸의 사진은 사본이 도착할 때까지 비워 두었다가 살짝 커지며 나타난다.
  if (target instanceof HTMLImageElement) {
    target.animate(
      [
        { opacity: 0, transform: "scale(0.9)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { delay: FLIGHT_MS, duration: LANDING_MS, easing: EASE_OUT, fill: "backwards" },
    );
  }
};
