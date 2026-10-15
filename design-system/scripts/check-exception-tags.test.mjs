import assert from "node:assert/strict";
import { test } from "node:test";

import { checkSource, todayInSeoul } from "./check-exception-tags.mjs";

const TODAY = "2026-10-15";

test("기한이 남은 꼬리표는 통과한다", () => {
  const source =
    '// eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 광학 보정 · 만료 2026-11-30\n<span className="pt-[1.5px]" />';
  assert.deepEqual(checkSource(source, TODAY), []);
});

test("만료일 당일까지는 인정한다", () => {
  const source = "{/* eslint-disable-next-line shadcn/no-raw-colors -- design-exception: 이유 · 만료 2026-10-15 */}";
  assert.deepEqual(checkSource(source, TODAY), []);
});

test("만료일이 지나면 실패한다", () => {
  const source = "// eslint-disable-next-line shadcn/no-raw-colors -- design-exception: 이유 · 만료 2026-10-14";
  assert.match(checkSource(source, TODAY)[0].message, /지났다/);
});

test("꼬리표 없이 디자인 토큰 규칙을 끄면 실패한다", () => {
  const source = "// eslint-disable-next-line shadcn/no-arbitrary-values";
  assert.match(checkSource(source, TODAY)[0].message, /꼬리표가 있어야/);
});

test("형식이 틀린 꼬리표는 실패한다", () => {
  const source = "// design-exception: 이유만 적음";
  assert.match(checkSource(source, TODAY)[0].message, /형식이 틀렸다/);
});

test("없는 날짜는 실패한다", () => {
  const source = "// eslint-disable-next-line shadcn/no-raw-colors -- design-exception: 이유 · 만료 2026-02-30";
  assert.match(checkSource(source, TODAY)[0].message, /없는 날짜/);
});

test("디자인 토큰이 아닌 규칙을 끄는 주석은 검사하지 않는다", () => {
  assert.deepEqual(checkSource("// eslint-disable-next-line no-console", TODAY), []);
});

test("오늘 날짜는 서울 기준이다", () => {
  assert.equal(todayInSeoul(new Date("2026-10-14T15:30:00Z")), "2026-10-15");
});
