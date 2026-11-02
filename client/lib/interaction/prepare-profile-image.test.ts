/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import { prepareProfileImage } from "./prepare-profile-image";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("프로필 사진 업로드 준비", () => {
  it("HEIC는 브라우저에서 읽지 않고 원본을 서버로 보낸다", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const original = new File(["heic"], "photo.heic", { type: "image/heic" });
    expect(await prepareProfileImage(original)).toBe(original);
    expect(decode).not.toHaveBeenCalled();
  });

  it("1024px 이하는 원본을 유지하고 디코딩 자원을 반환한다", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 800, height: 600, close }));
    const original = new File(["jpeg"], "photo.jpg", { type: "image/jpeg" });
    expect(await prepareProfileImage(original)).toBe(original);
    expect(close).toHaveBeenCalledOnce();
  });

  it("큰 사진은 비율을 유지해 긴 변을 1024px로 줄이고 자원을 반환한다", async () => {
    const close = vi.fn();
    const draw = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 3000, height: 1500, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: draw,
    } as unknown as CanvasRenderingContext2D);
    let dimensions: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback) {
      dimensions = [this.width, this.height];
      callback(new Blob(["prepared"], { type: "image/jpeg" }));
    });
    const prepared = await prepareProfileImage(new File(["original"], "photo.jpg", { type: "image/jpeg" }));
    expect(dimensions).toEqual([1024, 512]);
    expect(prepared.name).toBe("photo.jpg");
    expect(prepared.type).toBe("image/jpeg");
    expect(draw).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("준비에 실패해도 디코딩 자원을 반환한다", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 3000, height: 1500, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(prepareProfileImage(new File(["image"], "photo.jpg", { type: "image/jpeg" }))).rejects.toThrow();
    expect(close).toHaveBeenCalledOnce();
  });
});
