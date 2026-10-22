import { cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode, Ref } from "react";

import { cn } from "./cn";

type AnyProps = Record<string, unknown>;

const isHandler = (key: string, value: unknown) => /^on[A-Z]/.test(key) && typeof value === "function";

const composeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };

/**
 * asChild 를 받는 부품이 안에서 쓴다. 넘겨받은 요소(예: client 의 Link) 하나에 부품이 정한 속성을 합쳐 그린다.
 *
 * - 클래스는 cn 으로 합친다. 부품의 클래스가 먼저, 요소의 클래스가 뒤다.
 * - 이벤트 처리기는 둘 다 부른다. 요소의 처리기가 먼저 돈다. 요소가 기본 동작을 막으면 부품은 그 뜻을 따를 수 있다.
 * - 그 밖의 속성은 부품의 값이 이긴다. 역할(role)과 상태(aria-*)는 부품이 책임진다.
 * - ref 는 둘 다 받는다.
 */
export function Slot({ children, ...slotProps }: AnyProps & { readonly children: ReactNode }) {
  if (!isValidElement(children)) throw new Error("asChild 에는 요소 하나를 넘긴다.");
  const child = children as ReactElement<AnyProps>;
  const childProps = child.props;
  const merged: AnyProps = { ...childProps, ...slotProps };

  for (const [key, value] of Object.entries(slotProps)) {
    const own = childProps[key];
    if (isHandler(key, value) && typeof own === "function") {
      merged[key] = (...args: unknown[]) => {
        (own as (...a: unknown[]) => void)(...args);
        (value as (...a: unknown[]) => void)(...args);
      };
    }
  }
  merged.className = cn(slotProps.className as string | undefined, childProps.className as string | undefined);
  if (slotProps.ref || childProps.ref) {
    merged.ref = composeRefs(slotProps.ref as Ref<unknown>, childProps.ref as Ref<unknown>);
  }

  return cloneElement(child, merged);
}
