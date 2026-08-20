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

/**
 * 사용자가 만난 실패를 남긴다. 이 파일은 서버 컴포넌트도 부르므로 분석 모듈을
 * 정적으로 가져오지 않는다. 가져오면 서버 그래프에 클라이언트 경계가 끌려 들어온다.
 *
 * surface 에는 경로 그대로가 아니라 ID 를 지운 모양을 넣는다. 제품·성분 ID 까지 남기면
 * 값이 잘게 갈라져 어느 API 가 무너졌는지 한눈에 보이지 않는다.
 */
const reportError = (code: string, status: number, path: string): void => {
  if (typeof window === "undefined") return;

  const surface = path.replace(/\/\d+(?=\/|$)/g, "/:id");
  void import("@/lib/analytics/track").then(({ track }) => {
    track("error_occurred", { error_code: code, status, surface });
  });
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
  const response = await fetch(apiUrl(path, query)).catch((cause: unknown) => {
    // 응답이 아예 오지 않은 경우도 사용자에게는 같은 실패다. 상태 코드가 없으므로 0 으로 남긴다.
    reportError("NETWORK_ERROR", 0, path);
    throw new ApiError(0, "NETWORK_ERROR", cause instanceof Error ? cause.message : "요청을 보내지 못했습니다.");
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const code = problem?.code ?? "INTERNAL_SERVER_ERROR";

    reportError(code, response.status, path);
    throw new ApiError(response.status, code, problem?.detail ?? "요청을 처리하지 못했습니다.");
  }

  return response.json() as Promise<T>;
};
