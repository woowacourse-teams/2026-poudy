#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const [sourceRoot, destinationRoot] = process.argv.slice(2);

if (!sourceRoot || !destinationRoot) {
  console.error('사용법: copy-tree.js <원본 디렉터리> <대상 디렉터리>');
  process.exit(1);
}

function copyEntry(sourcePath, destinationPath, activeSources = new Set()) {
  const stats = fs.lstatSync(sourcePath);

  if (stats.isSymbolicLink()) {
    const resolvedSourcePath = fs.realpathSync(sourcePath);

    if (activeSources.has(resolvedSourcePath)) {
      throw new Error(`심볼릭 링크 순환을 발견했습니다: ${sourcePath}`);
    }

    copyEntry(
      resolvedSourcePath,
      destinationPath,
      new Set([...activeSources, resolvedSourcePath]),
    );

    // pnpm의 standalone 결과물은 최상위 패키지를 .pnpm 저장소의
    // 심볼릭 링크로 만들고, 그 패키지의 의존성은 형제 node_modules에
    // 둔다. 링크 대상 패키지를 실제 디렉터리로 옮기면 이 형제 디렉터리도
    // 함께 옮겨야 Node.js의 모듈 탐색 경로가 유지된다.
    const isTopLevelNodeModule =
      path.dirname(destinationPath) === path.join(destinationRoot, 'node_modules');
    const sourceNodeModules = path.dirname(resolvedSourcePath);

    if (isTopLevelNodeModule && path.basename(sourceNodeModules) === 'node_modules') {
      const dependencyDestination = path.join(destinationPath, 'node_modules');
      fs.mkdirSync(dependencyDestination, { recursive: true });

      for (const entry of fs.readdirSync(sourceNodeModules)) {
        if (entry === path.basename(resolvedSourcePath)) {
          continue;
        }

        copyEntry(
          path.join(sourceNodeModules, entry),
          path.join(dependencyDestination, entry),
          activeSources,
        );
      }
    }
    return;
  }

  if (stats.isDirectory()) {
    fs.mkdirSync(destinationPath, { recursive: true, mode: stats.mode });

    for (const entry of fs.readdirSync(sourcePath)) {
      copyEntry(
        path.join(sourcePath, entry),
        path.join(destinationPath, entry),
        activeSources,
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
  fs.chmodSync(destinationPath, stats.mode);
}

fs.rmSync(destinationRoot, { recursive: true, force: true });
fs.mkdirSync(destinationRoot, { recursive: true });

for (const entry of fs.readdirSync(sourceRoot)) {
  copyEntry(path.join(sourceRoot, entry), path.join(destinationRoot, entry));
}
