"use client";

import { type Ref, useLayoutEffect, useRef, useState } from "react";

import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";

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

type ProductImageProps = {
  readonly src: string;
  readonly alt: string;
  /** 화면이 그리는 정사각 칸의 한 변(CSS px). 브라우저가 이 값과 화면 배율로 사본을 고른다. */
  readonly size: number;
  readonly className?: string;
  readonly loading?: "eager" | "lazy";
  readonly fetchPriority?: "high" | "low" | "auto";
  readonly onLoad?: () => void;
  readonly onError?: () => void;
  readonly ref?: Ref<HTMLImageElement>;
  readonly [dataAttribute: `data-${string}`]: string | boolean | undefined;
};

/**
 * 제품 그림. next/image 는 `unoptimized` 설정에서 srcset 을 만들지 않으므로 img 로 직접 그린다.
 * 서버 변환(`/_next/image`)은 쓰지 않는다. 기본값은 next/image 와 맞춘다.
 */
export function ProductImage(props: ProductImageProps) {
  // 주소가 바뀌면 이전 그림의 실패 상태를 가져가지 않는다.
  return <ProductImageElement key={props.src} {...props} />;
}

function ProductImageElement({
  src,
  alt,
  size,
  className,
  loading = "lazy",
  fetchPriority,
  onLoad,
  onError,
  ref,
  ...data
}: ProductImageProps) {
  const [variantsFailed, setVariantsFailed] = useState(false);
  const [broken, setBroken] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const imageSrc = imageDeliveryUrl(src);
  const srcSet = variantsFailed ? undefined : srcSetOf(src);

  /*
   * 하이드레이션 전에 끝난 load·error 는 React 가 다시 알려 주지 않는다.
   * 이미 실린 그림은 onLoad 를 부르고, 아직이면 주소를 다시 넣어 실패를 다시 일으킨다.
   * next/image 가 같은 방식으로 되살린다.
   */
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    if (image.complete && image.naturalWidth > 0) {
      onLoad?.();
      return;
    }

    // 속성으로 다시 넣는다. `image.src` 는 절대 주소를 돌려주므로 그대로 넣으면 상대 주소가 바뀐다.
    image.setAttribute("src", imageSrc);
    // 처음 붙을 때 한 번만 되살린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 사본이 없으면(새 제품을 아직 변환하지 않았을 때) 원본으로 한 번 더 받는다. 원본도 실패해야 실패로 알린다. */
  const handleError = () => {
    if (srcSet) {
      setVariantsFailed(true);
      return;
    }

    setBroken(true);
    onError?.();
  };

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
      className={className}
      // 받는 동안 대체 텍스트가 깜빡이지 않게 감추고, 끝내 실패했을 때만 드러낸다.
      style={broken ? undefined : { color: "transparent" }}
      sizes={srcSet && `${size}px`}
      srcSet={srcSet}
      src={imageSrc}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}
