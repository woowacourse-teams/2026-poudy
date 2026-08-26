import type { IconId } from "./sprite";

type IconProps = {
  readonly name: IconId;
  /** 가로세로가 같을 때 쓴다. 다를 때는 width 와 height 를 따로 준다. */
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
  /** 가로세로를 따로 주면서도 그림 비율은 지키고 싶을 때 쓴다. */
  readonly preserveRatio?: boolean;
  /** 채움 아이콘으로 쓸지. 저장 완료처럼 상태를 나타낼 때 쓴다. */
  readonly filled?: boolean;
  /** 선 굵기. 작게 그리는 아이콘은 굵게 해야 또렷하다. */
  readonly strokeWidth?: number;
  readonly className?: string;
};

/**
 * 스프라이트의 아이콘을 참조한다.
 * 뜻은 옆의 글자나 버튼 이름이 전하므로 그림 자체는 보조 기술에서 감춘다.
 */
/**
 * 물방울은 테두리까지 path 안에 담겨 있어 선으로 그리지 않는다.
 * 선을 함께 그리면 이미 그려진 테두리 위에 한 겹이 더 얹혀 뭉개진다.
 */
const FILL_ONLY: ReadonlySet<IconId> = new Set(["droplet", "droplet-solid"]);

export function Icon({
  name,
  size = 20,
  width,
  height,
  preserveRatio = false,
  filled = false,
  strokeWidth = 1.5,
  className,
}: IconProps) {
  const fillOnly = FILL_ONLY.has(name);

  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      // 가로세로를 따로 준 경우에만 늘려 채운다. 비율을 지키려면 preserveRatio 를 쓴다.
      preserveAspectRatio={width && height && !preserveRatio ? "none" : undefined}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill={fillOnly || filled ? "currentColor" : "none"}
      stroke={fillOnly ? undefined : "currentColor"}
      strokeWidth={fillOnly ? undefined : strokeWidth}
      strokeLinecap={fillOnly ? undefined : "round"}
      strokeLinejoin={fillOnly ? undefined : "round"}
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
}
