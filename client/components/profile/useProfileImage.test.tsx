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
    expect(result.current.src).toBe("blob:profile-2");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:profile-1");
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:profile-2");
  });

  it("올리는 동안에도 고른 사진을 보여 주고, 다 올린 뒤에 ID를 붙인다", async () => {
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
    expect(result.current.src).toBe("blob:profile-1");
    expect(result.current.uploading).toBe(true);
    expect(result.current.imageId).toBeUndefined();
    await act(async () => {
      finish?.({ imageId: idA });
    });
    expect(result.current.src).toBe("blob:profile-1");
    expect(result.current.imageId).toBe(idA);
    expect(result.current.uploading).toBe(false);
  });

  it("올리지 못하면 고른 사진에 실패를 표시하고, 다시 올리면 같은 사진으로 다시 시도한다", async () => {
    upload.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ imageId: idA });
    const { result } = renderHook(() =>
      useProfileImage(
        "https://example.com/original",
        vi.fn(() => false),
      ),
    );
    await act(async () => {
      await result.current.select(file("a.jpg"));
    });
    expect(result.current.src).toBe("blob:profile-1");
    expect(result.current.failed).toBe(true);
    expect(result.current.uploading).toBe(false);
    expect(result.current.imageId).toBeUndefined();
    await act(async () => {
      await result.current.retry();
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(result.current.failed).toBe(false);
    expect(result.current.imageId).toBe(idA);
    expect(result.current.src).toBe("blob:profile-1");
  });

  it("형식이 맞지 않는 파일은 올리지 않고 이유만 남긴다", async () => {
    const { result } = renderHook(() =>
      useProfileImage(
        null,
        vi.fn(() => false),
      ),
    );
    await act(async () => {
      await result.current.select(new File(["text"], "memo.txt", { type: "text/plain" }));
    });
    expect(upload).not.toHaveBeenCalled();
    expect(result.current.rejection).toContain("사진 파일이 아니에요");
    expect(result.current.changed).toBe(false);
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
    expect(result.current.uploading).toBe(false);
  });
});
