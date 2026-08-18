import type { IconId } from "./sprite";

type IconProps = {
  readonly name: IconId;
  readonly size?: number;
  /** 채움 아이콘으로 쓸지. 저장 완료처럼 상태를 나타낼 때 쓴다. */
  readonly filled?: boolean;
  readonly className?: string;
};

/**
 * 스프라이트의 아이콘을 참조한다.
 * 뜻은 옆의 글자나 버튼 이름이 전하므로 그림 자체는 보조 기술에서 감춘다.
 */
export function Icon({ name, size = 20, filled = false, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
}
