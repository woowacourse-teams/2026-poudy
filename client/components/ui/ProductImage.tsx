"use client";

import { cn } from "@poudy/design-system/cn";
import { type Ref, useLayoutEffect, useRef, useState } from "react";

import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";

/** 주소가 없거나 받아 오지 못한 제품 사진 자리를 채우는 기본 공병 그림(명세 IMAGE P03). */
export const PRODUCT_PLACEHOLDER = "/images/products/placeholder.png";

/**
 * 제품 사진의 고정 칸(명세 IMAGE P02). 40 목록 행 앞, 48 썸네일 행, 64 유사 제품,
 * 80 상품 목록 카드, 184 제품 상세 대표 이미지. 이 밖의 크기는 쓰지 않는다.
 */
export type ProductImageSize = 40 | 48 | 64 | 80 | 184;

/** 칸 크기마다 같은 한 변의 Tailwind 크기. 클래스 이름을 이어 붙여 만들지 않도록 표로 둔다. */
const SIZE_CLASS: Readonly<Record<ProductImageSize, string>> = {
  40: "size-10",
  48: "size-12",
  64: "size-16",
  80: "size-20",
  184: "size-46",
};

/*
 * S3 의 제품 그림은 `{이름}.webp` 옆에 긴 변을 칸 크기에 맞춘 `{이름}_{칸}.webp` 를 함께 둔다.
 * 칸은 화면이 그리는 크기(40~184px)를 4배 화면까지 덮도록 정했다. 칸이 바뀌면 S3 의 사본도
 * 같이 만들어야 하므로 여기만 고치지 않는다.
 */
const PRODUCT_IMAGE =
  /^https:\/\/techcourse-project-2026\.s3\.ap-northeast-2\.amazonaws\.com\/poudy\/images\/products\/.+\.webp$/;
const VARIANT_WIDTHS = [128, 192, 288, 384, 576, 768] as const;

const srcSetOf = (src: string): string | undefined => {
  if (!PRODUCT_IMAGE.test(src)) return undefined;
  return VARIANT_WIDTHS.map((width) => `${imageDeliveryUrl(src.replace(/\.webp$/, `_${width}.webp`))} ${width}w`).join(
    ", ",
  );
};

type ProductImageCommonProps = {
  /** 비어 있으면 기본 공병 그림을 보여 준다. */
  readonly src: string;
  /** 옆에 제품명이 있으면 비운다(명세 A11Y D05). */
  readonly alt?: string;
  readonly className?: string;
  readonly loading?: "eager" | "lazy";
  readonly fetchPriority?: "high" | "low" | "auto";
  readonly ref?: Ref<HTMLImageElement>;
  readonly [dataAttribute: `data-${string}`]: string | boolean | undefined;
};

type FixedSizeProps = {
  /** 고정 칸의 한 변(CSS px). 칸 크기도 이 값으로 정한다. */
  readonly size: ProductImageSize;
  readonly sizes?: never;
};

type FluidSizeProps = {
  /**
   * 폭이 변하는 칸(홈 카드처럼 카드 폭을 채움)이 가장 넓을 때의 한 변. width·height 속성에만 쓰고,
   * 칸의 크기는 className 으로 정한다.
   */
  readonly size: number;
  /** 화면에 그려지는 실제 CSS 폭을 나타내는 식(명세 IMAGE P05). 거터 상수로 만든다(`lib/layout-tokens`). */
  readonly sizes: string;
};

type ProductImageProps = ProductImageCommonProps & (FixedSizeProps | FluidSizeProps);

/**
 * 제품 사진(명세 IMAGE P01~P06). next/image 는 `unoptimized` 설정에서 srcset 을 만들지 않으므로 img 로
 * 직접 그린다. 서버 변환(`/_next/image`)은 쓰지 않는다. 기본값은 next/image 와 맞춘다.
 *
 * - 칸 안에 contain 으로 맞추고, 사진에는 반경을 주지 않는다(P01).
 * - 주소가 없거나 받아 오지 못하면 조용히 기본 공병 그림으로 바꾼다. 오류로 알리지 않는다(P03).
 * - 받는 동안 칸은 비워 둔다. 스켈레톤이나 페이드를 두지 않는다(P03).
 */
export function ProductImage(props: ProductImageProps) {
  // 실패는 주소 단위로 기억한다. 주소가 바뀌면 이전 주소의 실패를 가져가지 않는다.
  return <ProductImageElement key={props.src} {...props} />;
}

/** 지금 받고 있는 그림. 사본이 실패하면 원본, 원본이 실패하면 기본 공병 그림으로 내려간다. */
type Stage = "variants" | "original" | "placeholder" | "broken";

const firstStage = (src: string): Stage => {
  if (!src) return "placeholder";
  return srcSetOf(src) ? "variants" : "original";
};

const NEXT_STAGE: Readonly<Record<Stage, Stage>> = {
  variants: "original",
  original: "placeholder",
  placeholder: "broken",
  broken: "broken",
};

function ProductImageElement({
  src,
  alt = "",
  size,
  sizes,
  className,
  loading = "lazy",
  fetchPriority,
  ref,
  ...data
}: ProductImageProps) {
  const [stage, setStage] = useState<Stage>(() => firstStage(src));
  const imageRef = useRef<HTMLImageElement | null>(null);

  const showsPlaceholder = stage === "placeholder" || stage === "broken";
  const imageSrc = showsPlaceholder ? PRODUCT_PLACEHOLDER : imageDeliveryUrl(src);
  const srcSet = stage === "variants" ? srcSetOf(src) : undefined;

  /*
   * 하이드레이션 전에 끝난 error 는 React 가 다시 알려 주지 않는다. 아직 실리지 않은 그림은
   * 주소를 다시 넣어 실패를 다시 일으킨다. next/image 가 같은 방식으로 되살린다.
   */
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image || (image.complete && image.naturalWidth > 0)) return;

    // 속성으로 다시 넣는다. `image.src` 는 절대 주소를 돌려주므로 그대로 넣으면 상대 주소가 바뀐다.
    image.setAttribute("src", imageSrc);
    // 처음 붙을 때 한 번만 되살린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignRef = (image: HTMLImageElement | null) => {
    imageRef.current = image;
    if (typeof ref === "function") {
      ref(image);
      return;
    }

    if (ref) ref.current = image;
  };

  return (
    /*
     * 속성 순서를 지킨다. loading 은 src 보다 앞, src 는 맨 뒤에 둔다. React 는 적힌 순서대로
     * 속성을 넣는데, Safari 는 src 가 먼저 들어오면 lazy 와 srcset 을 보기 전에 받기 시작한다.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...data}
      ref={assignRef}
      alt={alt}
      fetchPriority={fetchPriority}
      loading={loading}
      width={size}
      height={size}
      decoding="async"
      className={cn(
        "object-contain",
        sizes === undefined && SIZE_CLASS[size as ProductImageSize],
        // 받는 동안 대체 텍스트가 깜빡이지 않게 감추고, 끝내 실패했을 때만 드러낸다.
        stage !== "broken" && "text-transparent",
        className,
      )}
      data-product-image-state={showsPlaceholder ? "placeholder" : "photo"}
      // 화면에 그려지는 실제 CSS 폭. 화면 배율에 맞는 사본은 브라우저가 고른다(P05).
      sizes={srcSet && (sizes ?? `${size}px`)}
      srcSet={srcSet}
      src={imageSrc}
      onError={() => setStage(NEXT_STAGE[stage])}
    />
  );
}
