/**
 * @vitest-environment jsdom
 *
 * 이름이 없는 부품은 낭독기가 무엇인지 알리지 못한다. 라벨이 비면 aria-label 이나 aria-labelledby 를 받아야 하고, 둘 다
 * 없으면 컴파일 단계에서 막히는지 확인한다. 실제로 막히지 않으면 @ts-expect-error 가 쓰이지 않아 타입 검사가 실패한다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { CheckboxGroup } from "./checkbox-group";
import { ComboboxGroup } from "./combobox";
import { RadioGroup } from "./radio-group";
import { Select } from "./select";
import { TextArea } from "./text-area";
import { TextField } from "./text-field";

const noop = () => undefined;

describe("이름을 받는 자리", () => {
  it("라벨이 비면 다른 이름 없이는 쓸 수 없다", () => {
    const cases = [
      // @ts-expect-error 글자 없는 Button. 아이콘만 두는 버튼은 IconButton 을 쓴다.
      <Button key="button" />,
      // @ts-expect-error 라벨이 undefined 이고 다른 이름도 없음
      <TextField key="field" label={undefined} value="" onChange={noop} />,
      // @ts-expect-error 라벨이 null 이고 다른 이름도 없음
      <TextArea key="area" label={null} value="" onChange={noop} />,
      // @ts-expect-error 라벨이 undefined 이고 다른 이름도 없음
      <Select key="select" label={undefined} placeholder="" expanded={false} onOpen={noop} />,
      // @ts-expect-error 머리가 null
      <ComboboxGroup key="group" label={null}>
        {null}
      </ComboboxGroup>,
      // @ts-expect-error 묶음 라벨이 null 이고 다른 이름도 없음
      <RadioGroup key="radio" label={null} variant="list" value={undefined} onValueChange={noop}>
        {null}
      </RadioGroup>,
      // @ts-expect-error 묶음 라벨이 undefined 이고 다른 이름도 없음
      <CheckboxGroup key="check" label={undefined} value={[]} onValueChange={noop}>
        {null}
      </CheckboxGroup>,
    ];

    expect(cases).toHaveLength(7);
  });

  it("라벨이 비어 있으면 aria-label 이나 aria-labelledby 가 이름이 된다", () => {
    const showLabel = false;
    render(
      <>
        <h2 id="sheet-title">카테고리</h2>
        <TextField label={showLabel ? "제품명" : null} aria-label="제품명" value="" onChange={noop} />
        <TextArea label={null} aria-labelledby="sheet-title" value="" onChange={noop} />
        <Select label={null} aria-label="브랜드" value="라운드랩" placeholder="" expanded={false} onOpen={noop} />
        <RadioGroup label={null} aria-labelledby="sheet-title" variant="list" value={undefined} onValueChange={noop}>
          {null}
        </RadioGroup>
      </>,
    );

    expect(screen.getByRole("textbox", { name: "제품명" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "카테고리" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "브랜드 라운드랩" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "카테고리" })).toBeInTheDocument();
  });
});
