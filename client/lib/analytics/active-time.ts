/**
 * 상세 화면을 실제로 들여다본 시간을 잰다.
 * 탭이 보이고, 창에 포커스가 있고, 마지막 입력 뒤 60초가 지나지 않았을 때만 시간을 더한다.
 *
 * 시계를 밖에서 받아 브라우저 없이 시험할 수 있게 둔다. DOM 연결은 TrackActiveTime 이 맡는다.
 */

export const IDLE_TIMEOUT_MS = 60_000;

export type ActiveTimeSnapshot = {
  readonly active_seconds: number;
  readonly elapsed_seconds: number;
  readonly max_scroll_percentage: number;
};

export type ActiveTimeMeter = {
  readonly setVisible: (visible: boolean) => void;
  readonly setFocused: (focused: boolean) => void;
  /** 누르기·스크롤·키 입력처럼 사람이 화면을 다룬 흔적. */
  readonly input: () => void;
  readonly scroll: (percentage: number) => void;
  /** 직전에 가져간 뒤로 늘어난 활성 시간을 꺼낸다. 늘어난 게 1초 미만이면 undefined 를 돌려준다. */
  readonly take: () => ActiveTimeSnapshot | undefined;
};

type MeterState = {
  readonly now: () => number;
  readonly startedAt: number;
  visible: boolean;
  focused: boolean;
  lastInputAt: number;
  settledAt: number;
  activeMs: number;
  takenMs: number;
  maxScroll: number;
};

/** 직전 정산 시점부터 지금까지 활성 조건을 만족한 구간만 더한다. 상태를 바꾸기 전에 먼저 부른다. */
const settle = (state: MeterState) => {
  const current = state.now();
  if (state.visible && state.focused) {
    const activeUntil = Math.min(current, state.lastInputAt + IDLE_TIMEOUT_MS);
    if (activeUntil > state.settledAt) state.activeMs += activeUntil - state.settledAt;
  }
  state.settledAt = current;
};

const take = (state: MeterState): ActiveTimeSnapshot | undefined => {
  settle(state);
  // 초 단위로 끊어 보내고 남은 1초 미만은 다음 전송으로 넘긴다. 합산해도 한 번씩만 센다.
  const seconds = Math.floor((state.activeMs - state.takenMs) / 1000);
  if (seconds < 1) return undefined;
  state.takenMs += seconds * 1000;
  return {
    active_seconds: seconds,
    elapsed_seconds: Math.floor((state.settledAt - state.startedAt) / 1000),
    max_scroll_percentage: state.maxScroll,
  };
};

type MeterOptions = {
  readonly now: () => number;
  readonly visible: boolean;
  readonly focused: boolean;
};

const initialState = ({ now, visible, focused }: MeterOptions): MeterState => {
  const startedAt = now();
  // 링크를 눌러 들어온 것도 입력으로 본다. 들어오자마자 읽기만 하는 시간을 버리지 않는다.
  return {
    now,
    startedAt,
    visible,
    focused,
    lastInputAt: startedAt,
    settledAt: startedAt,
    activeMs: 0,
    takenMs: 0,
    maxScroll: 0,
  };
};

export const createActiveTimeMeter = (options: MeterOptions): ActiveTimeMeter => {
  const state = initialState(options);

  return {
    setVisible: (next) => {
      settle(state);
      state.visible = next;
    },
    setFocused: (next) => {
      settle(state);
      state.focused = next;
    },
    input: () => {
      settle(state);
      state.lastInputAt = state.settledAt;
    },
    scroll: (percentage) => {
      state.maxScroll = Math.max(state.maxScroll, Math.min(100, Math.max(0, Math.round(percentage))));
    },
    take: () => take(state),
  };
};
