import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { RadioGroup, RadioGroupItem } from "./radio-group";

const SKIN_TYPES = [
  { value: "dry", name: "건성", description: "세안 후 자주 당겨요" },
  { value: "oily", name: "지성", description: "오후면 번들거려요" },
  { value: "combination", name: "복합성", description: "T존만 번들거려요" },
] as const;

const skinImage = (value: string) => <img src={`/images/skin-types/${value}.svg`} alt="" />;

const meta = {
  title: "선택/RadioGroup",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof RadioGroup>;

function ListSample() {
  const [category, setCategory] = useState("all");

  return (
    <RadioGroup aria-label="소분류" variant="list" value={category} onValueChange={setCategory}>
      <RadioGroupItem value="all">전체</RadioGroupItem>
      <RadioGroupItem value="toner">스킨/토너</RadioGroupItem>
      <RadioGroupItem value="serum">에센스/세럼</RadioGroupItem>
      <RadioGroupItem value="cream" disabled>
        크림 (막힘)
      </RadioGroupItem>
    </RadioGroup>
  );
}

function ChoiceSample() {
  const [gender, setGender] = useState<string>();
  const [inquiry, setInquiry] = useState("error");

  return (
    <>
      <RadioGroup label="성별" variant="choice" value={gender} onValueChange={setGender} optional>
        <RadioGroupItem value="female">여성</RadioGroupItem>
        <RadioGroupItem value="male">남성</RadioGroupItem>
      </RadioGroup>
      <RadioGroup label="문의 유형" variant="choice" size="sm" value={inquiry} onValueChange={setInquiry}>
        <RadioGroupItem value="error">오류 신고</RadioGroupItem>
        <RadioGroupItem value="product">제품 등록 요청</RadioGroupItem>
        <RadioGroupItem value="idea">기능 제안</RadioGroupItem>
        <RadioGroupItem value="etc">기타</RadioGroupItem>
      </RadioGroup>
    </>
  );
}

function CardSample() {
  const [skin, setSkin] = useState<string>("dry");

  return (
    <RadioGroup label="피부 타입" variant="card" columns={3} value={skin} onValueChange={setSkin} optional>
      {SKIN_TYPES.map((type) => (
        <RadioGroupItem
          key={type.value}
          value={type.value}
          description={type.description}
          image={skinImage(type.value)}
        >
          {type.name}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}

function CardRowSample() {
  const [age, setAge] = useState("20");

  return (
    <RadioGroup aria-label="나이대" variant="card-row" value={age} onValueChange={setAge}>
      <RadioGroupItem value="10">10대</RadioGroupItem>
      <RadioGroupItem value="20">20대</RadioGroupItem>
      <RadioGroupItem value="combination" description="T존만 번들거려요" image={skinImage("combination")}>
        복합성 (설명 있는 행)
      </RadioGroupItem>
    </RadioGroup>
  );
}

export const List: Story = {
  name: "list (라디오 목록 행)",
  render: () => <ListSample />,
};

export const Choice: Story = {
  name: "choice (선택 버튼 md · sm)",
  render: () => <ChoiceSample />,
};

export const Card: Story = {
  name: "card (선택 카드, 3열)",
  render: () => <CardSample />,
};

export const CardRow: Story = {
  name: "card-row (선택 행)",
  render: () => <CardRowSample />,
};
