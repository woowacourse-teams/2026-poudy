/**
 * tokens.json(디자인 파일 poudy-ui.pen 의 변수를 그대로 옮긴 것)에서 Tailwind @theme CSS 를 만든다.
 *
 *   node scripts/build-tokens.mjs          src/tokens.css 를 다시 쓴다
 *   node scripts/build-tokens.mjs --check  다시 만든 결과가 src/tokens.css 와 다르면 실패한다(CI)
 *
 * 디자인 변수 이름을 코드 이름으로 옮기는 규칙은 명세의 MAP G03 을 따른다. 규칙에 없는 변수가
 * 새로 생기면 조용히 건너뛰지 않고 실패한다. 이 파일의 규칙을 먼저 정한 뒤 다시 만든다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS_PATH = join(root, "tokens.json");
const OUTPUT_PATH = join(root, "src", "tokens.css");

/**
 * 코드로 내보내지 않는 변수. 앞에서부터 차례로 맞춰 본다.
 * 이유를 함께 적어 두어, 규칙을 바꿀 때 무엇이 따라 바뀌는지 보이게 한다.
 */
const SKIPPED = [
  [/^admin-/, "관리자 화면은 별도 체계라 이 패키지의 범위가 아니다"],
  [/^skin-test-/, "피부 타입 테스트는 나중에 따로 진행한다"],
  [/^app-/, "원료 색과 서체는 팔레트 보드에서만 쓰고, 코드에는 역할(ui-)만 내보낸다"],
  [/^ui-font$/, "서체는 기기 글꼴 대비책까지 함께 적어야 해서 client 의 --font-sans 가 맡는다"],
  [/^ui-space-/, "간격은 Tailwind 기본 숫자 스케일(4px 단위)과 1:1 이라 토큰을 따로 두지 않는다(LAYOUT)"],
  [/^ui-page-padding$/, "페이지 여백은 반응형 --gutter 가 맡는다(LAYOUT L02, system.css)"],
  [/^ui-section-gap$/, "섹션 간격은 간격 스케일(gap-6)을 쓴다"],
  [/^ui-safe-area-bottom$/, "목업 값이다. 코드는 env(safe-area-inset-bottom) 을 감싼 pb-safe 를 쓴다(LAYOUT L09)"],
  [/^ui-radius-full$/, "Tailwind 기본 rounded-full 을 쓴다(SHAPE E01)"],
];

/** 글자 위계 역할. 행간은 변수가 아니라 TYPO T02 의 표에 있어 여기에 옮겨 둔다. */
const TEXT_ROLES = [
  ["ui-display-size", "display", "tight"],
  ["ui-heading-hero", "hero", "tight"],
  ["ui-heading-screen", "screen", "tight"],
  ["ui-heading-block", "block", "snug"],
  // 앱바 제목과 라벨은 표에 '한 줄'로 적혀 있다. 한 줄 라벨도 snug 로 통일한다(TYPO 행간 규칙).
  ["ui-heading-bar", "bar", "snug"],
  ["ui-heading-section", "section", "snug"],
  ["ui-title-small", "title", "snug"],
  ["ui-body-size", "body", "normal"],
  ["ui-small-body-size", "body-sm", "normal"],
  ["ui-caption-size", "caption", "snug"],
  ["ui-label-size", "label", "snug"],
];
const ROLE_BY_VARIABLE = new Map(TEXT_ROLES.map(([variable, role, leading]) => [variable, { role, leading }]));

/** 변수 하나를 코드 이름과 값으로 옮긴다. 옮길 규칙이 없으면 undefined. */
const translate = (name, token, resolve) => {
  const value = resolve(name);

  if (token.type === "color") {
    if (name.startsWith("ui-")) return { group: "color", name: `--color-${name.slice(3)}`, value: toOklch(value) };
    // 물방울은 데이터 색이라 ui- 를 붙이지 않았다(색상 팔레트 '물방울 레벨').
    if (name.startsWith("droplet-")) return { group: "color", name: `--color-${name}`, value: toOklch(value) };
    // 로그인 버튼의 카카오·구글 색은 팔레트 밖의 브랜드 지정 색이다(색상 팔레트 '팔레트 밖').
    if (/^brand-(kakao|google)-/.test(name)) {
      return { group: "brand", name: `--color-${name.slice(6)}`, value: toOklch(value) };
    }
    return undefined;
  }

  if (token.type !== "number") return undefined;

  let match;
  if ((match = /^ui-text-(\d+)$/.exec(name))) return { group: "text", name: `--text-${match[1]}`, value: `${value}px` };
  if (ROLE_BY_VARIABLE.has(name)) {
    const { role, leading } = ROLE_BY_VARIABLE.get(name);
    return {
      group: "role",
      name: `--text-${role}`,
      value: `${value}px`,
      extra: [[`--text-${role}--line-height`, `var(--leading-${leading})`]],
    };
  }
  if ((match = /^ui-leading-(\w+)$/.exec(name)))
    return { group: "leading", name: `--leading-${match[1]}`, value: `${value}` };
  if ((match = /^ui-radius-(\w+)$/.exec(name)))
    return { group: "radius", name: `--radius-${match[1]}`, value: `${value}px` };
  if ((match = /^ui-motion-(\w+)$/.exec(name)))
    return { group: "duration", name: `--duration-${match[1]}`, value: `${value}ms` };
  if ((match = /^ui-(disabled|pressed|removed)-opacity$/.exec(name))) {
    return { group: "state", name: `--${match[1]}-opacity`, value: `${value / 100}` };
  }
  if ((match = /^ui-focus-ring-(width|offset)$/.exec(name))) {
    return { group: "state", name: `--focus-ring-${match[1]}`, value: `${value}px` };
  }
  return undefined;
};

