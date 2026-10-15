import type { ReactNode } from "react";

/** 화면에 그리는 라벨. 비어 있을 수 있는 값(null·undefined·false)은 라벨이 없는 것으로 본다. */
export type VisibleLabel = Exclude<ReactNode, null | undefined | boolean>;

/**
 * 이름을 받는 자리. 라벨이 반드시 있거나, 비어 있을 수 있으면 aria-labelledby 나 aria-label 을 반드시 함께 넘긴다.
 * 이름이 없는 부품은 낭독기가 무엇인지 알리지 못한다.
 *
 * - label: 보이는 라벨을 그리고 그 글이 이름이 된다.
 * - aria-labelledby · aria-label: 라벨이 비었을 때(null · undefined · false · 빈 문자열)의 이름이다. 라벨이 그려지면 쓰지 않는다.
 *   aria-labelledby 는 화면에 이미 있는 제목(시트 제목 등)을 가리키고, aria-label 은 보이는 제목이 없을 때 쓴다.
 *
 * 라벨이 늘 문자열인데 빈 문자열일 수 있으면 타입이 이를 알 수 없다. 그럴 때도 aria-label 을 함께 넘긴다.
 */
export type NameProps =
  | {
      readonly label: VisibleLabel;
      readonly "aria-label"?: undefined;
      readonly "aria-labelledby"?: undefined;
    }
  | {
      readonly label?: ReactNode;
      /** 라벨이 비었을 때 이름으로 쓸, 화면에 이미 있는 제목의 id. 예: 시트 제목 */
      readonly "aria-labelledby": string;
      readonly "aria-label"?: undefined;
    }
  | {
      readonly label?: ReactNode;
      /** 라벨이 비었을 때의 이름 */
      readonly "aria-label": string;
      readonly "aria-labelledby"?: undefined;
    };

/**
 * 선택지 묶음의 이름. NameProps 에 '선택' 표시와 안내·오류 문구를 더한다. 이 문구들은 라벨이 그려질 때만 보인다.
 * 라벨이 없는 묶음(시트 안 목록 등)에는 문구를 그릴 자리를 두지 않는다.
 */
export type GroupLabelProps = NameProps & {
  /** 고르지 않아도 되는 묶음. 라벨 옆에 '선택'을 붙인다. 기본은 필수다. */
  readonly optional?: boolean;
  readonly hint?: ReactNode;
  /** 보여 줄 오류. 고르는 묶음은 칸을 벗어나는 때가 따로 없어, 화면이 정한 때에 넘긴다. */
  readonly error?: string;
};

/** 그릴 라벨이 있는지. 빈 문자열도 없는 것으로 본다. */
export const hasVisibleLabel = (label: ReactNode): label is VisibleLabel =>
  label !== undefined && label !== null && typeof label !== "boolean" && label !== "";
