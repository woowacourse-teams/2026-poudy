/**
 * 부품 문서(src/*.mdx)가 같은 틀로 쓰는 블록. 문서마다 같은 순서로 놓는다.
 *
 * 1. SpecSources: 명세 보드, 이슈, 소스 파일
 * 2. 언제 쓰고 언제 쓰지 않는지(MDX 본문)
 * 3. Rules: 상태(hover · 눌림 · 포커스 · 비활성 · 처리 중 · 줄인 모션)의 모양과 규칙
 * 4. Exceptions: 명세가 허용한 예외(lint/exceptions.mjs 에서 그 부품의 것만)
 * 5. 모든 조합 스토리(Canvas)와 props 표(ArgTypes)
 *
 * MDX 의 Markdown 표는 GFM 플러그인이 있어야 그려져서, 표는 이 블록으로 그린다. MDX 에서는 <Unstyled> 안에 둔다.
 */
import type { ReactNode } from "react";

import { exceptions } from "../lint/exceptions.mjs";
import { Cell, Code, Row, Table } from "./table";

/** 문서의 근거. 명세가 단일 원천이고, 문서는 보드 ID 와 정책 문장만 옮긴다. */
export function SpecSources({
  boards,
  issues,
  source,
}: {
  readonly boards: readonly string[];
  readonly issues: readonly string[];
  readonly source: string;
}) {
  const rows: readonly (readonly [string, ReactNode])[] = [
    ["명세", boards.join(", ")],
    ["이슈", issues.join(", ")],
    ["소스", <Code key="source">{source}</Code>],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-surface px-4 py-3 font-sans text-13 text-text-body">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="font-semibold text-text-secondary">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 상태 표. 행마다 [상태, 모양, 규칙]을 넘긴다. */
export function Rules({ rows }: { readonly rows: readonly (readonly [ReactNode, ReactNode, ReactNode])[] }) {
  return (
    <Table head={["상태", "모양", "규칙"]}>
      {rows.map(([state, look, rule], index) => (
        <Row key={index}>
          <Cell>
            <span className="font-semibold whitespace-nowrap text-text-primary">{state}</span>
          </Cell>
          <Cell>{look}</Cell>
          <Cell>{rule}</Cell>
        </Row>
      ))}
    </Table>
  );
}

/**
 * 명세 보드의 '남겨 둔 예외' 가운데 이 부품이 쓰는 것. lint/exceptions.mjs 의 components 로 고른다.
 * 예외가 없으면 토큰과 스케일만 쓴다고 적는다.
 */
export function Exceptions({ component }: { readonly component: string }) {
  const own = exceptions.filter((item) => item.components?.includes(component));
  if (own.length === 0) {
    return (
      <p className="font-sans text-14 text-text-body">
        명세가 허용한 예외가 없습니다. 토큰과 스케일만 씁니다(<Code>lint/exceptions.mjs</Code>).
      </p>
    );
  }
  return (
    <Table head={["보드", "자리", "값", "이유"]}>
      {own.map((item) => (
        <Row key={item.target}>
          <Cell>
            <span className="whitespace-nowrap">{item.board}</span>
          </Cell>
          <Cell>{item.target}</Cell>
          <Cell>{item.value}</Cell>
          <Cell>{item.reason}</Cell>
        </Row>
      ))}
    </Table>
  );
}
