import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as prettier from "../../client/node_modules/prettier/index.mjs";
import { parsers } from "../../client/node_modules/prettier/plugins/markdown.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

export function localTarget(source, url) {
  if (!url || url.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url))
    return null;
  const target = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  if (!target) return null;
  const resolved = url.startsWith("/")
    ? path.resolve(root, `.${target}`)
    : path.resolve(path.dirname(source), target);
  if (resolved !== path.resolve(root) && !resolved.startsWith(root))
    throw new Error("링크 대상이 저장소 밖입니다.");
  return resolved;
}

export function links(text) {
  const result = [];
  const visit = (node) => {
    if (["link", "image", "definition"].includes(node.type)) result.push(node);
    node.children?.forEach(visit);
  };
  visit(parsers.markdown.parse(text, { parser: "markdown" }));
  return result;
}

async function exists(file) {
  return stat(file).then(
    () => true,
    () => false,
  );
}

async function main() {
  const changed = JSON.parse(process.env.CHANGED_DOCS ?? "[]").map((file) =>
    path.resolve(root, file),
  );
  if (changed.some((file) => !file.startsWith(root)))
    throw new Error("문서 경로가 저장소 밖입니다.");
  const deleted = new Set();
  for (const file of changed) if (!(await exists(file))) deleted.add(file);
  const tracked = execFileSync("git", ["ls-files", "-z", "*.md"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const files = new Set([
    ...changed,
    ...(deleted.size ? tracked.map((file) => path.resolve(root, file)) : []),
  ]);
  const errors = [];
  for (const file of files) {
    if (!(await exists(file))) continue;
    const text = await readFile(file, "utf8");
    const relative = path.relative(root, file);
    if (
      changed.includes(file) &&
      !(await prettier.check(text, {
        ...(await prettier.resolveConfig(file)),
        filepath: file,
      }))
    ) {
      errors.push(`${relative}: 포맷 불일치`);
    }
    for (const link of links(text)) {
      let target;
      try {
        target = localTarget(file, link.url);
      } catch {
        errors.push(
          `${relative}:${link.position.start.line}: 잘못된 URL ${link.url}`,
        );
        continue;
      }
      if (
        target &&
        (changed.includes(file) || deleted.has(target)) &&
        !(await exists(target))
      ) {
        errors.push(
          `${relative}:${link.position.start.line}: 없는 링크 대상 ${link.url}`,
        );
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`문서 ${changed.length}개: 포맷과 로컬 링크 대상 확인 완료`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
