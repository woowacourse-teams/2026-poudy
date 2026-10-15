/**
 * 기한이 있는 예외 꼬리표를 검사한다.
 *
 *   node scripts/check-exception-tags.mjs <폴더>...
 *
 * 디자인 토큰 규칙(shadcn/...)을 끄는 주석에는 꼬리표가 있어야 한다.
 *
 *   // eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 이유 · 만료 2026-11-30
 *
 * 꼬리표가 없거나, 형식이 틀렸거나, 만료일이 지났으면 실패한다. 만료일은 그날까지 인정한다.
 * 오래 필요한 예외는 꼬리표로 버티지 않고 명세 보드의 예외 표와 lint/exceptions.mjs 에 올린다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SOURCE = /\.(tsx?|jsx?|mjs)$/;
const SKIPPED_DIRS = new Set(["node_modules", ".next", "out", "build"]);
const TAG = /design-exception:\s*(?<reason>\S.*?)\s*·\s*만료\s+(?<date>\d{4}-\d{2}-\d{2})\b/;

/** 서울 기준 오늘 날짜(YYYY-MM-DD). 만료일과 문자열로 비교한다. */
export const todayInSeoul = (now = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);

const isRealDate = (date) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
};

/** 한 파일의 문제를 찾는다. */
export function checkSource(text, today) {
  const problems = [];
  text.split("\n").forEach((line, index) => {
    const disablesDesignRule = /eslint-disable/.test(line) && /shadcn\//.test(line);
    const hasTag = line.includes("design-exception:");
    if (!disablesDesignRule && !hasTag) return;

    const match = TAG.exec(line);
    if (!match) {
      problems.push({
        line: index + 1,
        message: hasTag
          ? "꼬리표 형식이 틀렸다. 'design-exception: 이유 · 만료 YYYY-MM-DD' 로 적는다."
          : "디자인 토큰 규칙을 끄려면 '-- design-exception: 이유 · 만료 YYYY-MM-DD' 꼬리표가 있어야 한다.",
      });
      return;
    }
    const { date } = match.groups;
    if (!isRealDate(date)) {
      problems.push({ line: index + 1, message: `만료일 ${date} 이 없는 날짜다.` });
    } else if (date < today) {
      problems.push({
        line: index + 1,
        message: `만료일 ${date} 이 지났다. 토큰으로 바꾸거나, 계속 필요하면 명세 예외 표와 exceptions.mjs 에 올린다.`,
      });
    }
  });
  return problems;
}

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (SOURCE.test(entry)) yield path;
  }
}

const isMain = process.argv[1] && import.meta.filename === process.argv[1];
if (isMain) {
  const dirs = process.argv.slice(2);
  if (!dirs.length) {
    console.error("검사할 폴더를 적는다. 예: node scripts/check-exception-tags.mjs ../client/app");
    process.exit(2);
  }
  const today = todayInSeoul();
  let count = 0;
  for (const dir of dirs) {
    for (const file of sourceFiles(dir)) {
      for (const { line, message } of checkSource(readFileSync(file, "utf8"), today)) {
        console.error(`${relative(process.cwd(), file)}:${line} ${message}`);
        count += 1;
      }
    }
  }
  if (count) {
    console.error(`디자인 예외 꼬리표 문제 ${count}개`);
    process.exit(1);
  }
  console.log("디자인 예외 꼬리표에 문제가 없다.");
}
