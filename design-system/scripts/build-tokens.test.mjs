import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { buildCss, oklchToSrgb, toOklch } from "./build-tokens.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));

const parseOklch = (value) => {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value);
  assert.ok(match, `oklch 표기가 아니다: ${value}`);
  return match.slice(1).map((part) => (part === undefined ? 1 : Number(part)));
};

test("OKLCH 로 바꾼 색을 되돌리면 원래 hex 와 채널마다 1 이내로 같다", () => {
  const hexes = Object.values(tokens)
    .map((token) => token.value)
    .filter((value) => typeof value === "string" && value.startsWith("#"));
  assert.ok(hexes.length > 50);

  for (const hex of hexes) {
    const [l, c, h, alpha] = parseOklch(toOklch(hex));
    const channels = oklchToSrgb(l, c, h).map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
    const expected = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    channels.forEach((channel, i) =>
      assert.ok(Math.abs(channel - expected[i]) <= 1, `${hex}: ${channels} ≠ ${expected}`),
    );
    const expectedAlpha = hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1;
    assert.ok(Math.abs(alpha - expectedAlpha) < 0.001, `${hex} 투명도`);
  }
});

test("MAP G03 의 이름 규칙대로 옮긴다", () => {
  const css = buildCss(tokens);
  assert.match(css, /--color-text-primary: oklch\(/);
  assert.match(css, /--color-droplet-moisture: oklch\(/);
  assert.match(css, /--color-kakao-bg: oklch\(/);
  assert.match(css, /--text-13: 13px;/);
  assert.match(css, /--text-body: 14px;\n {2}--text-body--line-height: var\(--leading-normal\);/);
  assert.match(css, /--leading-tight: 1\.3;/);
  assert.match(css, /--radius-xl: 14px;/);
  assert.match(css, /--duration-slow: 280ms;/);
  assert.match(css, /--pressed-opacity: 0\.88;/);
  assert.match(css, /--focus-ring-width: 2px;/);
  assert.doesNotMatch(css, /skin-test|--color-gray|--radius-full|--space/);
});

test("이름 규칙이 없는 변수가 생기면 조용히 건너뛰지 않고 실패한다", () => {
  assert.throws(() => buildCss({ ...tokens, "ui-new-thing": { type: "number", value: 3 } }), /ui-new-thing/);
});

test("없는 변수를 가리키면 실패한다", () => {
  assert.throws(
    () =>
      buildCss({
        ...tokens,
        "ui-brand": { type: "color", value: "$app-nothing" },
      }),
    /app-nothing/,
  );
});

test("관리자 별칭과 크기는 앱 토큰을 덮어쓰지 않는 이름으로 내보낸다", () => {
  const css = buildCss(tokens);
  assert.match(css, /--color-admin-bg: oklch\(/);
  assert.match(css, /--radius-admin-xl: 12px;/);
  assert.match(css, /--text-admin-heading: 22px;/);
  assert.match(css, /--text-admin-body: 14px;/);
  assert.match(css, /--radius-xl: 14px;/);
  assert.doesNotMatch(css, /--spacing-admin/);
});
