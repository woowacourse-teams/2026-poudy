import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { createElement } from "react";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SOCIAL_IMAGE_CONTENT_TYPE = "image/png";
export const SOCIAL_IMAGE_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";
const logoData = await readFile(join(process.cwd(), "public/images/og-lockup/g0qFp9.png"), "base64");
export const SOCIAL_IMAGE_LOGO_SRC = `data:image/png;base64,${logoData}`;
const backgroundData = await readFile(join(process.cwd(), "public/images/og-background/K9joN.png"), "base64");
const backgroundSrc = `data:image/png;base64,${backgroundData}`;
const titleFont = await readFile(join(process.cwd(), "public/fonts/NotoSansKR-Black.ttf"));
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

export const socialImage = ({ title, logoSrc, cacheControl }: SocialImageContent): ImageResponse => {
  const displayTitle = title.split("\n").slice(0, 2).map(truncateTitleLine).join("\n");
  const displayLines = displayTitle.split("\n");

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
      fonts: [{ name: "Noto Sans KR", data: Uint8Array.from(titleFont).buffer, weight: 900, style: "normal" }],
      ...(cacheControl ? { headers: { "Cache-Control": cacheControl } } : {}),
    },
  );
};
