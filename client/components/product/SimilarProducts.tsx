import type { SimilarProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";

import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import { Badge } from "@/components/ui/Badge";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { partHref } from "@/lib/domain/product-parts";

/**
 * S24 성분이 비슷한 제품. 서버가 미리 계산한 것을 최대 3개 보여 준다.
 *
 * 계산 결과가 없거나 받아 오지 못하면 섹션째 그리지 않는다. 빈 머리만 남으면 없는 것을 찾게 만든다.
 * 디자인의 `겹치는 성분 N개` 줄은 응답에 겹치는 성분이 없어 아직 그리지 않는다.
 */
export function SimilarProducts({ products }: { readonly products: readonly SimilarProductResponse[] }) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[14px] font-bold text-[#182132]">성분이 비슷한 제품</h3>

      {/* 행 사이는 목록의 gap 으로만 띄운다. 행에 여백을 두면 행 높이가 이미지보다 커져 주의 칩이 이미지 위 끝에서 떨어진다. */}
      <ul className="flex flex-col gap-6">
        {products.map((product) => (
          // 칸 배치를 행 폭과 글자 크기로 정하므로 행을 기준 틀로 둔다. em 은 14px 글자 기준이다.
          <li key={product.id} className="@container text-[14px]">
            {/*
              행 전체가 링크라 화살표를 두지 않는다. 비교한 구성품으로 바로 열어 같은 성분표를 보게 한다.
              행 높이는 이미지 높이와 같다. 브랜드와 이름은 이미지 가운데에 맞추고,
              주의 칩만 따로 떼어 이미지 위 끝과 같은 높이의 오른쪽 가장자리에 붙인다.

              기기 글자 크기를 키워 칩 옆에 이름을 둘 자리(이미지·간격 88px, 칩과 이름 10.7em)가 모자라면,
              칩을 이름 칸 위로 올린다. 칩은 그대로 오른쪽 위에 붙고 이름은 칸의 폭을 모두 쓴다.
            */}
            <Link
              href={partHref(product.id, product.partId, "similar_product")}
              className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 transition-colors duration-release ease-out active:bg-[#EFF1F5] active:duration-press @min-[calc(88px_+_10.7em)]:grid-cols-[64px_minmax(0,1fr)_auto]"
            >
              <ProductImage
                src={product.imageUrl || PRODUCT_PLACEHOLDER}
                alt=""
                size={64}
                loading="lazy"
                className="col-start-1 row-span-2 row-start-1 size-16 self-start rounded-xl object-contain @min-[calc(88px_+_10.7em)]:row-span-1 @min-[calc(88px_+_10.7em)]:self-center"
              />

              <span className="col-start-2 row-start-2 flex min-w-0 flex-col gap-1 self-start @min-[calc(88px_+_10.7em)]:row-start-1 @min-[calc(88px_+_10.7em)]:self-center">
                <span className="truncate text-[12px] font-medium text-[#566273]">{product.brand.name}</span>
                <span className="text-[14px] font-semibold text-[#182132]">{product.name}</span>
              </span>

              <span className="col-start-2 row-start-1 self-start justify-self-end @min-[calc(88px_+_10.7em)]:col-start-3">
                <CautionChip caution={product.containsExcludedIngredient} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 빠른 제외 성분군 6종 가운데 하나라도 들었는지. 색과 함께 글자로도 알린다. */
function CautionChip({ caution }: { readonly caution: boolean }) {
  return (
    <Badge variant={caution ? "caution" : "noCaution"} icon={<CautionStatusIcon caution={caution} size={12} />}>
      {caution ? "주의" : "주의 없음"}
    </Badge>
  );
}
