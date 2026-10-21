import { describe, expect, it } from "vitest";

import type { AttachedImage } from "./attached-image";
import {
  acceptableFiles,
  attachmentStatusOf,
  isBlocked,
  rejectionOf,
  settleUploads,
  uploadedImageIds,
  uploadFailureOf,
} from "./attached-image";

import { ApiError } from "@/lib/api/client";

const file = (name: string, type: string, size = 1000) => {
  const created = new File(["x"], name, { type });
  Object.defineProperty(created, "size", { value: size });
  return created;
};

const image = (key: string, status: AttachedImage["status"], imageId?: string): AttachedImage => ({
  key,
  file: file(`${key}.png`, "image/png"),
  previewUrl: `blob:${key}`,
  status,
  imageId,
});

describe("rejectionOf", () => {
  it("사진이 아닌 파일은 형식을 알려 거절한다", () => {
    expect(rejectionOf(file("memo.txt", "text/plain"))).toBe(
      "memo.txt는 사진 파일이 아니에요. JPG나 PNG, HEIC 사진을 첨부해 주세요.",
    );
  });

  it("5MB를 넘는 사진은 크기를 알려 거절한다", () => {
    expect(rejectionOf(file("big.png", "image/png", 7.4 * 1024 * 1024))).toBe(
      "big.png가 7.4MB라 최대 5MB를 넘어요. 더 작은 사진을 첨부해 주세요.",
    );
  });

  it("HEIC 사진은 받는다", () => {
    expect(rejectionOf(file("IMG_0001.HEIC", "image/heic"))).toBeUndefined();
  });
});

describe("acceptableFiles", () => {
  it("다섯 장을 넘겨 고르면 남은 자리만큼만 받는다", () => {
    const picked = ["a", "b", "c"].map((name) => file(`${name}.png`, "image/png"));
    expect(acceptableFiles(picked, 3)).toHaveLength(2);
  });
});

describe("settleUploads", () => {
  it("받은 imageId 를 올린 차례대로 붙인다", () => {
    const settled = settleUploads([image("a", "uploading"), image("b", "uploading")], ["a", "b"], ["id-a", "id-b"]);
    expect(uploadedImageIds(settled)).toEqual(["id-a", "id-b"]);
    expect(isBlocked(settled)).toBe(false);
  });

  it("응답이 없으면 실패로 둔다", () => {
    const settled = settleUploads([image("a", "uploading")], ["a"]);
    expect(settled[0]?.status).toBe("failed");
    expect(isBlocked(settled)).toBe(true);
  });

  it("그 사이 취소해 목록에서 빠진 사진은 되살리지 않는다", () => {
    const kept = [image("b", "uploaded", "id-b")];
    expect(settleUploads(kept, ["a"], ["id-a"])).toEqual(kept);
  });
});

describe("attachmentStatusOf", () => {
  it("평소에는 장수와 규격을 적는다(명세 R969J)", () => {
    expect(attachmentStatusOf([image("a", "uploaded", "1")], undefined, undefined)).toEqual({
      status: "1 / 5장 · 장당 5MB 이하 · JPG, PNG, HEIC",
    });
  });

  it("올리는 중이면 올린 장수와 올리는 장수를 적는다(명세 IAOoG)", () => {
    const images = [image("a", "uploaded", "1"), image("b", "uploaded", "2"), image("c", "uploading")];
    expect(attachmentStatusOf(images, undefined, undefined).status).toBe("2 / 5장 · 1장 올리는 중 · 장당 5MB 이하");
  });

  it("올리지 못한 사진이 있으면 장수와 다시 시도하는 법을 오류로 알린다(명세 rgAam)", () => {
    expect(attachmentStatusOf([image("a", "failed")], undefined, "other").error).toBe(
      "1장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.",
    );
  });

  it("용량 때문에 실패했으면 다시 눌러도 같으므로 까닭을 알린다", () => {
    expect(
      attachmentStatusOf([image("a", "failed")], undefined, uploadFailureOf(new ApiError(413, "X", ""))).error,
    ).toBe("사진 용량이 커서 올리지 못했어요. 더 작은 사진을 첨부해 주세요.");
  });

  it("고른 파일을 거절했으면 그 까닭을 먼저 보여 준다", () => {
    expect(attachmentStatusOf([], "거절한 까닭", undefined).error).toBe("거절한 까닭");
  });
});
