import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "https://staging.poudy.site").replace(/\/$/, "");
const rate = Number(__ENV.RATE || "1");
const duration = __ENV.DURATION || "60s";
const preAllocatedVUs = Number(__ENV.PREALLOCATED_VUS || "10");
const maxVUs = Number(__ENV.MAX_VUS || "20");
const resultFile = __ENV.RESULT_FILE || `capacity-${rate}rps.json`;

if (!Number.isInteger(rate) || rate <= 0) {
  throw new Error("RATE must be a positive integer");
}

if (!Number.isInteger(preAllocatedVUs) || preAllocatedVUs <= 0) {
  throw new Error("PREALLOCATED_VUS must be a positive integer");
}

if (!Number.isInteger(maxVUs) || maxVUs < preAllocatedVUs) {
  throw new Error("MAX_VUS must be an integer greater than or equal to PREALLOCATED_VUS");
}

const status200 = new Counter("capacity_status_200");
const status4xx = new Counter("capacity_status_4xx");
const status5xx = new Counter("capacity_status_5xx");
const statusOther = new Counter("capacity_status_other");
const transportFailures = new Counter("capacity_transport_failures");
const timeouts = new Counter("capacity_timeouts");

// 각 RATE 실행은 해당 도착률을 일정하게 유지하는 고정 부하 구간이다.
// 결과가 안정적일 때만 다음 RATE를 별도로 실행한다.
export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  scenarios: {
    categories: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration,
      preAllocatedVUs,
      maxVUs,
    },
  },
  // 성능 합격 기준이 아니라 5xx·네트워크 오류 발생 시 중단하는 안전장치다.
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
    tags: {
      endpoint: "categories",
      test_target: "staging-api",
      capacity_rate: String(rate),
    },
    timeout: "10s",
  });

  if (response.status === 200) status200.add(1);
  else if (response.status >= 400 && response.status < 500) status4xx.add(1);
  else if (response.status >= 500) status5xx.add(1);
  else statusOther.add(1);
  if (response.status === 0) transportFailures.add(1);
  if (response.error_code === 105) timeouts.add(1);

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
      rate,
      duration,
      preAllocatedVUs,
      maxVUs,
    },
    observations: {
      status200: countOf(data, "capacity_status_200"),
      status4xx: countOf(data, "capacity_status_4xx"),
      status5xx: countOf(data, "capacity_status_5xx"),
      statusOther: countOf(data, "capacity_status_other"),
      transportFailures: countOf(data, "capacity_transport_failures"),
      timeouts: countOf(data, "capacity_timeouts"),
      droppedIterations: valueOf(data, "dropped_iterations", "count"),
      maxVUs: valueOf(data, "vus", "max"),
    },
    metrics: data.metrics,
  };

  return {
    [resultFile]: JSON.stringify(summary, null, 2),
    stdout: textSummary(data),
  };
}

function countOf(data, metricName) {
  return data.metrics[metricName]?.values?.count ?? 0;
}

function valueOf(data, metricName, valueName) {
  return data.metrics[metricName]?.values?.[valueName] ?? null;
}

function textSummary(data) {
  const requests = data.metrics.http_reqs?.values;
  const durationMetric = data.metrics.http_req_duration?.values;
  const failed = data.metrics.http_req_failed?.values;
  const droppedIterations = valueOf(data, "dropped_iterations", "count");
  const maxVUsUsed = valueOf(data, "vus", "max");

  return [
    `base_url: ${baseUrl}`,
    `target_rate: ${rate}/s`,
    `duration: ${duration}`,
    `requests: ${requests?.count ?? "n/a"}`,
    `throughput: ${requests?.rate?.toFixed(2) ?? "n/a"}/s`,
    `avg: ${durationMetric?.avg?.toFixed(2) ?? "n/a"} ms`,
    `p90: ${durationMetric?.["p(90)"]?.toFixed(2) ?? "n/a"} ms`,
    `p95: ${durationMetric?.["p(95)"]?.toFixed(2) ?? "n/a"} ms`,
    `p99: ${durationMetric?.["p(99)"]?.toFixed(2) ?? "n/a"} ms`,
    `error_rate: ${((failed?.rate ?? 0) * 100).toFixed(2)}%`,
    `dropped_iterations: ${droppedIterations ?? "n/a"}`,
    `max_vus_used: ${maxVUsUsed ?? "n/a"}`,
  ].join("\n");
}
