/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import { ProductRoutines } from "./ProductRoutines";

import { resetMockRoutines } from "@/mocks/routine-handlers";
import { resetMockShelf } from "@/mocks/shelf-handlers";

beforeEach(() => {
  resetMockRoutines();
  resetMockShelf();
});

it("제품을 담은 공개 루틴을 좋아요 순으로 3개까지 사진 판 카드로 보인다", async () => {
  render(<ProductRoutines productId={12} signedIn={false} />);

  expect(await screen.findByRole("heading", { name: "이 제품이 들어간 루틴" })).toBeInTheDocument();
  const cards = screen.getAllByRole("link");
  expect(cards).toHaveLength(3);
  expect(cards[0]).toHaveAttribute("href", "/routines/101");
  expect(screen.queryByText("이 루틴에 내가 써 본 제품이 있어요")).not.toBeInTheDocument();
});

it("로그인했고 파우치 제품이 겹치면 안내와 평가 배지를 둔다", async () => {
  render(<ProductRoutines productId={12} signedIn />);

  expect((await screen.findAllByText("이 루틴에 내가 써 본 제품이 있어요")).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("img", { name: "내 평가: 잘 맞았어요" }).length).toBeGreaterThan(0);
});

it("담은 루틴이 없으면 섹션째 숨긴다", async () => {
  const { container } = render(<ProductRoutines productId={999999} signedIn={false} />);

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(container).toBeEmptyDOMElement();
});
