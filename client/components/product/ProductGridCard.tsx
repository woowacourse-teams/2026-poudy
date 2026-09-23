import Image from "next/image";
import Link from "next/link";

import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductThumbnail";
import type { ProductEntryPoint } from "@/lib/analytics/events";

type ProductGridCardProps = {
  readonly id: number;
  readonly name: string;
  readonly brandName: string;
  readonly imageUrl: string;
  /** 어느 화면에서 제품으로 들어갔는지. 제품 상세가 주소의 from 에서 읽는다. */
  readonly from: ProductEntryPoint;
  /** 카드 선택을 수집해야 하는 화면에서만 전달한다. */
  readonly onClick?: () => void;
  /**
   * 첫 화면에 바로 보이는 자리인지. 보이는 자리는 미루지 않고 곧바로 받는다.
   *
   * 자리마다 다르므로 컴포넌트가 스스로 정하지 않고 목록이 정해 준다.
   */
  readonly loading?: "eager" | "lazy";
};

/**
 * 세로로 선 제품 카드. 썸네일 아래에 브랜드명과 제품명을 잇달아 적는다.
 *
 * 홈의 인기 제품과 큐레이션 상세가 함께 쓴다. `components/ui/ProductCard` 는 브랜드를
 * 객체로 받아 `brandName` 만 내려오는 응답에는 쓸 수 없어 이 카드를 따로 둔다.
 *
 * 저장 버튼은 두지 않는다. 한 화면에 여럿이 늘어서는 자리라, 카드마다 단추가 붙으면
 * 무엇을 누르는 자리인지 흐려진다.
 */
export function ProductGridCard({
  id,
  name,
  brandName,
  imageUrl,
  from,
  onClick,
  loading = "lazy",
}: ProductGridCardProps) {
  return (
    <Link href={`/products/${id}?from=${from}`} onClick={onClick} className="flex flex-col gap-0.75">
      <span className="flex h-28 items-center justify-center overflow-hidden rounded-2xl">
        <Image
          src={imageUrl || PRODUCT_PLACEHOLDER}
          alt=""
          width={224}
          height={224}
          loading={loading}
          className="size-full object-contain p-2"
        />
      </span>

      {/*
        브랜드와 제품명을 한 덩어리로 읽히게 이어 쓰고 브랜드만 옅게 둔다.
        두 줄까지만 보여 주고 넘치면 줄임표로 끊는다.

        한국어를 글자 단위로 끊어 줄 끝까지 채운다. 사이트 전체의 keep-all 을 따르면 긴 낱말이
        통째로 다음 줄로 넘어가 칸 오른쪽이 비고, 사진은 가운데인데 글자만 왼쪽으로 쏠려 보인다.
        영문과 숫자는 낱말 단위를 지키도록 break-all 대신 normal 로 둔다.
      */}
      <span className="line-clamp-2 text-body leading-[1.35] [word-break:normal] text-text-primary">
        <span className="text-text-secondary">{brandName}</span> {name}
      </span>
    </Link>
  );
}
