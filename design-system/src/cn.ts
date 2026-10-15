import { createCn } from "cn/config";

/**
 * 글자 크기 토큰. Tailwind 의 text-* 는 색과 크기를 함께 쓰는 이름이라, 병합기에 알려 주지 않으면
 * text-14 를 색으로 보고 text-text-primary 와 겹친다고 판단해 하나를 지운다.
 * 값은 src/tokens.css 의 --text-* 와 같아야 한다(cn.test.ts 가 확인한다).
 */
export const TEXT_SIZES = [
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "20",
  "24",
  "28",
  "display",
  "hero",
  "screen",
  "block",
  "bar",
  "section",
  "title",
  "body",
  "body-sm",
  "caption",
  "label",
] as const;

/** 그림자 토큰. 기본 이름(sm, md …)이 아니라 병합기에 알려 준다. */
export const SHADOWS = ["raised", "sheet"] as const;

/**
 * 클래스를 이어 붙이고, 같은 속성을 다루는 클래스가 겹치면 뒤의 것을 남긴다.
 * 부품의 기본 클래스 뒤에 쓰는 쪽의 className 을 넘기면 쓰는 쪽이 이긴다.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TEXT_SIZES] }],
      shadow: [{ shadow: [...SHADOWS] }],
    },
  },
});
