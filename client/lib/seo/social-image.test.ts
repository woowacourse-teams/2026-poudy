import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const nextOg = vi.hoisted(() => ({
  ImageResponse: vi.fn(function ImageResponse(element: unknown, options: unknown) {
    void element;
    void options;
    return new Response();
  }),
}));

vi.mock("next/og", () => ({ ImageResponse: nextOg.ImageResponse }));

/*
 * 그림과 글꼴은 배포된 주소에서 받아 온다. 테스트에서는 실제로 받지 않고 빈 값을 준다.
 * 무엇을 그렸는지만 보므로 알맹이는 필요하지 않다.
 */
vi.stubGlobal(
  "fetch",
  vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 })),
);

import { socialImage, socialImageLogoSrc } from "@/lib/seo/social-image";

describe("공유 이미지 레이아웃", () => {
  it("하단에 제목과 서비스 로고를 양끝 정렬한다", async () => {
    await socialImage({
      title: "판테놀",
      logoSrc: await socialImageLogoSrc(),
    });

    expect(nextOg.ImageResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fonts: [expect.objectContaining({ name: "Noto Sans KR", weight: 900 })],
      }),
    );

    const element = nextOg.ImageResponse.mock.calls[0]?.[0];
    if (!isValidElement(element)) throw new TypeError("공유 이미지 루트는 React 요소여야 합니다.");

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain("justify-content:space-between");
    expect(markup).toContain("align-items:flex-end");
    expect(markup).toContain("padding:64px");
    expect(markup).toContain("box-sizing:border-box");
    expect(markup).toContain("text-align:left");
    expect(markup).toContain("font-family:Noto Sans KR");
    expect(markup).not.toContain("font-family:Fredoka");
    expect(markup).toContain("font-size:80px");
    expect(markup).toContain("font-weight:900");
    expect(markup).toContain("background-color:#fffdfd");
    expect(markup).toContain('width="1200" height="630"');
    expect(markup).toContain('width="221" height="74"');
    expect(markup).toContain("color:#202124");
  });

  it("요청한 캐시 정책을 이미지 응답 헤더에 넣는다", async () => {
    await socialImage({
      title: "판테놀",
      logoSrc: await socialImageLogoSrc(),
      cacheControl: "public, max-age=86400, s-maxage=86400",
    });

    expect(nextOg.ImageResponse).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
      }),
    );
  });

  it("긴 제목은 두 줄에서 말줄임한다", async () => {
    const title = "가".repeat(24);
    await socialImage({
      title,
      logoSrc: await socialImageLogoSrc(),
    });

    const element = nextOg.ImageResponse.mock.calls.at(-1)?.[0];
    if (!isValidElement(element)) throw new TypeError("공유 이미지 루트는 React 요소여야 합니다.");

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain("line-clamp:2");
    expect(markup).toContain("word-break:break-all");
    expect(markup).toContain("white-space:normal");
    expect(markup).toContain(`${"가".repeat(20)}…`);
    expect(markup).not.toContain(title);
  });

  it("긴 성분 이름은 두 줄 범위에서 말줄임한다", async () => {
    const ingredientName = "실리콘쿼터늄-2판테놀석시네이트추가긴성분이름";
    await socialImage({ title: ingredientName, logoSrc: await socialImageLogoSrc() });

    const element = nextOg.ImageResponse.mock.calls.at(-1)?.[0];
    if (!isValidElement(element)) throw new TypeError("공유 이미지 루트는 React 요소여야 합니다.");

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain("line-clamp:2");
    expect(markup).toContain("실리콘쿼터늄-2판테놀석시네이트추가긴성…");
    expect(markup).not.toContain(ingredientName);
  });

  it("명시된 제목 줄바꿈을 유지한다", async () => {
    await socialImage({
      title: "라운드랩\n브랜드관",
      logoSrc: await socialImageLogoSrc(),
    });

    const element = nextOg.ImageResponse.mock.calls.at(-1)?.[0];
    if (!isValidElement(element)) throw new TypeError("공유 이미지 루트는 React 요소여야 합니다.");

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain("라운드랩</div><div");
    expect(markup).toContain("브랜드관</div>");
  });

  it("여러 코드 포인트로 된 글자를 분리하지 않는다", async () => {
    const grapheme = "👨‍👩‍👧‍👦";
    const title = grapheme.repeat(22);
    await socialImage({ title, logoSrc: await socialImageLogoSrc() });

    const element = nextOg.ImageResponse.mock.calls.at(-1)?.[0];
    if (!isValidElement(element)) throw new TypeError("공유 이미지 루트는 React 요소여야 합니다.");

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain(`${grapheme.repeat(20)}…`);
    expect(markup).not.toContain(title);
  });

  it("명시된 각 줄도 길이를 제한한다", async () => {
    const title = `${"가".repeat(24)}\n브랜드관`;
    await socialImage({ title, logoSrc: await socialImageLogoSrc() });

    const element = nextOg.ImageResponse.mock.calls.at(-1)?.[0];
    if (!isValidElement(element)) throw new TypeError("공유 이미지 루트는 React 요소여야 합니다.");

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain(`${"가".repeat(20)}…</div><div`);
    expect(markup).toContain("브랜드관</div>");
  });
});
