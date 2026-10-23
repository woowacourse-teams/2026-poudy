/** 구성품을 고른 주소. 유입 경로는 세션에서 유지하고 콘텐츠를 결정하는 partId만 남긴다. */
export const partHref = (productId: number, partId: number): string => {
  const query = new URLSearchParams([["partId", String(partId)]]);
  return `/products/${productId}?${query}`;
};

/** 구성품의 순서 표기. 탭과 칩이 이름 앞에 두 자리로 붙인다(01, 02 …). 응답에 따로 이름 붙은 순서가 없어 차례로 센다. */
export const partOrder = (index: number): string => String(index + 1).padStart(2, "0");
