import http from "k6/http";
import { check } from "k6";

const baseUrl = (__ENV.BASE_URL || "https://staging.poudy.site").replace(/\/$/, "");
const resultFile = __ENV.RESULT_FILE || "summary.json";
const testStages = [
  { target: 1, duration: "30s" },
  { target: 3, duration: "60s" },
  { target: 5, duration: "60s" },
  { target: 10, duration: "30s" },
  { target: 0, duration: "30s" },
];

// 적용 전후에 같은 스크립트·요청량·ramp-up 단계를 사용하기 위한 고정 시나리오다.
// 기본값은 staging 단일 EC2를 멈추지 않도록 보수적으로 설정한다.
export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  scenarios: {
    categories: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 10,
      maxVUs: 20,
      stages: testStages,
    },
  },
  // 이 threshold는 성능 통과 기준이 아니라 5xx·네트워크 오류가 발생하면
  // 부하를 중단하기 위한 안전장치다. 성능 기준은 baseline 측정 후 정한다.
  thresholds: {
    http_req_failed: [
      {
        threshold: "rate==0",
        abortOnFail: true,
        delayAbortEval: "10s",
      },
    ],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/api/categories`, {
    tags: { endpoint: "categories", test_target: "staging-api" },
    timeout: "10s",
  });

  check(response, {
    "categories returns 200": (res) => res.status === 200,
    "categories returns JSON": (res) =>
      String(res.headers["Content-Type"] || "").includes("application/json"),
  });
}

export function handleSummary(data) {
  const summary = {
    metadata: {
      baseUrl,
      endpoint: "/api/categories",
      method: "GET",
      generatedAt: new Date().toISOString(),
      stages: testStages,
    },
    metrics: data.metrics,
  };

  return {
    [resultFile]: JSON.stringify(summary, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const requests = data.metrics.http_reqs?.values;
  const duration = data.metrics.http_req_duration?.values;
  const failed = data.metrics.http_req_failed?.values;

  return [
    `base_url: ${baseUrl}`,
    `requests: ${requests?.count ?? "n/a"}`,
    `throughput: ${requests?.rate?.toFixed(2) ?? "n/a"}/s`,
    `avg: ${duration?.avg?.toFixed(2) ?? "n/a"} ms`,
    `p90: ${duration?.["p(90)"]?.toFixed(2) ?? "n/a"} ms`,
    `p95: ${duration?.["p(95)"]?.toFixed(2) ?? "n/a"} ms`,
    `p99: ${duration?.["p(99)"]?.toFixed(2) ?? "n/a"} ms`,
    `error_rate: ${((failed?.rate ?? 0) * 100).toFixed(2)}%`,
  ].join("\n");
}
