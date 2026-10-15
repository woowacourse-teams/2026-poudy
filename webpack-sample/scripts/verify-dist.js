// 빌드가 성공해도 산출물이 기대와 다를 수 있다. (#413: sharp 바이너리가 빠진 채 배포되었다)
// 그래서 빌드 직후 dist/ 를 열어 배포해도 되는 상태인지 확인한다.
const fs = require("fs");
const path = require("path");

const dist = path.resolve(process.argv[2] ?? "dist");

function fail(message) {
  console.error(`verify-dist: ${message}`);
  process.exit(1);
}

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const assets = [...html.matchAll(/(?:src|href)="\/?([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
if (assets.length === 0) fail("index.html 이 번들을 참조하지 않는다");

for (const asset of assets) {
  const file = path.join(dist, asset);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) fail(`${asset} 이 없거나 비어 있다`);

  const source = fs.readFileSync(file, "utf8");
  // hidden-source-map 이면 번들이 맵 위치를 알려 주지 않아야 한다.
  if (source.includes("sourceMappingURL")) fail(`${asset} 에 sourceMappingURL 이 남아 있다`);
  // React Refresh 와 dev server 코드는 개발 모드에서만 들어가야 한다.
  if (/\$RefreshReg\$|react-refresh|webpack-dev-server/.test(source)) fail(`${asset} 에 개발 전용 코드가 남아 있다`);
}

console.log(`verify-dist: ${assets.join(", ")} 확인`);
