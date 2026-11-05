/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";
import { keepQuoteWithParticle } from "./keep-quote";

const JOINER = "⁠";

describe("keepQuoteWithParticle", () => {
  it("닫는 따옴표와 바로 뒤의 조사를 결합자로 잇는다", () => {
    expect(keepQuoteWithParticle("‘판테롤’과 맞는 성분이 없어요")).toBe(`‘판테롤’${JOINER}과 맞는 성분이 없어요`);
  });

  it("이미 이은 문구에 다시 써도 결합자를 겹쳐 넣지 않는다", () => {
    const once = keepQuoteWithParticle("‘독도 세럼’과 맞는 제품이 없어요");
    expect(keepQuoteWithParticle(once)).toBe(once);
  });
});

describe("EmptyState", () => {
  it("문자열 제목과 설명의 닫는 따옴표를 조사와 잇는다", () => {
    render(<EmptyState title="‘독도 세럼’과 맞는 제품이 없어요" description="‘안 맞았어요’로 평가해 보세요" />);
    expect(screen.getByText(`‘독도 세럼’${JOINER}과 맞는 제품이 없어요`)).toBeInTheDocument();
    expect(screen.getByText(`‘안 맞았어요’${JOINER}로 평가해 보세요`)).toBeInTheDocument();
  });
});
