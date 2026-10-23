import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** 세션 쿠키 없이 나만의 필터를 켠 주소는 API 를 부르지 않고 플래그를 뺀 주소로 보낸다. */
export const requireMyFilterSession = async (path: string, params: URLSearchParams): Promise<void> => {
  if (params.get("myFilter") !== "true") return;
  if ((await cookies()).has("JSESSIONID")) return;

  const kept = new URLSearchParams(params);
  kept.delete("myFilter");
  const query = kept.toString();
  redirect(query ? `${path}?${query}` : path);
};
