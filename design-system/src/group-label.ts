import type { ReactNode } from "react";

type NoVisibleLabel = {
  readonly label?: undefined;
  readonly optional?: undefined;
  readonly hint?: undefined;
  readonly error?: undefined;
};

/**
 * 선택지 묶음의 이름. 셋 가운데 하나를 반드시 넘긴다. 이름이 없는 묶음은 낭독기가 무엇을 고르는지 알리지 못한다.
 *
 * - label: 라벨(14/700)과 안내·오류 문구 자리를 함께 그린다(폼 안의 묶음).
 * - aria-labelledby: 화면에 이미 있는 제목을 이름으로 쓴다(시트 제목이 이름인 목록).
 * - aria-label: 보이는 제목이 없을 때 이름만 준다.
 */
export type GroupLabelProps =
  | {
      /** 묶음의 이름. 라벨(14/700)과 안내·오류 문구 자리를 함께 그린다. */
      readonly label: ReactNode;
      /** 고르지 않아도 되는 묶음. 라벨 옆에 '선택'을 붙인다. 기본은 필수다. */
      readonly optional?: boolean;
      readonly hint?: ReactNode;
      /** 보여 줄 오류. 고르는 묶음은 칸을 벗어나는 때가 따로 없어, 화면이 정한 때에 넘긴다. */
      readonly error?: string;
      readonly "aria-label"?: undefined;
      readonly "aria-labelledby"?: undefined;
    }
  | (NoVisibleLabel & {
      /** 화면에 이미 있는 제목의 id. 예: 시트 제목 */
      readonly "aria-labelledby": string;
      readonly "aria-label"?: undefined;
    })
  | (NoVisibleLabel & {
      /** 보이는 제목이 없을 때의 이름 */
      readonly "aria-label": string;
      readonly "aria-labelledby"?: undefined;
    });
