/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "./icon";
import { IconButton } from "./icon-button";

describe("IconButton compact", () => {
  it("md 는 상자를 24 로 줄이고 지름 36 원(fb-circle-compact)을 그린다", () => {
    render(<IconButton compact label="닫기" icon={<Icon name="x" size={24} />} />);
    const button = screen.getByRole("button", { name: "닫기" });

    expect(button).toHaveClass("size-6", "fb-circle-compact");
    expect(button).not.toHaveClass("fb-circle-follow-text-compact");
  });

  it("sm 은 상자를 24 로 줄이되 원은 sm 과 같은 28 로 글자를 따라 그린다", () => {
    render(<IconButton size="sm" compact label="설명" icon={<Icon name="info-circle" size={16} />} />);
    const button = screen.getByRole("button", { name: "설명" });

    expect(button).toHaveClass("size-6", "fb-circle-follow-text-compact");
    expect(button).not.toHaveClass("fb-circle-compact");
    expect(button).not.toHaveClass("fb-circle-follow-text");
  });

  it("compact 가 아닌 sm 은 그대로 글자를 따라 커지는 28 원을 그린다", () => {
    render(<IconButton size="sm" label="설명" icon={<Icon name="info-circle" size={16} />} />);
    const button = screen.getByRole("button", { name: "설명" });

    expect(button).toHaveClass("size-11", "fb-circle-follow-text");
    expect(button).not.toHaveClass("size-6");
  });
});
