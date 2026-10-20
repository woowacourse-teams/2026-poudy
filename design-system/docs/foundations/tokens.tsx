/**
 * 토큰 문서(기초 › 색·글자·모양과 움직임)에 쓰는 표. 값은 손으로 적지 않고 tokens.json 을 CSS 생성과 같은 규칙
 * (scripts/token-map.mjs)으로 옮겨 그린다. 그래서 명세의 변수를 고쳐 tokens.json 을 다시 내보내면 문서도 함께 바뀐다.
 *
 * 견본은 같은 규칙으로 옮긴 값을 그대로 칠한다. Tailwind 클래스를 이름으로 이어 붙이면 Tailwind 가 그 클래스를 만들지
 * 못하고, var(--…)로 칠하면 아직 코드에서 쓰지 않은 토큰은 Tailwind 가 CSS 에 내보내지 않아 비어 보인다.
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { collectTokens } from "../../scripts/token-map.mjs";
import { Cell, Code, Row, Table } from "../table";
import tokens from "../../tokens.json";

type Entry = {
  readonly group: string;
  readonly name: string;
  readonly value: string;
  readonly source: string;
  readonly raw: string | number;
  readonly extra?: readonly (readonly [string, string])[];
};

const { groups, skipped } = collectTokens(tokens) as {
  readonly groups: readonly { readonly group: string; readonly title: string; readonly entries: readonly Entry[] }[];
  readonly skipped: readonly { readonly name: string; readonly reason: string }[];
};

const entriesOf = (group: string) => groups.find((item) => item.group === group)?.entries ?? [];

/** 디자인 변수가 다른 변수를 가리키면 그 이름(예: app-gray-900)을 돌려준다. 팔레트의 어느 색에서 왔는지 보인다. */
const referenceOf = (source: string) => {
  const value = (tokens as Record<string, { readonly value: unknown }>)[source]?.value;
  return typeof value === "string" && value.startsWith("$") ? value.slice(1) : undefined;
};

/** 코드에서 쓰는 법. 이름 규칙(README '이름 규칙')을 따른다. */
const usageOf = (entry: Entry) => {
  const short = entry.name.replace(/^--(color|text|leading|radius)-/, "");
  switch (entry.group) {
    case "color":
    case "brand":
      return [`bg-${short}`, `text-${short}`, `border-${short}`];
    case "text":
    case "role":
      return [`text-${short}`];
    case "leading":
      return [`leading-${short}`];
    case "radius":
      return [`rounded-${short}`];
    case "duration":
      return [`duration-(${entry.name})`];
    default:
      return [`var(${entry.name})`];
  }
};

function Usage({ entry }: { readonly entry: Entry }) {
  return (
    <span className="flex flex-wrap gap-1">
      {usageOf(entry).map((usage) => (
        <Code key={usage}>{usage}</Code>
      ))}
    </span>
  );
}

function Source({ entry }: { readonly entry: Entry }) {
  const reference = referenceOf(entry.source);
  return (
    <span className="text-12 text-text-secondary">
      {entry.source}
      {reference ? ` → ${reference}` : null}
    </span>
  );
}

/**
 * 색의 묶음. 코드 이름의 첫 낱말로 나눈다. 여기에 없는 새 색은 '그 밖의 색'에 들어가 문서에서 빠지지 않는다.
 */
const COLOR_SECTIONS = [
  ["면과 그림자", ["background", "surface", "layer", "overlay", "scrim", "shadow"]],
  ["글자와 아이콘", ["text", "icon", "on"]],
  ["테두리와 포커스", ["border", "control", "focus"]],
  ["행동과 상호작용", ["action", "button", "hover", "disabled"]],
  ["브랜드와 강조", ["brand", "ai", "curation"]],
  ["상태", ["danger", "warning", "success", "info"]],
  ["데이터(물방울)", ["droplet"]],
] as const;

const firstWord = (entry: Entry) => entry.name.replace("--color-", "").split("-")[0] ?? "";

