const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * 서버 컴포넌트의 fetch 는 상대 경로를 쓸 수 없다. 목을 쓰는 동안에는
 * NEXT_PUBLIC_API_BASE_URL 이 비어 있으므로 로컬 주소를 기본값으로 채운다.
 */
const origin = () => {
  if (baseUrl) return baseUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
};

export const apiUrl = (path: string, query?: URLSearchParams) => {
  const url = new URL(path, origin());
  if (query) url.search = query.toString();
  return url.toString();
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export const apiGet = async <T>(path: string, query?: URLSearchParams): Promise<T> => {
  const response = await fetch(apiUrl(path, query));

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      problem?.code ?? "INTERNAL_SERVER_ERROR",
      problem?.detail ?? "요청을 처리하지 못했습니다.",
    );
  }

  return response.json() as Promise<T>;
};
