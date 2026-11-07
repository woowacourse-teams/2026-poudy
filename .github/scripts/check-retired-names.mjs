import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

/** 파우치의 옛 이름. '선반영'처럼 뜻이 다른 낱말은 잡지 않는다. */
const RETIRED_NAME = /선반(?!영)|쉘프|셸프/g;

/** line 이 있으면 그 글자가 든 줄만 허용한다. 없으면 파일 전체를 허용한다. */
export const ALLOWED = [
  {
    path: "server/src/main/resources/db/migration/V25__user_shelf_product_history.sql",
    reason: "적용이 끝난 마이그레이션은 체크섬 때문에 고칠 수 없다.",
  },
  {
    path: "client/next.config.ts",
    line: "선반이 파우치로 이름을 바꾸며",
    reason: "옛 주소를 새 주소로 보내는 이유를 적은 주석이다.",
  },
  {
    path: ".github/scripts/check-retired-names.mjs",
    reason: "이 검사의 정의다.",
  },
  {
    path: ".github/scripts/check-retired-names.test.mjs",
    reason: "이 검사의 시험이다.",
  },
];

const decodeEscapes = (text) =>
  text.replace(/\\u([\da-f]{4})/gi, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );

/** NFD로 저장한 글자와 \uXXXX 로 적은 글자도 같은 이름으로 본다. */
const normalize = (text) => decodeEscapes(text).normalize("NFC");

export function findRetiredNames(text) {
  return normalize(text)
    .split("\n")
    .flatMap((line, index) =>
      [...line.matchAll(RETIRED_NAME)].map(([name]) => ({
        name,
        lineNumber: index + 1,
        line: line.trim(),
      })),
    );
}

export function isAllowed(file, line) {
  return ALLOWED.some(
    (entry) =>
      entry.path === file && (!entry.line || line.includes(entry.line)),
  );
}

export function scan(root) {
  const files = execFileSync("git", ["-C", root, "ls-files", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);

  return files.flatMap((file) => {
    let bytes;
    try {
      bytes = readFileSync(path.join(root, file));
    } catch {
      // 심볼릭 링크가 가리키는 곳이 없으면 읽을 글자도 없다.
      return [];
    }
    if (bytes.subarray(0, 8000).includes(0)) return [];

    return findRetiredNames(bytes.toString("utf8"))
      .filter(({ line }) => !isAllowed(file, line))
      .map((hit) => ({ file, ...hit }));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hits = scan(process.argv[2] ?? repositoryRoot);

  for (const { file, lineNumber, name, line } of hits) {
    console.log(
      `::error file=${file},line=${lineNumber}::옛 이름 '${name}'이 남아 있습니다. 화면 이름은 '파우치'입니다: ${line}`,
    );
  }

  if (hits.length > 0) {
    console.log(
      `옛 이름 ${hits.length}건을 찾았습니다. 꼭 남겨야 하면 ALLOWED 에 이유를 적어 주세요.`,
    );
    // process.exit 는 파이프에 남은 출력을 잘라 먹는다.
    process.exitCode = 1;
  } else {
    console.log("옛 이름이 없습니다.");
  }
}
