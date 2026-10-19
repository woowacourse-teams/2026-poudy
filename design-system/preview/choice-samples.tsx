import { useState } from "react";

import { Button } from "../src/button";
import { CheckboxGroup, CheckboxGroupItem } from "../src/checkbox-group";
import { RadioGroup, RadioGroupItem } from "../src/radio-group";
import { RangeSlider } from "../src/range-slider";
import { Slider } from "../src/slider";
import { Section } from "./section";

const SKIN_TYPES = [
  { value: "dry", name: "건성", description: "세안 후 자주 당겨요" },
  { value: "oily", name: "지성", description: "오후면 번들거려요" },
  { value: "combination", name: "복합성", description: "T존만 번들거려요" },
] as const;

const skinImage = (value: string) => <img src={`/images/skin-types/${value}.svg`} alt="" />;

/** 선택 묶음(RadioGroup · CheckboxGroup · RangeSlider · Slider) 견본 */
export function ChoiceSamples() {
  const [category, setCategory] = useState("all");
  const [gender, setGender] = useState<string>();
  const [inquiry, setInquiry] = useState("error");
  const [skin, setSkin] = useState<string>("dry");
  const [age, setAge] = useState("20");
  const [reasons, setReasons] = useState<readonly string[]>(["rarely"]);
  const [ingredients, setIngredients] = useState<readonly string[]>(["alcohol", "fragrance"]);
  const [moisture, setMoisture] = useState<readonly [number, number]>([1, 3]);
  const [oil, setOil] = useState<readonly [number, number]>([2, 2]);
  const [any, setAny] = useState(true);
  const [rating, setRating] = useState(2.5);
  const [oilRating, setOilRating] = useState<number | null>(null);

  return (
    <>
      <Section title="RadioGroup · list (라디오 목록 행)">
        <RadioGroup aria-label="소분류" variant="list" value={category} onValueChange={setCategory}>
          <RadioGroupItem value="all">전체</RadioGroupItem>
          <RadioGroupItem value="toner">스킨/토너</RadioGroupItem>
          <RadioGroupItem value="serum">에센스/세럼</RadioGroupItem>
          <RadioGroupItem value="cream" disabled>
            크림 (막힘)
          </RadioGroupItem>
        </RadioGroup>
      </Section>

      <Section title="RadioGroup · choice (선택 버튼 md · sm)">
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
      </Section>

      <Section title="RadioGroup · card (선택 카드, 3열)">
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
      </Section>

      <Section title="RadioGroup · card-row (선택 행)">
        <RadioGroup aria-label="나이대" variant="card-row" value={age} onValueChange={setAge}>
          <RadioGroupItem value="10">10대</RadioGroupItem>
          <RadioGroupItem value="20">20대</RadioGroupItem>
          <RadioGroupItem value="combination" description="T존만 번들거려요" image={skinImage("combination")}>
            복합성 (설명 있는 행)
          </RadioGroupItem>
        </RadioGroup>
      </Section>

      <Section title="CheckboxGroup">
        <CheckboxGroup label="탈퇴 이유" optional value={reasons} onValueChange={setReasons}>
          <CheckboxGroupItem value="rarely">자주 쓰지 않아요</CheckboxGroupItem>
          <CheckboxGroupItem value="missing">찾는 제품이 없어요</CheckboxGroupItem>
          <CheckboxGroupItem value="etc">기타</CheckboxGroupItem>
        </CheckboxGroup>
        <CheckboxGroup
          aria-label="빠른 제외 필터에 넣을 성분"
          divided
          value={ingredients}
          onValueChange={setIngredients}
        >
          <CheckboxGroupItem value="alcohol" description="제품 2개에 있음">
            알코올
          </CheckboxGroupItem>
          <CheckboxGroupItem value="limonene" description="제품 3개에 있음">
            리모넨
          </CheckboxGroupItem>
          <CheckboxGroupItem value="fragrance" description="이미 필터에 있음" disabled>
            향료 (막힘)
          </CheckboxGroupItem>
        </CheckboxGroup>
      </Section>

      <Section title="RangeSlider (머리줄은 화면이 그림)">
        <RangeSlider
          label="수분감"
          steps={["없음", "낮음", "보통", "높음"]}
          value={moisture}
          onValueChange={setMoisture}
          tone="moisture"
        />
        <RangeSlider
          label="유분감 (겹침)"
          steps={["없음", "낮음", "보통", "높음"]}
          value={oil}
          onValueChange={setOil}
          tone="oil"
        />
        <label className="flex items-center gap-2 text-body text-text-primary">
          <input type="checkbox" checked={any} onChange={(event) => setAny(event.target.checked)} />
          상관없음 (견본용 스위치)
        </label>
        <RangeSlider
          label="수분감 (막힘)"
          steps={["없음", "낮음", "보통", "높음"]}
          value={moisture}
          onValueChange={setMoisture}
          tone="moisture"
          disabled={any}
        />
      </Section>

      <Section title="Slider (유수분 평가)">
        <Slider
          label="수분감"
          value={rating}
          onValueChange={setRating}
          tone="moisture"
          startLabel="건조해요"
          endLabel="촉촉해요"
        />
      </Section>

      <Section title="Slider · 선택 전 (value=null, 누르거나 방향키로 고름)">
        <Slider
          label="유분감"
          value={oilRating}
          onValueChange={setOilRating}
          tone="oil"
          startLabel="산뜻해요"
          endLabel="번들거려요"
        />
        <Button variant="text" className="self-start" onClick={() => setOilRating(null)}>
          선택 전으로 되돌리기 (견본용)
        </Button>
      </Section>
    </>
  );
}
