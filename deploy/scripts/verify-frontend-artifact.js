#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const [artifactRoot] = process.argv.slice(2);

if (!artifactRoot) {
  console.error("사용법: verify-frontend-artifact.js <standalone 디렉터리>");
  process.exit(1);
}

const serverEntry = path.join(artifactRoot, "server.js");
const imageOptimizerEntry = path.join(
  artifactRoot,
  "node_modules/next/dist/server/image-optimizer.js",
);

if (!fs.existsSync(serverEntry)) {
  console.error(`standalone server.js를 찾을 수 없습니다: ${serverEntry}`);
  process.exit(1);
}

if (!fs.existsSync(imageOptimizerEntry)) {
  console.error(
    `Next.js image optimizer를 찾을 수 없습니다: ${imageOptimizerEntry}`,
  );
  process.exit(1);
}

async function main() {
  // Next.js image optimizer와 동일한 모듈 탐색 위치에서 sharp를 로드한다.
  // standalone 루트에서만 require하면 next/node_modules 아래의 깨진 복사본을
  // 놓칠 수 있다.
  const requireFromImageOptimizer = createRequire(imageOptimizerEntry);
  const sharp = requireFromImageOptimizer("sharp");
  const optimized = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .webp({ quality: 75 })
    .toBuffer();

  if (
    optimized.subarray(0, 4).toString() !== "RIFF" ||
    optimized.subarray(8, 12).toString() !== "WEBP"
  ) {
    throw new Error("sharp WebP 변환 결과가 올바르지 않습니다.");
  }

  console.log(
    `sharp ${sharp.versions.sharp} 로딩 및 WebP 변환에 성공했습니다.`,
  );
}

main().catch((error) => {
  console.error(`프론트엔드 산출물 검증에 실패했습니다: ${error.message}`);
  process.exit(1);
});
