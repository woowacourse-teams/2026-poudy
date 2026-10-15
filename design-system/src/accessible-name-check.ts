declare const process: { readonly env: { readonly NODE_ENV?: string } };

/**
 * 개발 환경인지. Next 와 Vite 는 빌드할 때 process.env.NODE_ENV 를 문자열로 바꿔 넣는다. 운영 빌드에서는 false 가 되어
 * 아래 검사가 돌지 않는다. 값을 바꿔 넣지 않는 환경(process 가 없는 곳)도 검사하지 않는다.
 */
const isDevelopment = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

/** 요소의 접근 가능한 이름을 어림한다. aria-label, aria-labelledby, aria-hidden 이 아닌 글자 순으로 본다. */
const accessibleName = (element: Element): string => {
  const label = element.getAttribute("aria-label")?.trim();
  if (label) return label;
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  const visibleText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node instanceof Element && node.getAttribute("aria-hidden") === "true") return "";
    return [...node.childNodes].map(visibleText).join("");
  };
  return visibleText(element).trim();
};

/**
 * 개발 환경에서 이름 없는 컨트롤을 알린다. 이름이 client 가 넘긴 요소의 글자에서 와서 타입으로 막을 수 없는 부품이 쓴다.
 */
export const warnIfNameless = (element: Element | null, part: string) => {
  if (!isDevelopment || !element || accessibleName(element)) return;
  console.warn(
    `[@poudy/design-system] ${part} 에 이름이 없다. 낭독기가 무엇인지 알리지 못한다. 버튼에 글자를 넣거나 aria-label 을 준다.`,
    element,
  );
};
