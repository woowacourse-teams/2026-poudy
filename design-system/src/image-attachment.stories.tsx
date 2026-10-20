import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ImageAttachment } from "./image-attachment";
import type { AttachedImage } from "./image-attachment";

const PHOTO = "/images/products/roundlab-1025-toner.png";
const ACCEPT = "image/jpeg,image/png,image/heic,image/heif";
const noop = () => undefined;

const meta = {
  title: "화면 골격/ImageAttachment",
  component: ImageAttachment,
} satisfies Meta<typeof ImageAttachment>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof ImageAttachment>;

function InquirySample() {
  const [images, setImages] = useState<readonly AttachedImage[]>([
    { key: "a", src: PHOTO, status: "uploaded" },
    { key: "b", src: PHOTO, status: "uploading" },
    { key: "c", src: PHOTO, status: "failed" },
  ]);
  const failed = images.filter((image) => image.status === "failed").length;
  const uploading = images.filter((image) => image.status === "uploading").length;
  const drop = (key: string) => setImages((current) => current.filter((image) => image.key !== key));

  return (
    <ImageAttachment
      label="사진"
      optional
      images={images}
      max={5}
      accept={ACCEPT}
      onSelect={(files) =>
        setImages((current) => [
          ...current,
          ...files.map((file) => ({
            key: `${file.name}-${Date.now()}`,
            src: URL.createObjectURL(file),
            status: "uploading" as const,
          })),
        ])
      }
      onRemove={drop}
      onCancel={drop}
      onRetry={(key) =>
        setImages((current) => current.map((image) => (image.key === key ? { ...image, status: "uploaded" } : image)))
      }
      onOpen={noop}
      status={`${images.length} / 5장 · ${uploading > 0 ? `${uploading}장 올리는 중 · ` : ""}장당 5MB 이하 · JPG, PNG, HEIC`}
      error={failed > 0 ? `${failed}장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.` : undefined}
    />
  );
}

export const Inquiry: Story = {
  name: "문의하기 (S40)",
  render: () => <InquirySample />,
};

export const Ingredient: Story = {
  name: "전성분 사진 (S53h)",
  render: () => (
    <ImageAttachment
      label="전성분 사진"
      optional
      images={[]}
      max={1}
      accept={ACCEPT}
      onSelect={noop}
      onRemove={noop}
      onCancel={noop}
      onRetry={noop}
      aside={
        <>
          뒷면 전성분이 보이게 찍어 주시면
          <br />더 빨리 등록할 수 있어요
        </>
      }
    />
  ),
};
