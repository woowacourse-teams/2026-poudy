import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import type { IconButtonProps } from "./icon-button";

const meta = {
  title: "버튼/IconButton",
  component: IconButton,
  args: { label: "닫기", icon: <Icon name="x" size={24} /> },
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 상태마다 IconButton 에 더할 props. hover 와 눌림은 usePressable 이 포인터로만 붙이므로 여기서 고정할 수 없다.
 * 명세(BTN · 버튼 상태)에 아이콘 버튼의 처리 중 모양은 없어 busy 는 늘어놓지 않는다.
 */
const STATES = [
  { name: "기본", props: {} },
  { name: "disabled", props: { disabled: true } },
  { name: "aria-disabled", props: { "aria-disabled": true } },
] as const satisfies readonly { name: string; props: Partial<IconButtonProps> }[];

/** size 는 ghost 에만 쓴다. overlay 는 사진 위에, thumbnail-remove 는 썸네일 모서리에 놓이므로 그 자리를 함께 그린다. */
/** reason 은 aria-disabled 버튼이 aria-describedby 로 읽히는 이유 문구다. aria-disabled 는 늘 이유와 함께 쓴다(S06). */
const CASES = [
  {
    id: "ghost-md",
    name: "ghost · md",
    button: { label: "공유", icon: <Icon name="share" size={24} /> },
    reason: "공개 전인 제품은 공유할 수 없어요.",
  },
  {
    id: "ghost-sm",
    name: "ghost · sm",
    button: { size: "sm", label: "설명 보기", icon: <Icon name="info-circle" size={16} /> },
    reason: "설명을 불러오는 중이에요.",
  },
  {
    id: "overlay",
    name: "overlay",
    button: { variant: "overlay", label: "다음 사진", icon: <Icon name="chevron-right" size={20} /> },
    reason: "마지막 사진이에요.",
  },
  {
    id: "thumbnail-remove",
    name: "thumbnail-remove",
    button: { variant: "thumbnail-remove", label: "사진 삭제", icon: <Icon name="x" size={14} /> },
    reason: "올리는 중인 사진은 지울 수 없어요.",
  },
] as const satisfies readonly { id: string; name: string; button: IconButtonProps; reason: string }[];

function Place({ variant, children }: { readonly variant: IconButtonProps["variant"]; readonly children: ReactNode }) {
  if (variant === "overlay") return <div className="rounded-lg bg-surface-inverse p-2">{children}</div>;
  if (variant === "thumbnail-remove") {
    return (
      <div className="relative size-18 rounded-sm bg-surface">
        <div className="absolute -top-2.5 -right-2.5">{children}</div>
      </div>
    );
  }
  return children;
}

/** 변형 × 크기 × 상태를 모두 늘어놓는다. hover 와 눌림은 버튼에 포인터를 올리거나 눌러 본다. */
export const AllCombinations: Story = {
  name: "모든 조합",
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="w-32 shrink-0" />
        {STATES.map((state) => (
          <span key={state.name} className="w-24 text-caption text-text-secondary">
            {state.name}
          </span>
        ))}
      </div>
      {CASES.map(({ id, name, button, reason }) => (
        <div key={id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-caption text-text-secondary">{name}</span>
            {STATES.map((state) => (
              <div key={state.name} className="flex w-24 items-center">
                <Place variant={"variant" in button ? button.variant : undefined}>
                  <IconButton
                    {...button}
                    {...state.props}
                    aria-describedby={"aria-disabled" in state.props ? `reason-${id}` : undefined}
                  />
                </Place>
              </div>
            ))}
          </div>
          <p id={`reason-${id}`} className="pl-34 text-caption text-text-secondary">
            <span aria-hidden="true">aria-disabled 이유: </span>
            {reason}
          </p>
        </div>
      ))}
    </div>
  ),
};

/** 변형과 크기를 Controls 에서 바꿔 본다. */
export const Playground: Story = {};

export const Variants: Story = {
  name: "변형 (ghost · overlay · thumbnail-remove)",
  render: () => (
    <div className="flex items-center gap-4">
      <IconButton label="닫기" icon={<Icon name="x" size={24} />} />
      <IconButton label="공유" icon={<Icon name="share" size={24} />} />
      <div className="rounded-lg bg-surface-inverse p-2">
        <IconButton variant="overlay" label="다음 사진" icon={<Icon name="chevron-right" size={20} />} />
      </div>
      <div className="relative size-18 rounded-sm bg-surface">
        <IconButton
          variant="thumbnail-remove"
          label="사진 삭제"
          icon={<Icon name="x" size={14} />}
          className="absolute -top-2.5 -right-2.5"
        />
      </div>
    </div>
  ),
};
