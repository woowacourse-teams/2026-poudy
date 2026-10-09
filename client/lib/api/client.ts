import { ErrorCode } from "@poudy/api/api.zod";
import type { ZodType } from "zod";

/**
 * 브라우저는 공개 Nginx를, 서버 컴포넌트와 런타임 sitemap은 프론트 EC2의
 * 로컬 전용 Nginx listener를 사용한다. 서버 전용 값은 standalone 프로세스가
 * 시작될 때 주입되므로 함수 실행 시점에 읽는다.
 */
const origin = () => {
  const publicBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  if (typeof window !== "undefined") return publicBaseUrl || window.location.origin;
  return process.env.POUDY_SERVER_API_BASE_URL || publicBaseUrl || `http://127.0.0.1:${process.env.PORT ?? 3000}`;
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
const surfaceOf = (path: string): string => path.replace(/\/\d+(?=\/|$)/g, "/:id");

const reportError = (code: string, status: number, path: string): void => {
  if (typeof window === "undefined") return;

  void import("@/lib/analytics/track").then(({ track }) => {
    track("error_occurred", { error_code: code, status, surface: surfaceOf(path) });
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

/**
 * 서버에서 이 응답을 얼마나 담아 둘지(초). 브라우저 요청에는 아무 영향이 없다.
 *
 * 조건이 주소에 붙는 화면은 라우트 단위 캐시가 걸리지 않으므로, 자주 바뀌지 않는
 * 값은 이렇게 요청 단위로 담아 둔다.
 */
type CacheSeconds = number;

type GetOptions = {
  readonly query?: URLSearchParams;
  readonly revalidate?: CacheSeconds;
};

export const INVALID_RESPONSE = "INVALID_RESPONSE";

/**
 * 계약과 다른 응답을 PostHog 예외로도 보낸다. 예외 목록에서 같은 불일치를 한데 묶어 보고,
 * 그 세션의 리플레이로 어느 화면에서 났는지 확인할 수 있다. 메시지가 같아야 한 묶음으로
 * 모이므로 경로의 ID 는 지운다. 서버에는 브라우저 SDK 가 없어 로그만 남는다.
 */
const captureInvalidResponse = (path: string, fields: readonly string[]): void => {
  if (typeof window === "undefined") return;

  const surface = surfaceOf(path);
  window.posthog?.captureException?.(new Error(`${INVALID_RESPONSE} ${surface}: ${fields.join(", ")}`), {
    surface,
    fields,
  });
};

/**
 * 응답이 API 계약과 맞는지 생성된 Zod 스키마로 확인한다. 타입은 빌드가 끝나면 사라지므로,
 * 서버가 계약과 다른 모양을 내려 주면 여기서 확인하지 않는 한 아무도 알 수 없다.
 *
 * production 이 아니면 어긋난 응답을 실패로 처리해, staging 에서 먼저 드러나게 한다.
 * production 에서는 화면을 막지 않고 받은 값을 그대로 쓰되, 어긋났다는 사실은 남긴다.
 */
const checkResponse = async <T>(schema: ZodType<T>, response: Response, path: string): Promise<T> => {
  const body: unknown = await response.json();
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  // 어느 필드가 어긋났는지만 남긴다. 값은 검색어 같은 입력을 담을 수 있어 남기지 않는다.
  // 목록의 몇 번째 항목인지는 지워, 같은 필드가 항목 수만큼 되풀이되지 않게 한다.
  const fields = [
    ...new Set(
      result.error.issues.map(
        (issue) => issue.path.map((key) => (typeof key === "number" ? "*" : String(key))).join(".") || "(root)",
      ),
    ),
  ];
  console.error(JSON.stringify({ kind: "invalid_response", path, fields }));
  reportError(INVALID_RESPONSE, response.status, path);
  captureInvalidResponse(path, fields);

  if (process.env.NEXT_PUBLIC_ENVIRONMENT === "production") return body as T;
  throw new ApiError(response.status, INVALID_RESPONSE, `응답이 API 계약과 다릅니다: ${fields.join(", ")}`);
};

export const apiGet = async <T>(
  path: string,
  schema: ZodType<T>,
  { query, revalidate }: GetOptions = {},
): Promise<T> => {
  const response = await fetch(apiUrl(path, query), { next: { revalidate } }).catch((cause: unknown) => {
    // 응답이 아예 오지 않은 경우도 사용자에게는 같은 실패다. 상태 코드가 없으므로 0 으로 남긴다.
    reportError("NETWORK_ERROR", 0, path);
    throw new ApiError(0, "NETWORK_ERROR", cause instanceof Error ? cause.message : "요청을 보내지 못했습니다.");
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const code = problem?.code ?? ErrorCode.enum.INTERNAL_SERVER_ERROR;

    reportError(code, response.status, path);
    throw new ApiError(response.status, code, problem?.detail ?? "요청을 처리하지 못했습니다.");
  }

  return checkResponse(schema, response, path);
};

/**
 * 실패 응답에서 오류 코드와 설명을 꺼낸다. 본문이 비어 있거나 JSON 이 아닐 수 있어
 * 어느 쪽이든 화면이 쓸 수 있는 ApiError 로 바꾼다.
 */
const toApiError = async (response: Response, path: string): Promise<ApiError> => {
  const problem = await response.json().catch(() => null);
  const code = problem?.code ?? ErrorCode.enum.INTERNAL_SERVER_ERROR;

  reportError(code, response.status, path);
  return new ApiError(response.status, code, problem?.detail ?? "요청을 처리하지 못했습니다.");
};

const networkError = (cause: unknown, path: string): ApiError => {
  reportError("NETWORK_ERROR", 0, path);
  return new ApiError(0, "NETWORK_ERROR", cause instanceof Error ? cause.message : "요청을 보내지 못했습니다.");
};

/**
 * 선택적으로 본문을 보내고 응답을 받지 않는 요청. 204 처럼 내용이 없는 응답을 돌려주는 곳에 쓴다.
 * 캐시를 두지 않는다. 보내는 요청은 저장해 두었다 다시 쓸 수 있는 종류가 아니다.
 */
export const apiPost = async (path: string, body?: unknown): Promise<void> => {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  }).catch((cause: unknown) => {
    throw networkError(cause, path);
  });

  if (!response.ok) throw await toApiError(response, path);
};

/**
 * 파일을 보내고 결과를 받는 요청. Content-Type 을 직접 정하지 않는다.
 * FormData 를 넘기면 브라우저가 multipart 경계 문자열까지 붙여 준다.
 */
export const apiPostForm = async <T>(path: string, schema: ZodType<T>, form: FormData): Promise<T> => {
  const response = await fetch(apiUrl(path), { method: "POST", body: form }).catch((cause: unknown) => {
    throw networkError(cause, path);
  });

  if (!response.ok) throw await toApiError(response, path);

  return checkResponse(schema, response, path);
};
