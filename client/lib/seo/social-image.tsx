import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { createElement } from "react";

import { absoluteUrl } from "./site";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SOCIAL_IMAGE_CONTENT_TYPE = "image/png";
export const SOCIAL_IMAGE_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";

const LOGO_PATH = "/images/og-lockup/g0qFp9.png";
const BACKGROUND_PATH = "/images/og-background/K9joN.png";
const TITLE_FONT_PATH = "/fonts/NotoSansKR-Black.ttf";

/*
 * 그림과 글꼴은 배포된 주소에서 받아 온다.
 *
 * `public/` 은 CDN 이 내주는 정적 자산이라 서버리스 함수의 파일 시스템에는 없다.
 * `readFile` 로 디스크를 뒤지면 함수 안에서 파일을 찾지 못해 무너진다. 이 파일을
 * 가져다 쓰는 화면까지 함께 무너지므로 OG 그림과 상관없는 화면도 열리지 않았다.
 *
 * 한 번 받은 것은 들고 있는다. 같은 함수 인스턴스가 살아 있는 동안 다시 받지 않는다.
 */
const cache = new Map<string, Promise<ArrayBuffer>>();

const fetchAsset = (path: string): Promise<ArrayBuffer> => {
  const cached = cache.get(path);
  if (cached) return cached;

  const pending = fetch(absoluteUrl(path)).then((response) => {
    if (!response.ok) {
      throw new Error(`OG 자산을 받지 못했습니다: ${path} (${response.status})`);
    }
    return response.arrayBuffer();
  });

  cache.set(path, pending);
  return pending;
};

const toDataUrl = async (path: string): Promise<string> => {
  const buffer = await fetchAsset(path);
  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
};

/** 로고를 data URL 로 받는다. 화면마다 이 값을 `socialImage` 에 넘긴다. */
export const socialImageLogoSrc = (): Promise<string> => toDataUrl(LOGO_PATH);

const graphemeSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

const TITLE_STYLE = {
  width: 760,
  maxWidth: 760,
  fontFamily: "Noto Sans KR",
  fontSize: 80,
  fontWeight: 900,
  lineHeight: 1.14,
  letterSpacing: "-3.4px",
  textAlign: "left",
} satisfies CSSProperties;

type SocialImageContent = {
  readonly title: string;
  readonly logoSrc: string;
  readonly cacheControl?: string;
};

const truncateTitleLine = (line: string): string => {
  const graphemes = Array.from(graphemeSegmenter.segment(line), ({ segment }) => segment);
  return graphemes.length <= 21 ? line : `${graphemes.slice(0, 20).join("")}…`;
};

export const socialImage = async ({ title, logoSrc, cacheControl }: SocialImageContent): Promise<ImageResponse> => {
  const displayTitle = title.split("\n").slice(0, 2).map(truncateTitleLine).join("\n");
  const displayLines = displayTitle.split("\n");
  const [backgroundBuffer, titleFont] = await Promise.all([fetchAsset(BACKGROUND_PATH), fetchAsset(TITLE_FONT_PATH)]);
  const backgroundSrc = `data:image/png;base64,${Buffer.from(backgroundBuffer).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        position: "relative",
        alignItems: "flex-end",
        justifyContent: "space-between",
        backgroundColor: "#fffdfd",
        color: "#202124",
        padding: "64px",
      }}
    >
      {createElement("img", {
        src: backgroundSrc,
        width: 1200,
        height: 630,
        alt: "",
        style: { position: "absolute", left: 0, top: 0 },
      })}

      {displayTitle.includes("\n") ? (
        <div style={{ ...TITLE_STYLE, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", whiteSpace: "nowrap" }}>{displayLines[0]}</div>
          <div style={{ display: "flex", whiteSpace: "nowrap" }}>{displayLines[1]}</div>
        </div>
      ) : (
        <div style={{ ...TITLE_STYLE, overflow: "hidden", whiteSpace: "normal", wordBreak: "break-all", lineClamp: 2 }}>
          {displayTitle}
        </div>
      )}

      {createElement("img", { src: logoSrc, width: 221, height: 74, alt: "", style: { objectFit: "contain" } })}
    </div>,
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts: [{ name: "Noto Sans KR", data: titleFont, weight: 900, style: "normal" }],
      ...(cacheControl ? { headers: { "Cache-Control": cacheControl } } : {}),
    },
  );
};
