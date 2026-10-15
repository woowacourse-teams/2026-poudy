import { useState } from "react";

import { Combobox, ComboboxGroup, ComboboxInput, ComboboxList, ComboboxOption } from "../src/combobox";
import type { FieldRule } from "../src/field-rule";
import { SearchField } from "../src/search-field";
import { Select } from "../src/select";
import { TextArea } from "../src/text-area";
import { TextField } from "../src/text-field";
import { Section } from "./section";

const productNameRule: FieldRule = {
  validate: (value) => (value.trim().length < 2 ? "제품명을 2자 이상 적어 주세요." : undefined),
};

const nicknameRule: FieldRule = {
  validate: (value) => (value.includes(" ") ? "띄어쓰기 없이 적어 주세요." : undefined),
  validateOn: "change",
  debounceMs: 500,
};

const contentRule: FieldRule = {
  validate: (value) => (value.trim().length === 0 ? "문의 내용을 적어 주세요." : undefined),
};

const PRODUCTS = [
  "독도 토너",
  "독도 로션",
  "독도 클렌저",
  "자작나무 수분 크림",
  "약콩 영양 크림",
  "1025 독도 토너 패드",
];

/** 입력 묶음(TextField · TextArea · Select · SearchField · Combobox) 견본 */
export function InputSamples() {
  const [productName, setProductName] = useState("");
  const [nickname, setNickname] = useState("");
  const [filled, setFilled] = useState("1025 독도 토너");
  const [content, setContent] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>();

  const results = query.trim() ? PRODUCTS.filter((name) => name.includes(query.trim())) : [];

  return (
    <>
      <Section title="TextField">
        <TextField
          label="제품명"
          value={productName}
          onChange={setProductName}
          placeholder="입력해 주세요"
          hint="용량이나 버전이 있다면 함께 적어 주세요."
          rule={productNameRule}
        />
        <TextField label="값이 있는 칸" value={filled} onChange={setFilled} placeholder="입력해 주세요" />
        <TextField
          label="닉네임 (입력이 멈추면 검사)"
          value={nickname}
          onChange={setNickname}
          placeholder="입력해 주세요"
          optional
          rule={nicknameRule}
        />
        <TextField
          label="서버 오류"
          value="중복된 이름"
          onChange={() => undefined}
          serverError="이미 등록된 제품이에요."
        />
        <TextField label="비활성" value="" onChange={() => undefined} placeholder="입력할 수 없어요" disabled />
      </Section>

      <Section title="TextArea">
        <TextArea
          label="문의 내용"
          value={content}
          onChange={setContent}
          placeholder={"예를 들어 어느 화면에서 무엇을 누르셨는지\n적어 주시면 도움이 돼요."}
          maxLength={2000}
          rule={contentRule}
        />
      </Section>

      <Section title="Select">
        <Select
          label="브랜드"
          optional
          placeholder="선택해 주세요"
          expanded={brandOpen}
          onOpen={() => setBrandOpen((open) => !open)}
          hint="누르면 시트가 열린 것처럼 '입력 중' 모양이 된다(견본은 다시 누르면 닫힘)."
        />
        <Select
          label="고른 값"
          value="라운드랩"
          placeholder="선택해 주세요"
          expanded={false}
          onOpen={() => undefined}
        />
        <Select
          label="오류"
          placeholder="선택해 주세요"
          expanded={false}
          onOpen={() => undefined}
          error="브랜드를 골라 주세요."
        />
        <Select label="비활성" placeholder="선택해 주세요" expanded={false} onOpen={() => undefined} disabled />
      </Section>

      <Section title="SearchField">
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="제품명 검색"
          placeholder="브랜드 또는 제품명을 입력해 주세요"
        />
        <SearchField value="독도" onChange={() => undefined} label="값이 있는 검색" placeholder="" />
      </Section>

      <Section title="Combobox (↓·↑ 이동, Enter 고르기, Esc 닫기)">
        <Combobox
          value={query}
          onChange={setQuery}
          open={results.length > 0}
          status={query.trim() ? `${query.trim()} 결과 ${results.length}개` : undefined}
        >
          <ComboboxInput
            label="제품명 검색"
            placeholder="'독도'를 입력해 보세요"
            onSubmit={() => setPicked(`'${query}' 검색`)}
          />
          <ComboboxList label="제품 자동완성" className="pt-1 pb-4">
            <ComboboxOption onSelect={() => setPicked(`'${query}' 검색`)}>
              <span className="flex h-12 items-center border-b border-border px-1 text-body font-bold text-text-primary">
                ‘{query.trim()}’가 포함된 제품 검색
              </span>
            </ComboboxOption>
            <ComboboxGroup
              label={<span className="block px-1 pt-6 pb-1 text-caption text-text-secondary">제품 바로가기</span>}
            >
              {results.map((name) => (
                <ComboboxOption key={name} onSelect={() => setPicked(name)}>
                  <span className="flex h-12 items-center px-1 text-body text-text-primary">{name}</span>
                </ComboboxOption>
              ))}
            </ComboboxGroup>
          </ComboboxList>
        </Combobox>
        <p className="text-caption text-text-secondary">고른 제품: {picked ?? "없음"}</p>
      </Section>
    </>
  );
}
