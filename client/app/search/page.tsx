import { redirect } from "next/navigation";

/** 탐색은 제품명 검색부터 보여 준다. */
export default function SearchIndexPage() {
  redirect("/search/products");
}
