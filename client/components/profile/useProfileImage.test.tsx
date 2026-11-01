/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProfileImage } from "./useProfileImage";

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/lib/api/member", () => ({ uploadProfileImage: upload }));

const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";
const file = (name: string) => new File(["image"], name, { type: "image/jpeg" });

beforeEach(() => {
  upload.mockReset();
  let next = 0;
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: vi.fn(() => `blob:profile-${++next}`), revokeObjectURL: vi.fn() }),
  );
});

describe("프로필 사진 선택", () => {
  it("새 사진을 고른 뒤 이전 업로드가 끝나도 새 선택을 덮지 않는다", async () => {
    let first: ((value: { imageId: string }) => void) | undefined;
    let second: ((value: { imageId: string }) => void) | undefined;
    upload
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            first = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            second = resolve;
          }),
      );
    const { result, unmount } = renderHook(() => useProfileImage(null, vi.fn()));
    act(() => {
      void result.current.select(file("a.jpg"));
    });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    act(() => {
      void result.current.select(file("b.jpg"));
    });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    await act(async () => {
      second?.({ imageId: idB });
    });
    expect(result.current.imageId).toBe(idB);
    await act(async () => {
      first?.({ imageId: idA });
    });
    expect(result.current.imageId).toBe(idB);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:profile-1");
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:profile-2");
  });

  it("삭제 후 이전 업로드가 끝나도 사진을 되살리지 않는다", async () => {
    let finish: ((value: { imageId: string }) => void) | undefined;
    upload.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useProfileImage("https://example.com/original", vi.fn()));
    act(() => {
      void result.current.select(file("a.jpg"));
    });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    act(() => result.current.remove());
    await act(async () => {
      finish?.({ imageId: idA });
    });
    expect(result.current.src).toBeNull();
    expect(result.current.imageId).toBeNull();
    expect(result.current.blocked).toBe(false);
  });
});
