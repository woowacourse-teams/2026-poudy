import type { Meta, StoryObj } from "@storybook/react-vite";

import { ForceState } from "../.storybook/force-state";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { Icon } from "./icon";

const meta = {
  title: "버튼/Button",
  component: Button,
  args: { children: "제품 보기" },
  argTypes: {
    leadingIcon: { control: false },
    trailingIcon: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

type Variant = NonNullable<ButtonProps["variant"]>;
type Size = NonNullable<ButtonProps["size"]>;

/** 상태마다 Button 에 더할 props. hover 와 눌림은 usePressable 이 붙이는 속성이라 ForceState 로 고정해 보여 준다. */
const STATES = [
  { name: "기본", props: {} },
  { name: "hover", props: {}, force: "hovered" },
  { name: "눌림", props: {}, force: "pressed" },
  { name: "앞 아이콘", props: { leadingIcon: <Icon name="share" size={16} /> } },
  { name: "뒤 아이콘", props: { trailingIcon: <Icon name="chevron-right" size={16} /> } },
  { name: "disabled", props: { disabled: true } },
  { name: "aria-disabled (이유 안내)", props: { "aria-disabled": true } },
  { name: "busy (처리 중)", props: { busy: true } },
] as const satisfies readonly { name: string; props: Partial<ButtonProps>; force?: "hovered" | "pressed" }[];

/** aria-disabled 는 포커스를 남겨 이유를 읽히려고 쓴다. 그래서 늘 aria-describedby 로 이유 문구를 잇는다(S06). */
const REASON = "필수 항목을 모두 골라 주세요.";

/**
 * outline 과 text 는 크기가 정해져 있어 size 를 받지 않는다.
 * text 는 명세(BTN · 버튼 상태)에 처리 중 모양이 없어 busy 행을 그리지 않는다.
 */
const VARIANTS = [
  { variant: "primary", sizes: ["md", "lg"], busy: true },
  { variant: "secondary", sizes: ["md", "lg"], busy: true },
  { variant: "destructive", sizes: ["md", "lg"], busy: true },
  { variant: "outline", sizes: [], busy: true },
  { variant: "text", sizes: [], busy: false },
] as const satisfies readonly { variant: Variant; sizes: readonly Size[]; busy: boolean }[];

/** 변형 × 크기 × 상태를 모두 늘어놓는다. */
export const AllCombinations: Story = {
  name: "모든 조합",
  render: () => (
    <div className="flex flex-col gap-8">
      {VARIANTS.map(({ variant, sizes, busy }) => (
        <section key={variant} className="flex flex-col gap-3">
          <h2 className="text-section font-bold text-text-primary">{variant}</h2>
          {STATES.filter((state) => busy || !("busy" in state.props)).map((state) =>
            (sizes.length > 0 ? sizes : [undefined]).map((size) => (
              <div key={`${state.name}-${size}`} className="flex items-center gap-4">
                <span className="w-32 shrink-0 text-caption text-text-secondary">
                  {state.name}
                  {size ? ` · ${size}` : ""}
                </span>
                {"aria-disabled" in state.props ? (
                  <div className="flex flex-1 flex-col gap-1">
                    <Button
                      variant={variant}
                      size={size}
                      {...state.props}
                      aria-describedby={`reason-${variant}-${size ?? "fixed"}`}
                    >
                      {variant === "destructive" ? "삭제" : "제품 보기"}
                    </Button>
                    <p id={`reason-${variant}-${size ?? "fixed"}`} className="text-caption text-text-secondary">
                      {REASON}
                    </p>
                  </div>
                ) : "force" in state ? (
                  <ForceState state={state.force}>
                    <Button variant={variant} size={size} {...state.props} className="flex-1">
                      {variant === "destructive" ? "삭제" : "제품 보기"}
                    </Button>
                  </ForceState>
                ) : (
                  <Button variant={variant} size={size} {...state.props} className="flex-1">
                    {variant === "destructive" ? "삭제" : "제품 보기"}
                  </Button>
                )}
              </div>
            )),
          )}
        </section>
      ))}
    </div>
  ),
};

/** 변형과 크기를 Controls 에서 바꿔 본다. */
export const Playground: Story = {};

export const Large: Story = {
  name: "크기 lg (화면 아래 고정 CTA)",
  render: () => (
    <>
      <Button size="lg">다음</Button>
      <Button size="lg" variant="destructive">
        탈퇴하기
      </Button>
      <Button size="lg" aria-disabled="true" aria-describedby="sample-reason">
        다음
      </Button>
      <p id="sample-reason" className="text-caption text-text-secondary">
        필수 항목을 모두 골라 주세요.
      </p>
    </>
  ),
};

export const Medium: Story = {
  name: "크기 md (본문·시트)",
  render: () => (
    <>
      <Button>제품 보기</Button>
      <Button variant="secondary">초기화</Button>
      <Button variant="destructive">삭제</Button>
      <Button trailingIcon={<Icon name="chevron-right" size={16} />}>더 보기</Button>
      <Button variant="secondary" leadingIcon={<Icon name="share" size={16} />}>
        공유하기
      </Button>
      <Button disabled>저장</Button>
      <Button busy>저장하는 중</Button>
    </>
  ),
};

export const Outline: Story = {
  name: "outline (목록 행 오른쪽 보조 행동)",
  render: () => (
    <div className="flex gap-2">
      <Button variant="outline">추가</Button>
      <Button variant="outline">평가하기</Button>
    </div>
  ),
};

export const Ghost: Story = {
  name: "ghost (카드·목록 안의 보조 행동)",
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant="ghost">관리</Button>
        <Button variant="ghost" trailingIcon={<Icon name="chevron-right" size={14} />}>
          선반 보기
        </Button>
      </div>
      {/* 회색 면 위에서는 한 단계 진한 면으로 hover·눌림을 그린다. */}
      <div className="flex gap-2 rounded-xl bg-surface p-4">
        <Button variant="ghost-on-surface" trailingIcon={<Icon name="chevron-right" size={14} />}>
          로그인
        </Button>
      </div>
    </div>
  ),
};

export const Text: Story = {
  name: "text (행 전체가 누르는 글자 버튼)",
  render: () => (
    <Button variant="text" trailingIcon={<Icon name="chevron-right" size={16} className="text-text-secondary" />}>
      문의하기
    </Button>
  ),
};
