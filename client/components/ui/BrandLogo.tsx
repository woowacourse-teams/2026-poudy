import Image from "next/image";

import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";

type BrandLogoProps = {
  readonly name: string;
  readonly imageUrl?: string | null;
  readonly loading?: "eager" | "lazy";
  readonly size?: number;
  /** 글자 옆의 로고를 글자와 함께 키울지. 크기를 로고 안 글자 크기 기준(em)으로 잡는다. */
  readonly scalable?: boolean;
};

/**
 * 브랜드 로고. 그림이 없으면 이름 첫 글자를 대신 보여 준다.
 * 이름은 옆에 적혀 있으므로 이 자리는 보조 기술에서 감춘다.
 */
export function BrandLogo({ name, imageUrl, loading = "lazy", size = 40, scalable = false }: BrandLogoProps) {
  const initial = name.trim().charAt(0);
  const fontSize = Math.round(size * 0.35);
  const box = scalable ? `${size / fontSize}em` : size;

  return (
    <span
      aria-hidden="true"
      style={{ width: box, height: box, fontSize }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white font-bold text-text-secondary"
    >
      {imageUrl ? (
        <Image
          src={imageDeliveryUrl(imageUrl)}
          alt=""
          width={size}
          height={size}
          loading={loading}
          // 로고는 가로로 긴 것이 많다. 채우면 좌우가 잘리므로 전체가 들어오게 맞춘다.
          className="size-full object-contain p-1"
        />
      ) : (
        initial
      )}
    </span>
  );
}
