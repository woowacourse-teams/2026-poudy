import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DATA_CORRECTION_COPY } from "@/components/inquiry/inquiry-type";
import { InquiryForm } from "@/components/inquiry/InquiryForm";
import { TargetProduct } from "@/components/inquiry/TargetProduct";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchProductDetail } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "제품 정보 정정",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

/**
 * 제품 정보 정정. 대상 제품이 경로에 있으므로 쿼리 파라미터를 두지 않는다.
 * 유형이 이미 정해져 들어오므로 유형 버튼을 그리지 않는다.
 */
export default async function ProductCorrectionPage(props: PageProps<"/inquiry/products/[productId]">) {
  const { productId } = await props.params;

  const id = Number(productId);
  if (!Number.isInteger(id)) notFound();

  const product = await fetchProductDetail(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <>
      <TopBar title="문의하기" variant="sub" />

      <InquiryForm
        originPath={`/products/${id}`}
        fixed={{
          type: "DATA_CORRECTION",
          fieldLabel: DATA_CORRECTION_COPY.fieldLabel,
          placeholder: DATA_CORRECTION_COPY.placeholder,
          header: (
            <>
              <h2 className="text-[20px] font-bold text-text-primary">{DATA_CORRECTION_COPY.title}</h2>
              <TargetProduct brandName={product.brand.name} productName={product.name} imageUrl={product.imageUrl} />
            </>
          ),
        }}
      />
    </>
  );
}
