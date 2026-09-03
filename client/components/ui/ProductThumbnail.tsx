"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export const PRODUCT_PLACEHOLDER = "/images/products/placeholder.png";

/** 주소가 없거나 받아 오지 못한 그림은 디자인의 기본 공병 그림으로 자리를 채운다. */
const sourceOf = (imageUrl: string, failed: boolean): string => {
  if (failed) return PRODUCT_PLACEHOLDER;
  return imageUrl || PRODUCT_PLACEHOLDER;
};

/**
 * 제품 이름을 옆에 적어 두므로 그림에는 대체 텍스트를 비운다.
 *
 * 그림은 제품마다 따로 도착하므로 자리도 따로 푼다. 한 장이 늦다고 옆의 카드까지
 * 붙잡아 두지 않는다.
 */
export function ProductThumbnail({
  imageUrl,
  loading = "lazy",
  onSettled,
}: {
  readonly imageUrl: string;
  readonly loading?: "eager" | "lazy";
  readonly onSettled: () => void;
}) {
  // 같은 제품 자리의 주소가 바뀌면 이전 그림의 완료 상태를 가져가지 않는다.
  return (
    <ProductThumbnailImage
      key={imageUrl || PRODUCT_PLACEHOLDER}
      imageUrl={imageUrl}
      loading={loading}
      onSettled={onSettled}
    />
  );
}

function ProductThumbnailImage({
  imageUrl,
  loading,
  onSettled,
}: {
  readonly imageUrl: string;
  readonly loading: "eager" | "lazy";
  readonly onSettled: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  /* 이미 받아 둔 그림은 붙기 전에 실려 onLoad가 오지 않을 수 있으므로 DOM 상태도 확인한다. */
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) onSettled();
  }, [onSettled]);

  /* 실패한 자리는 공병 그림으로 바꾼다. 회색으로 두면 영영 그대로고, 그냥 두면 깨진 그림이 남는다. */
  const handleError = () => {
    if (failed) {
      onSettled();
      return;
    }

    setFailed(true);
  };

  return (
    <div className="size-20 shrink-0">
      <Image
        ref={ref}
        src={sourceOf(imageUrl, failed)}
        alt=""
        data-product-image
        width={80}
        height={80}
        loading={loading}
        onLoad={onSettled}
        onError={handleError}
        className="size-20 rounded-lg bg-transparent object-contain"
      />
    </div>
  );
}
