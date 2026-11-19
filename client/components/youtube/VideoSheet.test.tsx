/** @vitest-environment jsdom */
import type { YouTubeVideoResponse } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { videoMentionLines } from "./VideoMentions";
import { MANUAL_SCROLL_HOLD_MS, PLAYER_POLL_MS, playingLineIndex, VideoSheet } from "./VideoSheet";

import { PLAYER_PLAYING, type YouTubePlayer } from "@/lib/youtube-player";

const mention = {
  productImageUrl: null,
  endMs: null,
  recommendationCondition: null,
  ordinal: 1,
  productId: 1,
  productName: "첫 제품",
  brandName: "브랜드",
  spokenName: "발언명",
  startMs: 48000,
  summary: "첫 언급",
  recommendation: "recommended",
  videoRecommendation: "recommended",
  recommendedVideoCount: 1,
};
const video = {
  id: "abcdefghij1",
  thumbnailUrl: null,
  viewCount: null,
  channelId: "channel",
  channelName: "테스트 유튜버",
  title: "영상",
  description: "",
  durationMs: 600000,
  publishedAt: "2026-11-01T00:00:00Z",
  mentions: [
    mention,
    { ...mention, ordinal: 2, productId: 2, productName: "둘째 제품", startMs: 125500, summary: "둘째 언급" },
    { ...mention, ordinal: 3, productId: 3, productName: "셋째 제품", startMs: 352000, summary: "셋째 언급" },
  ],
} satisfies YouTubeVideoResponse;

/** 시각 칩 글자(0:48 등)로 그 줄이 재생 중인지 읽는다. */
const pressed = () =>
  within(screen.getByRole("list", { name: "이 영상의 언급" }))
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.querySelector("time")?.textContent);

/** IFrame Player API 를 흉내 낸다. 테스트가 재생 시각과 상태를 바꾼다. */
const fakePlayer = () => {
  const state = {
    seconds: 0,
    reads: 0,
    onStateChange: undefined as ((event: { target: YouTubePlayer; data?: unknown }) => void) | undefined,
  };
  const target: YouTubePlayer = {
    getCurrentTime: () => {
      state.reads += 1;
      return state.seconds;
    },
  };
  window.YT = {
    Player: class {
      constructor(
        _element: HTMLIFrameElement,
        options: { events: { onStateChange?: (event: { target: YouTubePlayer; data?: unknown }) => void } },
      ) {
        state.onStateChange = options.events.onStateChange;
      }
      getCurrentTime = target.getCurrentTime;
    },
  };
  return {
    seek: (seconds: number) => {
      state.seconds = seconds;
    },
    change: (data: number) => act(() => state.onStateChange?.({ target, data })),
    reads: () => state.reads,
  };
};

const open = (startMs: number, activeMs?: number) =>
  render(
    <VideoSheet
      video={video}
      startMs={startMs}
      activeMs={activeMs}
      onPlay={vi.fn()}
      onExternalLink={vi.fn()}
      onClose={vi.fn()}
    />,
  );

/** API 를 받는 약속이 풀리고 플레이어가 붙을 때까지 기다린다. */
const attach = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  delete window.YT;
});

describe("재생 중 줄 고르기", () => {
  const lines = videoMentionLines(video);

  it("시작 시각이 지금 시각 이하인 줄 가운데 가장 늦은 줄이고, 첫 언급 전이면 없다", () => {
    expect(playingLineIndex(lines, 0)).toBe(-1);
    expect(playingLineIndex(lines, 47999)).toBe(-1);
    expect(playingLineIndex(lines, 48000)).toBe(0);
    expect(playingLineIndex(lines, 124000)).toBe(0);
    expect(playingLineIndex(lines, 352000)).toBe(2);
    expect(playingLineIndex(lines, 600000)).toBe(2);
  });

  it("플레이어는 초 단위로 시작하므로 언급 시각도 초 아래를 버리고 비교한다", () => {
    // 2:05.5 를 누르면 플레이어는 start=125 로 2:05.0 부터 튼다. 그때도 그 줄이 재생 중이다.
    expect(playingLineIndex(lines, 125000)).toBe(1);
  });
});

