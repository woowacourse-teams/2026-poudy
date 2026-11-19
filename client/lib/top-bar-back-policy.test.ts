import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/*
 * 상단 바 뒤로 가기 정책(#1268, 명세 NAV `상단 바 뒤로 가기 · 정의` SiVtc)을 지키는지 본다.
 *
 * 주소가 있는 화면의 상단 바 ‹ 는 useSubScreenBack 을 쓴다. 화면마다 정하는 것은 기록이 없을 때 갈 곳(fallback)뿐이다.
 * 그래서 TopBar 의 back 에 정해진 주소로 가는 링크(asChild)를 바로 넘기면 안 된다. 그런 링크는 사이트 안에서 들어와도
 * 이전 화면으로 돌아가지 않고, replace 가 없으면 누를 때마다 방문 기록을 쌓는다.
 *
 * 문자열(`back={{ asChild: <Link`)만 찾으면 상수로 빼 둔 링크를 놓친다. 그래서 소스를 구문 트리로 읽어 `asChild` 를 가진
 * 객체마다 그 값이 어디로 흘러가는지 본다.
 *
 * - JSX 속성 `back={...}` 에 바로 쓰이거나, 삼항·괄호·`as` 를 거쳐 쓰인다.
 * - 객체 속성 `back: ...` 의 값이다.
 * - 변수에 담겼고, 그 변수의 타입이 TopBarBack 이거나 어느 파일에서든 back 의 값으로 쓰인다.
 * - 함수가 돌려주고, 그 함수의 반환 타입이 TopBarBack 이거나 어느 파일에서든 back 의 값으로 불린다.
 *
 * 다음은 이 검사로 잡지 못한다.
 * - 링크를 담은 값을 다른 이름의 변수나 prop 으로 한 번 더 옮긴 뒤 back 으로 넘기는 경우. 흐름은 한 단계만 따라간다.
 * - createElement·cloneElement 로 만든 링크, 계산된 키(`[key]: …`)로 asChild 를 넣은 객체
 * - onClick 안에서 정해진 주소로 옮기는 경우(router.replace("/") 등). 링크가 아니라 이 검사의 대상이 아니다.
 * - client/app, client/components, client/lib 밖에서 만든 링크
 */
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE_DIRS = ["client/app", "client/components", "client/lib"];
const SOURCE_FILE = /\.tsx?$/;
const NOT_PRODUCT_CODE = /\.(test|stories)\.tsx?$/;

/** 정책을 만드는 곳. 기록이 없을 때 fallback 으로 가는 링크를 여기서만 만든다. */
const POLICY = "client/components/navigation/useSubScreenBack.tsx";

/**
 * 정책의 예외(명세 SiVtc, 이슈 #1268). 이 두 곳 말고는 ‹ 에 정해진 주소로 가는 링크를 걸지 않는다.
 * `pattern` 은 예외가 아직 그 모양으로 남아 있는지 본다. 예외를 없애면 이 목록에서도 지운다.
 */
