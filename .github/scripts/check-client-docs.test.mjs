import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { links, localTarget } from "./check-client-docs.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = path.join(root, "client/README.md");

test("상대 경로, 루트 경로, 한글과 공백을 해석한다", () => {
  assert.equal(
    localTarget(source, "../common/package.json#scripts"),
    path.join(root, "common/package.json"),
  );
  assert.equal(
    localTarget(source, "/client/package.json"),
    path.join(root, "client/package.json"),
  );
  assert.equal(
    localTarget(source, "./%ED%95%9C%20%EA%B8%80.md?raw=1"),
    path.join(root, "client/한 글.md"),
  );
  assert.throws(() => localTarget(source, "../../outside.md"), /저장소 밖/);
  for (const url of [
    "#title",
    "https://example.com",
    "mailto:a@example.com",
    "//example.com",
  ]) {
    assert.equal(localTarget(source, url), null);
  }
});

test("본문 링크, 이미지와 참조 링크만 검사하고 코드 예시는 제외한다", () => {
  const text =
    "[본문](./a.md)\n![이미지](./a.png)\n[참조][ref]\n\n[ref]: ./b.md\n\n`[예시](missing.md)`\n\n```md\n[예시](missing.md)\n```\n";
  assert.deepEqual(
    links(text).map((link) => link.url),
    ["./a.md", "./a.png", "./b.md"],
  );
});

test("문서 포맷 오류와 없는 링크 대상은 실패한다", () => {
  const dir = mkdtempSync(path.join(root, "client/.docs-check-"));
  const file = path.join(dir, "README.md");
  const run = (text) => {
    writeFileSync(file, text);
    return spawnSync(
      process.execPath,
      [path.join(root, ".github/scripts/check-client-docs.mjs")],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          CHANGED_DOCS: JSON.stringify([path.relative(root, file)]),
        },
      },
    );
  };
  try {
    assert.equal(run("# 안내\n\n[설정](../package.json)\n").status, 0);
    assert.notEqual(run("#  안내\n").status, 0);
    const missing = run("[없는 파일](missing.md)\n");
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /없는 링크 대상/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
