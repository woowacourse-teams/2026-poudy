"use client";

import Image from "next/image";
import { useState } from "react";

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
}: {
  readonly imageUrl: string;
  readonly loading?: "eager" | "lazy";
}) {
  // 같은 제품 자리의 주소가 바뀌면 이전 그림의 실패 상태를 가져가지 않는다.
  return <ProductThumbnailImage key={imageUrl || PRODUCT_PLACEHOLDER} imageUrl={imageUrl} loading={loading} />;
}

function ProductThumbnailImage({
  imageUrl,
  loading,
}: {
  readonly imageUrl: string;
  readonly loading: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);

  /* 실패한 자리는 공병 그림으로 바꾼다. 회색으로 두면 영영 그대로고, 그냥 두면 깨진 그림이 남는다. */
  const handleError = () => setFailed(true);

  /*
   * 그림이 오기 전에는 회색 자리만 보이고 제품명·가격은 먼저 읽힌다.
   *
   * 회색을 감싼 자리의 배경으로 깔아 두어 그림이 그 위에 그려지게 한다. 그림이 도착했는지
   * 를 따로 재지 않으므로, hydration 보다 그림이 먼저 도착해 React 가 load 를 놓치는
   * 경우에도 회색이 남지 않는다.
   */
  return (
    <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-[#F2F3F5]">
      <Image
        src={sourceOf(imageUrl, failed)}
        alt=""
        data-product-image
        width={80}
        height={80}
        loading={loading}
        onError={handleError}
        className="size-20 bg-transparent object-contain"
      />
    </div>
  );
}