const EXCEPTIONS = [
  {
    file: "client/components/search/IngredientPicker.tsx",
    pattern: /back=\{\{ onClick: onBack \}\}/,
    reason:
      "성분 고르기의 ‹ 는 한 화면 안에서 열린 층을 닫는다. 방문 기록과 관계가 없고, 링크가 아니라 이 검사에 걸리지 않는다.",
  },
  {
    file: "client/components/login/WithdrawnNotice.tsx",
    pattern: /const BACK_HOME: TopBarBack = \{ asChild: <Link href="\/" replace \/>/,
    reason:
      "계정 복구의 ‹ 는 [다음에 할게요]와 같이 로그인하지 않고 홈으로 나가는 동작이다. 소셜 로그인에서 막 돌아온 화면이라 훅을 써도 홈으로 간다.",
  },
] as const;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sources = SOURCE_DIRS.flatMap((dir) => walk(join(REPO, dir)))
  .filter((path) => SOURCE_FILE.test(path) && !NOT_PRODUCT_CODE.test(path))
  .map((path) => {
    const text = readFileSync(path, "utf8");
    return {
      path: relative(REPO, path),
      text,
      tree: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
    };
  });

/** 값이 그대로 흘러가는 껍데기. 이것들을 지나 실제로 값을 받는 곳을 찾는다. */
const isPassThrough = (node: ts.Node) =>
  ts.isParenthesizedExpression(node) ||
  ts.isConditionalExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isNonNullExpression(node) ||
  ts.isJsxExpression(node) ||
  (ts.isBinaryExpression(node) &&
    [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(
      node.operatorToken.kind,
    ));

const nameOf = (name: ts.Node | undefined) =>
  name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;

/** 이름이 어느 파일에서든 back 의 값으로 쓰이는지. `back={NAME}`, `back: NAME`, `back={cond ? NAME : …}`, `back={NAME(…)}` */
const usedAsBack = (name: string) => {
  const pattern = new RegExp(String.raw`\bback\s*(?:=\s*\{|:)[^\n;]*?\b${name}\b`);
  return sources.some(({ text }) => pattern.test(text));
};

const returnsBack = (fn: ts.SignatureDeclaration) => {
  const name = nameOf(fn.name) ?? nameOf(ts.isVariableDeclaration(fn.parent) ? fn.parent.name : undefined);
  return Boolean(fn.type?.getText().includes("TopBarBack") || (name && usedAsBack(name)));
};

/** asChild 를 가진 객체가 TopBar 의 back 으로 가는지. 어디로 가는지 모르면 undefined 다. */
const flowsIntoBack = (literal: ts.ObjectLiteralExpression): boolean | undefined => {
  let node: ts.Node = literal;
  while (isPassThrough(node.parent)) node = node.parent;
  const owner = node.parent;

  if (ts.isJsxAttribute(owner)) return owner.name.getText() === "back";
  if (ts.isPropertyAssignment(owner)) return nameOf(owner.name) === "back";
  if (ts.isVariableDeclaration(owner)) {
    const name = nameOf(owner.name);
    return Boolean(owner.type?.getText().includes("TopBarBack") || (name && usedAsBack(name)));
  }
  if (ts.isReturnStatement(owner)) {
    const fn = ts.findAncestor(owner, ts.isFunctionLike);
    return fn ? returnsBack(fn) : undefined;
  }
  if (ts.isArrowFunction(owner)) return returnsBack(owner);
  return undefined;
};

type Finding = { readonly file: string; readonly line: number; readonly code: string; readonly reaches: string };

const fixedBackLinks = (): Finding[] =>
  sources.flatMap(({ path, tree }) => {
    const found: Finding[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isObjectLiteralExpression(node) &&
        node.properties.some((property) => nameOf(property.name) === "asChild")
      ) {
        const reaches = flowsIntoBack(node);
        if (reaches !== false) {
          found.push({
            file: path,
            line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            code: node.getText().replace(/\s+/g, " "),
            reaches: reaches ? "back" : "알 수 없음",
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    return found;
  });

describe("상단 바 뒤로 가기 정책", () => {
  it("TopBar 의 back 에 정해진 주소로 가는 링크를 바로 넘기지 않는다", () => {
    const allowed = new Set<string>([POLICY, ...EXCEPTIONS.map(({ file }) => file)]);

    expect(fixedBackLinks().filter(({ file }) => !allowed.has(file))).toEqual([]);
  });

  it("상수로 빼 둔 링크도 back 으로 가면 잡는다", () => {
    const found = fixedBackLinks();

    // 예외인 계정 복구는 링크를 상수(BACK_HOME)로 빼 두었다. 이 검사가 그 모양을 잡는지 본다.
    expect(found).toContainEqual(
      expect.objectContaining({ file: "client/components/login/WithdrawnNotice.tsx", reaches: "back" }),
    );
    // 훅은 반환 타입(TopBarBack)으로 잡힌다.
    expect(found).toContainEqual(expect.objectContaining({ file: POLICY, reaches: "back" }));
  });

  it.each(EXCEPTIONS)("예외 $file 은 아직 그 모양으로 남아 있다", ({ file, pattern }) => {
    const source = sources.find(({ path }) => path === file);

    expect(source?.text).toMatch(pattern);
  });
});
