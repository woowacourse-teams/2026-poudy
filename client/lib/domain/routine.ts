/** 루틴 이름의 최대 글자 수. 서버와 같이 앞뒤 공백을 뺀 코드 포인트로 센다. */
export const ROUTINE_NAME_MAX_LENGTH = 25;

/** 루틴 메모의 최대 글자 수. */
export const ROUTINE_MEMO_MAX_LENGTH = 200;

/** 루틴 댓글의 최대 글자 수. */
export const ROUTINE_COMMENT_MAX_LENGTH = 300;

/** 서버가 세는 기준(앞뒤 공백을 뺀 코드 포인트)으로 센 글자 수. 이모지도 한 글자다. */
export const routineTextLength = (value: string): number => Array.from(value.trim()).length;

/** 루틴의 두 구간. 응답의 morning·evening 필드 이름과 같다. */
export type TimeOfDay = "morning" | "evening";

export const TIME_OF_DAY_LABEL = { morning: "아침", evening: "저녁" } as const satisfies Record<TimeOfDay, string>;

export const otherTimeOfDay = (timeOfDay: TimeOfDay): TimeOfDay => {
  if (timeOfDay === "morning") return "evening";
  return "morning";
};

type RoutineProducts = {
  readonly morning: readonly { readonly id: number }[];
  readonly evening: readonly { readonly id: number }[];
};

/** 제품 바꾸기 요청의 본문. 구간마다 바르는 순서대로 제품 ID 를 담는다. */
export type RoutineProductIds = {
  readonly morningProductIds: readonly number[];
  readonly eveningProductIds: readonly number[];
};

const idsOf = (routine: RoutineProducts, timeOfDay: TimeOfDay): readonly number[] =>
  routine[timeOfDay].map((product) => product.id);

const withIds = (routine: RoutineProducts, timeOfDay: TimeOfDay, ids: readonly number[]): RoutineProductIds => {
  if (timeOfDay === "morning") return { morningProductIds: ids, eveningProductIds: idsOf(routine, "evening") };
  return { morningProductIds: idsOf(routine, "morning"), eveningProductIds: ids };
};

/** 구간 끝에 제품을 붙인다. 이미 그 구간에 있는 제품은 붙이지 않는다. */
export const appendedProducts = (
  routine: RoutineProducts,
  timeOfDay: TimeOfDay,
  productIds: readonly number[],
): RoutineProductIds => {
  const current = idsOf(routine, timeOfDay);
  return withIds(routine, timeOfDay, [...current, ...productIds.filter((id) => !current.includes(id))]);
};

/** 구간에서 제품 하나를 뺀다. */
export const removedProduct = (routine: RoutineProducts, timeOfDay: TimeOfDay, productId: number): RoutineProductIds =>
  withIds(
    routine,
    timeOfDay,
    idsOf(routine, timeOfDay).filter((id) => id !== productId),
  );

/** 구간 안에서 한 제품을 다른 자리로 옮긴다. 자리는 0부터 센다. */
export const reorderedProducts = (
  routine: RoutineProducts,
  timeOfDay: TimeOfDay,
  { from, to }: { readonly from: number; readonly to: number },
): RoutineProductIds => {
  const ids = idsOf(routine, timeOfDay);
  const moving = ids[from];
  const rest = ids.filter((_, index) => index !== from);
  return withIds(routine, timeOfDay, [...rest.slice(0, to), moving, ...rest.slice(to)]);
};

/** 다른 구간에 같은 제품이 있는지. 있으면 그 구간으로 옮길 수 없다. */
export const isInOtherTimeOfDay = (routine: RoutineProducts, timeOfDay: TimeOfDay, productId: number): boolean =>
  idsOf(routine, otherTimeOfDay(timeOfDay)).includes(productId);

/** 제품을 다른 구간의 끝으로 옮긴다. */
export const movedProduct = (routine: RoutineProducts, timeOfDay: TimeOfDay, productId: number): RoutineProductIds => {
  const removed = removedProduct(routine, timeOfDay, productId);
  if (timeOfDay === "morning") {
    return { ...removed, eveningProductIds: [...removed.eveningProductIds, productId] };
  }
  return { ...removed, morningProductIds: [...removed.morningProductIds, productId] };
};

/** 사진 판 한 줄의 칸 수. 넘치면 마지막 칸을 '+N'으로 쓴다(명세 j6nApu). */
export const PHOTO_ROW_SLOTS = 4;

/**
 * 사진 판 카드의 한 시간대 줄(명세 j6nApu · S358). 4개 이하면 모두, 5개 이상이면 앞 3개와 남은 개수(more)를 돌려준다.
 * 지금 보고 있는 제품(currentId)이 넷째 이후에 있으면 셋째 칸으로 당겨 와 반드시 보이게 하고, 나머지 순서는 그대로 둔다.
 */
export const photoRow = <T extends { readonly id: number }>(
  products: readonly T[],
  currentId?: number,
): { readonly shown: readonly T[]; readonly more: number } => {
  if (products.length <= PHOTO_ROW_SLOTS) return { shown: products, more: 0 };
  const visible = PHOTO_ROW_SLOTS - 1;
  const current = products.findIndex((product) => product.id === currentId);
  if (current < visible) return { shown: products.slice(0, visible), more: products.length - visible };
  const shown = [...products.slice(0, visible - 1), products[current]];
  return { shown, more: products.length - visible };
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 댓글 시각을 '방금', 'N분 전', 'N시간 전', 'N일 전'으로, 일주일이 넘으면 날짜로 적는다(RT12). 1분 이하는 '방금'이다. */
export const relativeTime = (at: string, now: Date): string => {
  const time = new Date(at);
  const elapsed = now.getTime() - time.getTime();
  if (elapsed <= MINUTE) return "방금";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일 전`;
  const date = `${time.getMonth() + 1}월 ${time.getDate()}일`;
  if (time.getFullYear() === now.getFullYear()) return date;
  return `${time.getFullYear()}년 ${date}`;
};
