import { pick } from "./optional";

/*
 * 화면 글자의 숫자·가격·용량·날짜 표기(명세 CONTENT W03~W06, 코드 인계 W09).
 * 표기 함수는 이 파일 한 곳에만 둔다. 화면 코드는 toLocaleString 이나 문자열 조합을 직접 쓰지 않고
 * 이 함수를 불러 쓴다. 같은 값이 화면마다 다르게 보이면 정보를 믿기 어려워진다.
 */

const NUMBER = new Intl.NumberFormat("ko-KR");

/** 천 단위부터 쉼표를 넣는다. 만·천 단위로 줄여 쓰지 않는다(W03). */
const formatNumber = (value: number): string => NUMBER.format(value);

export type Volume = {
  readonly volumeValue: number;
  readonly volumeUnit: string;
};

/** `32,000원`. 원 표시(₩·KRW)는 쓰지 않는다(W04). */
export const formatPrice = (price: number): string => `${formatNumber(price)}원`;

/** 서버 값이 `mL`·`ML`이어도 `ml`로 보여 준다. g·매는 그대로 둔다(W04). */
export const formatVolumeUnit = (unit: string): string => pick(unit.toLowerCase() === "ml", "ml", unit);

/** `150ml`. 숫자와 단위를 붙여 쓴다(W04). */
export const formatVolume = ({ volumeValue, volumeUnit }: Volume): string =>
  `${formatNumber(volumeValue)}${formatVolumeUnit(volumeUnit)}`;

/**
 * 단위당 가격은 API 에 없어서 계산한다. 표시 전용이며 정렬이나 필터에는 쓰지 않는다.
 * 정렬에 필요해지면 서버에 요청한다.
 */
export const unitPrice = (price: number, { volumeValue }: Volume): number | undefined => {
  if (!Number.isFinite(volumeValue) || volumeValue <= 0) return undefined;
  return Math.round(price / volumeValue);
};

/** `ml당 400원`. 반올림한 정수로 쓰고, 용량을 모르면 없다(W04). `400원/ml`은 쓰지 않는다. */
export const formatUnitPrice = (price: number, volume: Volume): string | undefined => {
  const perUnit = unitPrice(price, volume);
  if (perUnit === undefined) return undefined;
  return `${formatVolumeUnit(volume.volumeUnit)}당 ${formatNumber(perUnit)}원`;
};

/** `200ml · ml당 90원`. 용량을 알 수 없으면 단가를 빼고 보여 준다. */
export const formatVolumeWithUnitPrice = (price: number, volume: Volume): string =>
  [formatVolume(volume), formatUnitPrice(price, volume)]
    .filter((part): part is string => part !== undefined)
    .join(" · ");

/** `472개`(W03). */
export const formatCount = (count: number): string => `${formatNumber(count)}개`;

/** `4 / 350`. 현재와 전체 사이 앞뒤를 한 칸씩 띄운다(W03). */
export const formatProgress = (current: number, total: number): string =>
  `${formatNumber(current)} / ${formatNumber(total)}`;

/** 서버가 시간대 없이 주는 달력 날짜. */
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/*
 * 시각은 서비스 시간대인 Asia/Seoul 로 고정한다(W05). 사용자 기기 시간대를 따르면 서버 렌더와
 * 브라우저, 관리자 화면이 서로 다른 날짜를 보일 수 있다.
 */
const SEOUL = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type DateTimeParts = {
  readonly date: string;
  readonly time: string;
};

const seoulParts = (value: string): DateTimeParts | undefined => {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return undefined;

  const parts = SEOUL.formatToParts(time);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}.${part("month")}.${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};

/**
 * `2026.08.12`. 월·일은 두 자리, 끝에 마침표를 두지 않는다(W05).
 *
 * 날짜만 있는 값(`2026-08-12`)은 Date 로 만들지 않고 문자열을 나눠 쓴다. Date 로 만들면 UTC 자정으로
 * 읽혀 시간대에 따라 하루가 밀릴 수 있다. 시각이 붙은 값은 Asia/Seoul 기준의 날짜를 쓴다.
 * 읽을 수 없는 값은 받은 그대로 돌려준다.
 */
export const formatDate = (value: string): string => {
  const calendar = CALENDAR_DATE.exec(value);
  if (calendar) return `${calendar[1]}.${calendar[2]}.${calendar[3]}`;
  return seoulParts(value)?.date ?? value;
};

/** `2026.08.12 00:30`. Asia/Seoul 기준의 24시간 표기다(W05). 읽을 수 없는 값은 받은 그대로 돌려준다. */
export const formatDateTime = (value: string): string => {
  const parts = seoulParts(value);
  if (!parts) return value;
  return `${parts.date} ${parts.time}`;
};

/** 받침이 있을 때 쓰는 조사와 없을 때 쓰는 조사. */
const JOSA = {
  "을/를": ["을", "를"],
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "과/와": ["과", "와"],
  "으로/로": ["으로", "로"],
} as const;

export type JosaPair = keyof typeof JOSA;

/** 한글 음절의 받침 순서에서 ㄹ의 자리. '으로/로'는 ㄹ 받침 뒤에 '로'를 쓴다. */
const RIEUL = 8;

/** 숫자는 읽는 소리의 받침을 따른다. 영(ㅇ)·일(ㄹ)·삼(ㅁ)·육(ㄱ)·칠(ㄹ)·팔(ㄹ). */
const DIGIT_FINALS: Readonly<Record<string, number>> = { "0": 21, "1": RIEUL, "3": 16, "6": 1, "7": RIEUL, "8": RIEUL };

/** 마지막 글자의 받침 순서. 받침이 없거나 소리를 알 수 없는 글자(영문 등)는 0 이다. */
const finalOf = (word: string): number => {
  const last = word.trimEnd().at(-1) ?? "";
  const code = last.codePointAt(0) ?? 0;

  // 한글 음절은 U+AC00 부터 28 개의 받침이 되풀이된다.
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  return DIGIT_FINALS[last] ?? 0;
};

/** 이름 뒤에 받침에 맞는 조사를 붙인다(W06). `withJosa("판테놀", "을/를")` → `판테놀을` */
export const withJosa = (word: string, pair: JosaPair): string => {
  const [withFinal, withoutFinal] = JOSA[pair];
  const final = finalOf(word);
  const takesFinalForm = final !== 0 && !(pair === "으로/로" && final === RIEUL);
  return `${word}${pick(takesFinalForm, withFinal, withoutFinal)}`;
};