describe("재생 시트의 재생 중 표시", () => {
  it("플레이어의 재생 시각을 따라 재생 중 줄을 옮기고, 직접 옮긴 시각도 따른다", async () => {
    const player = fakePlayer();
    open(48000, 48000);
    await attach();
    expect(pressed()).toEqual(["0:48"]);

    player.seek(130);
    player.change(PLAYER_PLAYING);
    expect(pressed()).toEqual(["2:05"]);

    // 재생 중에는 PLAYER_POLL_MS 마다 시각을 읽는다.
    player.seek(352.4);
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS));
    expect(pressed()).toEqual(["5:52"]);

    // 플레이어에서 앞으로 되감으면 그 시각의 줄로 돌아간다.
    player.seek(60);
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS));
    expect(pressed()).toEqual(["0:48"]);

    // 첫 언급보다 앞이면 어느 줄도 재생 중이 아니다.
    player.seek(10);
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS));
    expect(pressed()).toEqual([]);
  });

  it("멈추면 시각을 읽지 않고, 멈춘 채로 옮긴 시각은 상태가 바뀔 때 한 번 읽는다", async () => {
    const player = fakePlayer();
    open(0);
    await attach();
    expect(pressed()).toEqual([]);

    player.seek(50);
    player.change(2);
    expect(pressed()).toEqual(["0:48"]);

    player.seek(130);
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS * 4));
    expect(pressed()).toEqual(["0:48"]);

    player.change(3);
    expect(pressed()).toEqual(["2:05"]);
  });

  it("시트를 닫으면 시각 읽기를 멈춘다", async () => {
    const player = fakePlayer();
    const { rerender } = open(0);
    await attach();
    player.change(PLAYER_PLAYING);
    const before = player.reads();
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS));
    expect(player.reads()).toBe(before + 1);
    rerender(
      <VideoSheet
        video={undefined}
        startMs={0}
        activeMs={undefined}
        onPlay={vi.fn()}
        onExternalLink={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const reads = player.reads();
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS * 4));
    expect(player.reads()).toBe(reads);
  });

  it("API 를 받지 못해도 누른 줄을 재생 중으로 보인다", () => {
    open(125500, 125500);
    expect(pressed()).toEqual(["2:05"]);
  });

  it("재생 중 줄이 목록 밖으로 나가면 그 줄이 보이게 목록을 옮기고, 사용자가 목록을 움직인 뒤에는 옮기지 않는다", async () => {
    const player = fakePlayer();
    open(48000, 48000);
    await attach();
    const list = screen.getByRole("list", { name: "이 영상의 언급" });
    const body = list.closest<HTMLElement>("[data-sheet-body]");
    if (!body) throw new Error("시트 본문이 없다");
    const scrollTo = vi.fn();
    body.scrollTo = scrollTo;
    body.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 400, width: 390, height: 200 });
    const rows = [...list.children];
    rows.forEach((row, index) => {
      row.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 400 + index * 120, width: 390, height: 120 });
    });

    player.seek(130);
    player.change(PLAYER_PLAYING);
    // 둘째 줄의 아래 끝(640)이 본문 아래 끝(600)보다 40 아래라 그만큼 내린다.
    expect(scrollTo).toHaveBeenCalledWith({ top: 40, behavior: "smooth" });

    scrollTo.mockClear();
    fireEvent.wheel(body);
    player.seek(352);
    act(() => vi.advanceTimersByTime(PLAYER_POLL_MS));
    expect(pressed()).toEqual(["5:52"]);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(MANUAL_SCROLL_HOLD_MS).toBeGreaterThan(PLAYER_POLL_MS);
  });
});
