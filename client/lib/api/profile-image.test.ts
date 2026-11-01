import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";

import { uploadProfileImage } from "./member";

import { server } from "@/mocks/server";

it("프로필 사진을 image multipart 필드로 보내고 반환 ID를 검증한다", async () => {
  const imageId = "00000000-0000-4000-8000-000000000001";
  let name: string | undefined;
  server.use(
    http.post("*/api/users/me/profile-image", async ({ request }) => {
      const image = (await request.formData()).get("image");
      expect(typeof image).not.toBe("string");
      if (image && typeof image !== "string") name = image.name;
      return HttpResponse.json({ imageId }, { status: 201 });
    }),
  );
  const uploaded = await uploadProfileImage(new File(["image"], "otter.jpg", { type: "image/jpeg" }));
  expect(uploaded.imageId).toBe(imageId);
  expect(name).toBe("otter.jpg");
});