function ColorRows({ entries }: { readonly entries: readonly Entry[] }) {
  return (
    <Table head={["견본", "코드 이름", "쓰는 법", "디자인 변수", "값"]}>
      {entries.map((entry) => (
        <Row key={entry.name}>
          <Cell>
            {/* 흰 면 위의 흰 색도 보이도록 테두리를 둔다. */}
            <span className="block size-10 rounded-md border border-border" style={{ background: entry.value }} />
          </Cell>
          <Cell>
            <Code>{entry.name}</Code>
          </Cell>
          <Cell>
            <Usage entry={entry} />
          </Cell>
          <Cell>
            <Source entry={entry} />
          </Cell>
          <Cell>
            <span className="flex flex-col text-12 text-text-secondary">
              <span>{String(entry.raw)}</span>
              <span>{entry.value}</span>
            </span>
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

/** 역할 색을 묶음별로, 이어서 팔레트 밖 브랜드 지정 색(로그인 버튼)을 보인다. */
export function ColorTokens() {
  const colors = entriesOf("color");
  const known = new Set<string>(COLOR_SECTIONS.flatMap(([, words]) => words));
  const others = colors.filter((entry) => !known.has(firstWord(entry)));
  const sections: readonly (readonly [string, readonly Entry[]])[] = [
    ...COLOR_SECTIONS.map(
      ([title, words]) =>
        [title, colors.filter((entry) => (words as readonly string[]).includes(firstWord(entry)))] as const,
    ),
    ["그 밖의 색", others] as const,
    ["팔레트 밖 브랜드 지정 색(로그인 버튼에만)", entriesOf("brand")] as const,
  ];

  return (
    <div className="flex flex-col gap-10 font-sans">
      {sections
        .filter(([, entries]) => entries.length > 0)
        .map(([title, entries]) => (
          <section key={title} className="flex flex-col gap-3">
            <h3 className="text-section font-bold text-text-primary">{title}</h3>
            <ColorRows entries={entries} />
          </section>
        ))}
    </div>
  );
}

const SAMPLE = "파우디로 성분을 살펴봐요 Aa 123";

/** 글자 역할: 크기와 행간을 함께 묶은 위계(TYPO T02·T11). 견본은 역할 그대로 칠한다. */
export function TextRoleTokens() {
  return (
    <Table head={["견본", "역할", "크기", "행간", "디자인 변수"]}>
      {entriesOf("role").map((entry) => {
        const leadingName = (entry.extra?.[0]?.[1] ?? "").replace(/^var\((--leading-\w+)\)$/, "$1");
        const leading = entriesOf("leading").find((item) => item.name === leadingName);
        const style: CSSProperties = { fontSize: entry.value, lineHeight: leading?.value };
        return (
          <Row key={entry.name}>
            <Cell>
              <span className="block text-text-primary" style={style}>
                {SAMPLE}
              </span>
            </Cell>
            <Cell>
              <Usage entry={entry} />
            </Cell>
            <Cell>{entry.value}</Cell>
            <Cell>
              <Code>{leadingName.replace(/^--/, "")}</Code>
              <span className="text-12 text-text-secondary"> {leading?.value}</span>
            </Cell>
            <Cell>
              <Source entry={entry} />
            </Cell>
          </Row>
        );
      })}
    </Table>
  );
}

/** 글자 크기 단계(TYPO T11). 역할로 표현하지 못하는 자리에서만 쓴다. */
export function TextSizeTokens() {
  return (
    <Table head={["견본", "쓰는 법", "크기", "디자인 변수"]}>
      {entriesOf("text").map((entry) => (
        <Row key={entry.name}>
          <Cell>
            <span className="block leading-snug text-text-primary" style={{ fontSize: entry.value }}>
              {SAMPLE}
            </span>
          </Cell>
          <Cell>
            <Usage entry={entry} />
          </Cell>
          <Cell>{entry.value}</Cell>
          <Cell>
            <Source entry={entry} />
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

/** 행간 다섯 단계(TYPO T04). 견본은 두 줄로 그려 줄 사이를 보인다. */
export function LeadingTokens() {
  return (
    <Table head={["견본", "쓰는 법", "값", "디자인 변수"]}>
      {entriesOf("leading").map((entry) => (
        <Row key={entry.name}>
          <Cell>
            <span className="block max-w-40 bg-surface text-14 text-text-primary" style={{ lineHeight: entry.value }}>
              두 줄로 넘어가는 문장의 줄 사이를 봐요
            </span>
          </Cell>
          <Cell>
            <Usage entry={entry} />
          </Cell>
          <Cell>{entry.value}</Cell>
          <Cell>
            <Source entry={entry} />
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

/** 반경(SHAPE E01). Tailwind 기본 rounded-* 값을 명세 값으로 덮어쓴다. */
export function RadiusTokens() {
  return (
    <Table head={["견본", "쓰는 법", "값", "디자인 변수"]}>
      {entriesOf("radius").map((entry) => (
        <Row key={entry.name}>
          <Cell>
            <span
              className="block h-12 w-20 border border-border-strong bg-surface"
              style={{ borderRadius: entry.value }}
            />
          </Cell>
          <Cell>
            <Usage entry={entry} />
          </Cell>
          <Cell>{entry.value}</Cell>
          <Cell>
            <Source entry={entry} />
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

/** 곡선은 디자인 변수가 아니라 system.css 의 @theme 에 있다(MOTION M04). 값은 그려진 CSS 에서 읽는다. */
const EASINGS = ["--ease-out", "--ease-in-out", "--ease-drawer"] as const;

/**
 * 시간(MOTION M01)과 곡선(M04). [움직여 보기]를 누르면 점이 그 시간과 곡선으로 옮겨 간다.
 * 동작 줄이기 설정이면 점은 옮겨 가지 않고 바로 자리를 바꾼다(움직임을 인라인으로 걸어 motion-reduce 클래스가 닿지 않는다).
 */
export function MotionTokens() {
  const [moved, setMoved] = useState(false);
  // 문서는 브라우저에서만 그려지므로 처음 그릴 때 바로 읽는다.
  const [easings] = useState<Record<string, string>>(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(EASINGS.map((name) => [name, style.getPropertyValue(name).trim()]));
  });
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const rows = entriesOf("duration").flatMap((duration) =>
    EASINGS.map((easing) => ({ key: `${duration.name}${easing}`, duration, easing })),
  );

  return (
    <div className="flex flex-col gap-3 font-sans">
      <button
        type="button"
        onClick={() => setMoved((current) => !current)}
        className="self-start rounded-md bg-action px-4 py-2 text-14 font-semibold text-action-text"
      >
        움직여 보기
      </button>
      <Table head={["시간", "곡선", "움직임", "디자인 변수"]}>
        {rows.map(({ key, duration, easing }) => (
          <Row key={key}>
            <Cell>
              <Usage entry={duration} />
              <span className="text-12 text-text-secondary"> {duration.value}</span>
            </Cell>
            <Cell>
              <Code>{`ease-(${easing})`}</Code>
              <span className="block text-12 text-text-secondary">{easings[easing]}</span>
            </Cell>
            <Cell>
              <span className="relative block h-3 w-48 rounded-full bg-surface">
                <span
                  className="absolute top-0 left-0 size-3 rounded-full bg-action"
                  style={{
                    translate: moved ? "180px 0" : "0 0",
                    transitionProperty: "translate",
                    transitionDuration: reduced ? "0ms" : duration.value,
                    transitionTimingFunction: easings[easing] || "ease",
                  }}
                />
              </span>
            </Cell>
            <Cell>
              <Source entry={duration} />
            </Cell>
          </Row>
        ))}
      </Table>
    </div>
  );
}

/** 상태 값(STATE S03·S06, A11Y D10): 비활성·눌림 불투명도와 포커스 링 */
export function StateTokens() {
  return (
    <Table head={["코드 이름", "쓰는 법", "값", "디자인 변수"]}>
      {entriesOf("state").map((entry) => (
        <Row key={entry.name}>
          <Cell>
            <Code>{entry.name}</Code>
          </Cell>
          <Cell>
            <Code>{entry.name.endsWith("-opacity") ? `opacity-(${entry.name})` : `var(${entry.name})`}</Code>
          </Cell>
          <Cell>{entry.value}</Cell>
          <Cell>
            <Source entry={entry} />
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

/** 코드로 내보내지 않는 변수. 이유마다 몇 개인지와 예를 보인다(scripts/token-map.mjs 의 SKIPPED). */
export function SkippedTokens() {
  const byReason = new Map<string, string[]>();
  for (const { name, reason } of skipped) byReason.set(reason, [...(byReason.get(reason) ?? []), name]);

  return (
    <Table head={["이유", "개수", "예"]}>
      {[...byReason].map(([reason, names]) => (
        <Row key={reason}>
          <Cell>{reason}</Cell>
          <Cell>{names.length}</Cell>
          <Cell>
            <span className="text-12 text-text-secondary">
              {names.slice(0, 3).join(", ")}
              {names.length > 3 ? " 외" : ""}
            </span>
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

/** 묶음별 개수. 개요 페이지에서 무엇을 내보내는지 한눈에 보인다. */
export function TokenSummary() {
  return (
    <Table head={["묶음", "개수"]}>
      {groups.map((item) => (
        <Row key={item.group}>
          <Cell>{item.title}</Cell>
          <Cell>{item.entries.length}</Cell>
        </Row>
      ))}
    </Table>
  );
}
