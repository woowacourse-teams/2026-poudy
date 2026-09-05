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
}: {
  readonly imageUrl: string;
  readonly loading?: "eager" | "lazy";
}) {
  // 같은 제품 자리의 주소가 바뀌면 이전 그림의 도착 상태를 가져가지 않는다.
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
  const [settled, setSettled] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  /*
   * 이미 받아 둔 그림은 React 가 붙기 전에 실려 onLoad 가 오지 않을 수 있으므로
   * DOM 상태도 확인한다. 이것을 빠뜨리면 회색 자리가 영영 남는다.
   */
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setSettled(true);
  }, []);

  /* 실패한 자리는 공병 그림으로 바꾼다. 회색으로 두면 영영 그대로고, 그냥 두면 깨진 그림이 남는다. */
  const handleError = () => {
    if (failed) {
      setSettled(true);
      return;
    }

    setFailed(true);
  };

  /*
   * 그림이 오기 전에는 회색 자리만 보이고 제품명·가격은 먼저 읽힌다.
   *
   * 제품 그림은 배경이 비어 있고 세로로 길어 자리를 다 채우지 않는다. 회색을 깔아 둔 채로
   * 두면 그림이 도착해도 뒤가 비쳐 회색이 남으므로, 도착하면 회색을 걷는다.
   */
  return (
    <div
      className={`size-20 shrink-0 overflow-hidden rounded-lg ${settled ? "bg-transparent" : "bg-[#F2F3F5]"}`}
      data-thumbnail-state={settled ? "loaded" : "loading"}
    >
      <Image
        ref={ref}
        src={sourceOf(imageUrl, failed)}
        alt=""
        data-product-image
        width={80}
        height={80}
        loading={loading}
        onLoad={() => setSettled(true)}
        onError={handleError}
        className="size-20 bg-transparent object-contain"
      />
    </div>
  );
}
