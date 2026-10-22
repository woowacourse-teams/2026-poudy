import { cn } from "@poudy/design-system/cn";
import Image from "next/image";

import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";

type BrandLogoProps = {
  readonly name: string;
  readonly imageUrl?: string | null;
  readonly loading?: "eager" | "lazy";
  /** 28: 디렉터리 브랜드 행(명세 APP · 브랜드 행 · 이니셜 로고), 40: 브랜드 상세 머리 */
  readonly size?: 28 | 40;
  /** 글자 옆의 로고를 글자와 함께 키울지. 크기는 28 로 그린다. */
  readonly scalable?: boolean;
};

/*
 * 원의 크기. scalable 은 원을 글자 크기 토큰(text-28)의 1em 으로 잡아, 기기 글자 크기를 키우면 원도 같은 비율로
 * 커진다. 첫 글자는 안쪽에서 다시 글자 크기를 정한다. Tailwind 가 클래스를 찾도록 이름을 통째로 적는다.
 */
const BOX = { 28: "size-7", 40: "size-10" } as const;
const INITIAL = { 28: "text-caption", 40: "text-14" } as const;

/**
 * 브랜드 로고. 그림이 없으면 이름 첫 글자를 대신 보여 준다.
 * 이름은 옆에 적혀 있으므로 이 자리는 보조 기술에서 감춘다.
 *
 * 첫 글자 원은 회색 면(명세 APP · 브랜드 행 · 이니셜 로고)이고, 디렉터리 행이 눌리면 행 면이 짙어지므로 흰 면으로
 * 바꾼다(data-logo-disc, STATE S10 fb-row). 그림은 흰 바탕에 그린 것이 많아 흰 원에 테두리를 둔다.
 */
export function BrandLogo({ name, imageUrl, loading = "lazy", size = 40, scalable = false }: BrandLogoProps) {
  return (
    <span
      aria-hidden="true"
      data-logo-disc={imageUrl ? undefined : ""}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        scalable ? "size-em text-28" : BOX[size],
        imageUrl ? "border border-border bg-background" : "bg-surface",
      )}
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
        <span className={cn("leading-none font-bold text-text-secondary", INITIAL[scalable ? 28 : size])}>
          {name.trim().charAt(0)}
        </span>
      )}
    </span>
  );
}
