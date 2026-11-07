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

/** 카드의 제품 사진 한 칸(32)과 사이 간격(6). */
const THUMBNAIL = 32;
const THUMBNAIL_GAP = 6;
/** 넘칠 때 붙는 '외 NN개' 자리. 앞 간격까지 넉넉히 잡는다. */
const MORE_LABEL = 52;
/** 폭을 재기 전에 보이는 사진 수. 가장 좁은 화면(320)에도 '외 N개'와 함께 들어가는 수다. */
const UNMEASURED_THUMBNAILS = 3;

/** 주어진 폭에 들어가는 제품 사진 수. 다 들어가면 전부, 넘치면 '외 N개' 자리를 남기고 적어도 한 장은 보인다. */
export const visibleThumbnailCount = (width: number | null, total: number): number => {
  if (width === null) return Math.min(total, UNMEASURED_THUMBNAILS);
  const fitAll = Math.floor((width + THUMBNAIL_GAP) / (THUMBNAIL + THUMBNAIL_GAP));
  if (total <= fitAll) return total;
  return Math.max(1, Math.floor((width - MORE_LABEL + THUMBNAIL_GAP) / (THUMBNAIL + THUMBNAIL_GAP)));
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
