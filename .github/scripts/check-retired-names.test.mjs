import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findRetiredNames, isAllowed, scan } from "./check-retired-names.mjs";

const script = fileURLToPath(
  new URL("./check-retired-names.mjs", import.meta.url),
);

function withRepository(files, run) {
  const root = mkdtempSync(path.join(tmpdir(), "retired-names-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    for (const [name, content] of Object.entries(files))
      writeFileSync(path.join(root, name), content);
    execFileSync("git", ["add", "."], { cwd: root });
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("NFC와 NFD로 적은 옛 이름을 찾는다", () => {
  assert.equal(findRetiredNames("내 선반").length, 1);
  assert.equal(findRetiredNames("내 선반".normalize("NFD")).length, 1);
});

test("이스케이프로 적은 옛 이름과 변형 표기를 찾는다", () => {
  assert.equal(findRetiredNames('const a = "\\uc120\\ubc18";').length, 1);
  assert.equal(findRetiredNames("쉘프와 셸프").length, 2);
});

test("줄 번호를 알려 준다", () => {
  assert.equal(findRetiredNames("첫 줄\n둘째 줄\n선반")[0].lineNumber, 3);
});

test("다른 낱말은 잡지 않는다", () => {
  assert.deepEqual(findRetiredNames("파우치에 담기, shelf, 선반영"), []);
  assert.deepEqual(findRetiredNames("선반영".normalize("NFD")), []);
});

test("허용 목록은 적어 둔 줄만 통과시킨다", () => {
  assert.equal(
    isAllowed(
      "client/next.config.ts",
      "// 선반이 파우치로 이름을 바꾸며 주소도 옮겨 갔다.",
    ),
    true,
  );
  assert.equal(
    isAllowed("client/next.config.ts", 'const title = "선반";'),
    false,
  );
  assert.equal(
    isAllowed("client/app/page.tsx", "// 선반이 파우치로 이름을 바꾸며"),
    false,
  );
});

test("추적하는 파일의 위치를 알려 주고 바이너리는 건너뛴다", () => {
  withRepository(
    {
      "a.tsx": "\n선반",
      "b.bin": Buffer.concat([Buffer.from([0]), Buffer.from("선반")]),
    },
    (root) => {
      assert.deepEqual(
        scan(root).map(({ file, lineNumber }) => [file, lineNumber]),
        [["a.tsx", 2]],
      );
    },
  );
});

test("찾으면 실패하고 없으면 통과한다", () => {
  const exitCode = (root) =>
    spawnSync(process.execPath, [script, root], { encoding: "utf8" }).status;
  withRepository({ "a.md": "선반" }, (root) => assert.equal(exitCode(root), 1));
  withRepository({ "a.md": "파우치" }, (root) =>
    assert.equal(exitCode(root), 0),
  );
});
