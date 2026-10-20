import type { Meta, StoryObj } from "@storybook/react-vite";
import { startTransition, useState } from "react";

import { Tab, TabLabel, TabList, TabPanel, Tabs } from "./tabs";

const PARTS = ["1제 토너", "2제 에센스", "3제 크림", "4제 아이크림", "5제 선크림"];
const RAIL = ["스킨케어", "클렌징", "마스크팩", "선케어", "메이크업"];

/*
 * underline 견본은 앱처럼 transitionName 을 넘기고 고르는 변경을 startTransition 으로 감싸, 밑줄이 이전 탭에서 새 탭으로
 * 옮겨 간다(View Transition). Storybook 은 앱과 같은 React canary 로 그린다(.storybook/main.ts).
 */
const meta = {
  title: "탭과 펼침/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Tabs>;

function FixedSample() {
  const [fixedTab, setFixedTab] = useState("ingredient");

  return (
    <Tabs
      value={fixedTab}
      onValueChange={(next) => startTransition(() => setFixedTab(next))}
      transitionName="sample-fixed-tab-indicator"
    >
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
  );
}

function ScrollSample() {
  const [part, setPart] = useState(PARTS[3]!);

  return (
    <Tabs
      value={part}
      onValueChange={(next) => startTransition(() => setPart(next))}
      layout="scroll"
      transitionName="sample-scroll-tab-indicator"
    >
      <TabList
        label="구성품"
        end={
          <button type="button" className="flex h-12 w-11 items-center justify-center text-caption text-text-secondary">
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
  );
}

function RailSample() {
  const [rail, setRail] = useState(RAIL[0]!);

  return (
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
  );
}

export const Fixed: Story = {
  name: "underline · fixed (←→ 로 옮기며 바로 고름)",
  render: () => <FixedSample />,
};

export const Scroll: Story = {
  name: "underline · scroll + 오른쪽 고정 칸 (구성품 탭)",
  render: () => <ScrollSample />,
};

export const Rail: Story = {
  name: "rail (디렉터리 레일, ↑↓)",
  render: () => <RailSample />,
};