const GROUPS = [
  ["color", "색: 역할(ui-)과 물방울 데이터 색. 원료(app-)는 내보내지 않는다(색상 팔레트)"],
  ["brand", "팔레트 밖 브랜드 지정 색: 카카오·구글 로그인 버튼(색상 팔레트 '팔레트 밖')"],
  ["text", "글자 크기 단계(TYPO T11)"],
  ["role", "글자 위계 역할. 크기와 행간을 함께 묶는다(TYPO T02·T11)"],
  ["leading", "행간 다섯 단계(TYPO T04). Tailwind 기본 leading-* 값을 덮어쓴다"],
  ["radius", "반경(SHAPE E01). Tailwind 기본 rounded-* 값을 덮어쓴다"],
  ["duration", "시간(MOTION M01). duration-(--duration-fast) 처럼 쓴다"],
  ["state", "상태 값(STATE S03·S06, A11Y D10)"],
];

/** 색은 이름순, 역할은 위계순(TEXT_ROLES), 단계가 있는 값은 작은 값부터 놓는다. */
const byValue = (a, b) => parseFloat(a.value) - parseFloat(b.value);
const ROLE_ORDER = TEXT_ROLES.map(([, role]) => `--text-${role}`);
const ORDER = {
  text: byValue,
  role: (a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name),
  leading: byValue,
  radius: byValue,
  duration: byValue,
};

export const buildCss = (tokens) => {
  const resolve = (name, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`변수가 서로를 가리킨다: ${[...seen, name].join(" → ")}`);
    const token = tokens[name];
    if (!token) throw new Error(`없는 변수를 가리킨다: ${name}`);
    const { value } = token;
    if (typeof value === "string" && value.startsWith("$")) return resolve(value.slice(1), new Set([...seen, name]));
    return value;
  };

  const byGroup = new Map(GROUPS.map(([group]) => [group, []]));
  const unknown = [];
  for (const name of Object.keys(tokens).sort(naturalCompare)) {
    if (SKIPPED.some(([pattern]) => pattern.test(name))) continue;
    const entry = translate(name, tokens[name], resolve);
    if (!entry) {
      unknown.push(name);
      continue;
    }
    byGroup.get(entry.group).push(entry);
  }
  if (unknown.length) {
    throw new Error(
      `코드 이름 규칙이 없는 변수: ${unknown.join(", ")}\nscripts/build-tokens.mjs 에 규칙을 먼저 정한다.`,
    );
  }

  const lines = [
    "/*",
    " * 이 파일은 scripts/build-tokens.mjs 가 tokens.json 에서 만든다. 손으로 고치지 않는다.",
    " * 값을 바꾸려면 poudy-ui.pen 의 변수를 고치고 tokens.json 을 다시 내보낸다(README).",
    " */",
    "@theme {",
  ];
  for (const [group, title] of GROUPS) {
    const entries = byGroup.get(group).sort(ORDER[group] ?? ((a, b) => naturalCompare(a.name, b.name)));
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

/** 숫자가 섞인 이름을 사람이 읽는 순서로 놓는다(text-11, text-12, …, text-28). */
function naturalCompare(a, b) {
  return a.localeCompare(b, "en", { numeric: true });
}

/** #RRGGBB 또는 #RRGGBBAA 를 oklch() 로 바꾼다. 색 표기는 OKLCH 로 통일한다(색상 팔레트). */
export function toOklch(hex) {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!match) throw new Error(`hex 색이 아니다: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255);
  const alpha = match[2] === undefined ? 1 : parseInt(match[2], 16) / 255;
  const { l, c, h } = srgbToOklch(r, g, b);
  const achromatic = c < 0.0005;
  const parts = [round(l, 4), achromatic ? 0 : round(c, 4), achromatic ? 0 : round(h, 2)];
  const body = parts.join(" ");
  return alpha === 1 ? `oklch(${body})` : `oklch(${body} / ${round(alpha, 3)})`;
}

/** sRGB(0~1) → OKLCH. Björn Ottosson 의 OKLab 변환식을 쓴다. */
export function srgbToOklch(r, g, b) {
  const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const hue = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: hue < 0 ? hue + 360 : hue };
}

/** OKLCH → sRGB(0~1). 테스트에서 되돌려 본 색이 원래 hex 와 같은지 확인하는 데 쓴다. */
export function oklchToSrgb(l, c, h) {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

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
