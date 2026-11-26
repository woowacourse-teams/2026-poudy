import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { collectTokens, SKIPPED } from "./token-map.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));

test("모든 변수는 코드 이름으로 옮기거나 이유와 함께 건너뛴다", () => {
  const { groups, skipped } = collectTokens(tokens);
  const translated = groups.flatMap((group) => group.entries.map((entry) => entry.source));
  assert.equal(translated.length + skipped.length, Object.keys(tokens).length);
  assert.equal(new Set([...translated, ...skipped.map((item) => item.name)]).size, Object.keys(tokens).length);
  const reasons = new Set(SKIPPED.map(([, reason]) => reason));
  for (const item of skipped) assert.ok(reasons.has(item.reason), `${item.name} 의 이유`);
});

test("문서가 쓰도록 디자인 변수 이름과 원래 값을 함께 돌려준다", () => {
  const { groups } = collectTokens(tokens);
  const color = groups.find((group) => group.group === "color").entries.find((entry) => entry.source === "ui-surface");
  assert.equal(color.name, "--color-surface");
  assert.match(String(color.raw), /^#[0-9A-F]{6}$/i);
  const role = groups.find((group) => group.group === "role").entries.find((entry) => entry.source === "ui-body-size");
  assert.deepEqual(role.extra, [["--text-body--line-height", "var(--leading-normal)"]]);
});

test("관리자 변수는 admin 이름 공간으로 옮기고, 단계 값은 역할을 거쳐서만 쓴다", () => {
  const { groups, skipped } = collectTokens(tokens);
  const admin = new Map(groups.find((group) => group.group === "admin").entries.map((entry) => [entry.source, entry]));
  assert.equal(admin.get("admin-body-size").name, "--text-admin-body");
  assert.equal(admin.get("admin-mock-text").name, "--text-admin-mock-text");
  assert.equal(admin.get("admin-mock-text").value, "9.5px");
  assert.equal(admin.get("admin-leading-snug").name, "--leading-admin-snug");
  assert.equal(admin.get("admin-leading-snug").value, "1.4");
  assert.equal(admin.get("admin-scrim").name, "--color-admin-scrim");
  const skippedNames = new Set(skipped.map((item) => item.name));
  for (const name of ["admin-type-14", "admin-line-1.4", "admin-radius-full"]) assert.ok(skippedNames.has(name), name);
});
