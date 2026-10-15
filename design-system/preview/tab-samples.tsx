import { useState } from "react";

import { Disclosure, DisclosureContent, DisclosureGroup, DisclosureIcon, DisclosureTrigger } from "../src/disclosure";
import { TabNav, TabNavItem } from "../src/tab-nav";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "../src/tabs";
import { Section } from "./section";

const PARTS = ["1제 토너", "2제 에센스", "3제 크림", "4제 아이크림", "5제 선크림"];
const RAIL = ["스킨케어", "클렌징", "마스크팩", "선케어", "메이크업"];
const CATEGORIES = { 스킨케어: ["스킨/토너", "에센스/세럼", "크림"], 클렌징: ["폼", "오일", "워터"] } as const;
const FAQ = [
  ["선반은 무엇인가요?", "써 본 제품을 모아 두고 잘 맞았는지 기록하는 곳이에요."],
  ["평가는 누가 볼 수 있나요?", "나만 볼 수 있어요. 다른 사람에게는 보이지 않아요."],
] as const;

/** 탭과 펼침 묶음(TabNav · Tabs · Disclosure · DisclosureGroup) 견본 */
export function TabSamples() {
  const [mode, setMode] = useState("product");
  const [fixedTab, setFixedTab] = useState("ingredient");
  const [part, setPart] = useState(PARTS[3]!);
  const [rail, setRail] = useState(RAIL[0]!);

  return (
    <>
      <Section title="TabNav (링크 탭, 견본은 <a> 로 흉내)">
        <TabNav aria-label="탐색 방식">
          {[
            ["product", "제품명 검색"],
            ["ingredient", "성분 필터링"],
          ].map(([value, label]) => (
            <TabNavItem key={value} current={mode === value}>
              <a
                href={`?mode=${value}`}
                onClick={(event) => {
                  event.preventDefault();
                  setMode(value!);
                }}
              >
                {label}
              </a>
            </TabNavItem>
          ))}
        </TabNav>
      </Section>

      <Section title="Tabs · underline · fixed (←→ 로 옮기며 바로 고름)">
        <Tabs value={fixedTab} onValueChange={setFixedTab}>
          <TabList label="정보">
            <Tab value="ingredient">성분</Tab>
            <Tab value="review">사용 후기</Tab>
            <Tab value="similar">유사 제품</Tab>
          </TabList>
          <TabPanel value="ingredient" className="py-3 text-body text-text-body">
            성분 패널
          </TabPanel>
          <TabPanel value="review" className="py-3 text-body text-text-body">
            사용 후기 패널
          </TabPanel>
          <TabPanel value="similar" className="py-3 text-body text-text-body">
            유사 제품 패널
          </TabPanel>
        </Tabs>
      </Section>

      <Section title="Tabs · underline · scroll + 오른쪽 고정 칸 (구성품 탭)">
        <Tabs value={part} onValueChange={setPart} layout="scroll">
          <TabList
            label="구성품"
            end={
              <button
                type="button"
                className="flex h-12 w-11 items-center justify-center text-caption text-text-secondary"
              >
                전체
              </button>
            }
          >
            {PARTS.map((name) => {
              const [order, label] = name.split(" ");
              return (
                <Tab key={name} value={name}>
                  <span className="text-caption font-semibold text-text-secondary">{order}</span>
                  <TabLabel>{label}</TabLabel>
                </Tab>
              );
            })}
          </TabList>
          <TabPanel value={part} className="py-3 text-body text-text-body">
            {part} 성분
          </TabPanel>
        </Tabs>
      </Section>

      <Section title="Tabs · rail (디렉터리 레일, ↑↓)">
        <Tabs value={rail} onValueChange={setRail} variant="rail">
          <div className="flex h-72 overflow-hidden rounded-md border border-border">
            <TabList label="대분류" className="w-29 shrink-0">
              {RAIL.map((name) => (
                <Tab key={name} value={name}>
                  {name}
                </Tab>
              ))}
            </TabList>
            <TabPanel value={rail} className="flex-1 p-4 text-body text-text-body">
              {rail} 소분류
            </TabPanel>
          </div>
        </Tabs>
      </Section>

      <Section title="DisclosureGroup · single (카테고리 시트 대분류)">
        <DisclosureGroup type="single" defaultValue="스킨케어">
          {Object.entries(CATEGORIES).map(([group, items]) => (
            <Disclosure key={group} value={group}>
              <DisclosureTrigger>
                <button
                  type="button"
                  className="fb-surface flex h-12 w-full items-center justify-between rounded-md px-3 text-title font-semibold text-text-primary data-[state=open]:bg-surface"
                >
                  {group}
                  <DisclosureIcon />
                </button>
              </DisclosureTrigger>
              <DisclosureContent className="flex flex-col px-3 py-1">
                {items.map((item) => (
                  <span key={item} className="flex h-11 items-center text-body text-text-body">
                    {item}
                  </span>
                ))}
              </DisclosureContent>
            </Disclosure>
          ))}
        </DisclosureGroup>
      </Section>

      <Section title="DisclosureGroup · multiple (자주 묻는 질문)">
        <DisclosureGroup type="multiple">
          {FAQ.map(([question, answer]) => (
            <Disclosure key={question} value={question}>
              <DisclosureTrigger>
                <button
                  type="button"
                  className="fb-surface flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-title font-semibold text-text-primary"
                >
                  {question}
                  <DisclosureIcon />
                </button>
              </DisclosureTrigger>
              <DisclosureContent className="pb-3 text-body leading-relaxed text-text-secondary">
                {answer}
              </DisclosureContent>
            </Disclosure>
          ))}
        </DisclosureGroup>
      </Section>
    </>
  );
}
