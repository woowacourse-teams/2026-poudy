import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [catalogFile, officialTextFile] = process.argv.slice(2);
assert.ok(
  catalogFile && officialTextFile,
  "사용법: node audit-ingredient-codes.mjs <공개 성분 목록 JSON> <공식 목록 pdftotext -layout 결과>",
);
const normalize = (value) => value.normalize("NFC").replace(/\s+/g, "").toLowerCase();
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const official = new Map();
for (const line of (await readFile(officialTextFile, "utf8")).split("\n")) {
  const match = line.match(/^\s*(\d+)\s{2,}(.*)$/);
  if (!match) continue;
  const [name, english] = match[2].trim().split(/\s{2,}/);
  if (!name || !english) continue;
  const key = `${normalize(name)}\n${normalize(english)}`;
  official.set(key, [...(official.get(key) ?? []), Number(match[1])]);
}
const result = { total: catalog.length, sameCode: 0, differentCode: [], unresolved: [] };
for (const ingredient of catalog) {
  const matches = official.get(`${normalize(ingredient.koreanName)}\n${normalize(ingredient.englishName)}`) ?? [];
  if (matches.length !== 1) result.unresolved.push(ingredient.id);
  else if (matches[0] === ingredient.id) result.sameCode += 1;
  else result.differentCode.push({ internalId: ingredient.id, name: ingredient.koreanName, officialCode: matches[0] });
}
console.log(JSON.stringify(result, null, 2));
