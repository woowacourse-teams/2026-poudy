/**
 * tokens.json(디자인 파일 poudy-ui.pen 의 변수를 그대로 옮긴 것)에서 Tailwind @theme CSS 를 만든다.
 *
 *   node scripts/build-tokens.mjs          src/tokens.css 를 다시 쓴다
 *   node scripts/build-tokens.mjs --check  다시 만든 결과가 src/tokens.css 와 다르면 실패한다(CI)
 *
 * 디자인 변수 이름을 코드 이름으로 옮기는 규칙은 명세의 MAP G03 을 따르고, token-map.mjs 에 있다. 규칙에 없는 변수가
 * 새로 생기면 조용히 건너뛰지 않고 실패한다. token-map.mjs 의 규칙을 먼저 정한 뒤 다시 만든다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectTokens } from "./token-map.mjs";

export { oklchToSrgb, srgbToOklch, toOklch } from "./token-map.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS_PATH = join(root, "tokens.json");
const OUTPUT_PATH = join(root, "src", "tokens.css");

export const buildCss = (tokens) => {
  const { groups } = collectTokens(tokens);
  const lines = [
    "/*",
    " * 이 파일은 scripts/build-tokens.mjs 가 tokens.json 에서 만든다. 손으로 고치지 않는다.",
    " * 값을 바꾸려면 poudy-ui.pen 의 변수를 고치고 tokens.json 을 다시 내보낸다(README).",
    " */",
    "@theme {",
  ];
  for (const { title, entries } of groups) {
    if (!entries.length) continue;
    lines.push(`  /* ${title} */`);
    for (const entry of entries) {
      lines.push(`  ${entry.name}: ${entry.value};`);
      for (const [name, value] of entry.extra ?? []) lines.push(`  ${name}: ${value};`);
    }
    lines.push("");
  }
  lines[lines.length - 1] = "}";
  return `${lines.join("\n")}\n`;
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const css = buildCss(JSON.parse(readFileSync(TOKENS_PATH, "utf8")));
  if (process.argv.includes("--check")) {
    const current = readFileSync(OUTPUT_PATH, "utf8");
    if (current !== css) {
      console.error(
        "src/tokens.css 가 tokens.json 에서 만든 결과와 다르다. pnpm --filter @poudy/design-system tokens 를 실행한다.",
      );
      process.exit(1);
    }
    console.log("src/tokens.css 가 tokens.json 과 일치한다.");
  } else {
    writeFileSync(OUTPUT_PATH, css);
    console.log(`src/tokens.css 를 만들었다.`);
  }
}
