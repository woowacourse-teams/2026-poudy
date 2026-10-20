import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * 안에 있는 누를 수 있는 자리(.pressable)를 hover 나 눌림 상태로 고정해 보여 준다. 견본에서만 쓴다.
 *
 * 이 상태는 CSS :hover · :active 가 아니라 usePressable 이 붙이는 data-hovered · data-pressed 로 칠한다(STATE S05·S11).
 * 그래서 Storybook 의 의사 상태 도구로는 칠할 수 없어, 같은 속성을 직접 붙인다. 부품이 다시 그려지며 속성을 떼면
 * 곧바로 다시 붙인다. 막힌 버튼(disabled · aria-disabled)은 CSS 가 상태를 칠하지 않으므로 그대로 보인다.
 */
export function ForceState({
  state,
  children,
}: {
  readonly state: "hovered" | "pressed";
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const attribute = `data-${state}`;
    const apply = () => {
      for (const element of root.querySelectorAll(".pressable")) {
        if (!element.hasAttribute(attribute)) element.setAttribute(attribute, "");
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: [attribute] });
    return () => observer.disconnect();
  }, [state]);

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
