/**
 * 구조화 데이터 한 덩어리. 값에 `</script>` 가 섞여도 태그가 닫히지 않도록 `<` 를 바꿔 싣는다.
 * 없는 값이면 아무것도 그리지 않는다.
 */
export function JsonLd({ data }: { readonly data: object | undefined }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
