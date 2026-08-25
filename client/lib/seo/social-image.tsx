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
 * 그림과 글꼴을 가져오는 길이 두 갈래다.
 *
 * 빌드하며 미리 그릴 때는 `public/` 이 디스크에 있으므로 그대로 읽는다. 이때는 서버가
 * 떠 있지 않아 자기 주소로 받아 올 수 없다.
 *
 * 배포된 뒤 함수 안에서는 반대다. `public/` 은 CDN 이 내주는 자산이라 함수의 파일
 * 시스템에 담기지 않는다. 그래서 배포된 주소에서 받아 온다.
 *
 * 한 번 얻은 것은 들고 있는다. 같은 함수 인스턴스가 살아 있는 동안 다시 얻지 않는다.
 */
const cache = new Map<string, Promise<ArrayBuffer>>();

const readFromDisk = async (path: string): Promise<ArrayBuffer> => {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const buffer = await readFile(join(process.cwd(), "public", path));

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

const fetchFromCdn = async (path: string): Promise<ArrayBuffer> => {
  const response = await fetch(absoluteUrl(path));
  if (!response.ok) {
    throw new Error(`OG 자산을 받지 못했습니다: ${path} (${response.status})`);
  }

  return response.arrayBuffer();
};

const loadAsset = (path: string): Promise<ArrayBuffer> => {
  const cached = cache.get(path);
  if (cached) return cached;

  // 디스크에 있으면 그것을 쓰고, 없으면 배포된 주소에서 받아 온다.
  const pending = readFromDisk(path).catch(() => fetchFromCdn(path));

  cache.set(path, pending);
  return pending;
};

const toDataUrl = async (path: string): Promise<string> => {
  const buffer = await loadAsset(path);
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
  const [backgroundBuffer, titleFont] = await Promise.all([loadAsset(BACKGROUND_PATH), loadAsset(TITLE_FONT_PATH)]);
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
