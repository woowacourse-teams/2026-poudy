import { describe, expect, it } from "vitest";

import { imageDeliveryUrl } from "./image-delivery-url";

const source = "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/1.webp";
const cdn = "https://d2rcowg6kz7uw3.cloudfront.net";

describe("imageDeliveryUrl", () => {
  it("routes Poudy image objects through the configured CDN and preserves the path and query", () => {
    expect(imageDeliveryUrl(`${source}?v=2`, cdn)).toBe(`${cdn}/poudy/images/products/1.webp?v=2`);
  });

  it("leaves images unchanged when no CDN is configured", () => {
    expect(imageDeliveryUrl(source, "")).toBe(source);
  });

  it("leaves non-Poudy hosts and paths unchanged", () => {
    expect(imageDeliveryUrl("https://other.example/poudy/images/1.webp", cdn)).toBe(
      "https://other.example/poudy/images/1.webp",
    );
    const unrelatedPath = source.replace("/poudy/images/", "/poudy/user/");
    expect(imageDeliveryUrl(unrelatedPath, cdn)).toBe(unrelatedPath);
    expect(imageDeliveryUrl("/images/products/placeholder.png", cdn)).toBe("/images/products/placeholder.png");
  });
});
