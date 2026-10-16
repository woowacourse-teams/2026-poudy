import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";
import { Counter, Rate } from "k6/metrics";

// Synthetic backend request shares, traced to UI flows; not production frequencies.
const routes = [
  { name: "keyword_list", weight: 20, path: "/api/products?keyword=%ED%86%A0%EB%84%88", kind: "page" },
  { name: "suggestions", weight: 20, path: "/api/products/suggestions?keyword=%ED%86%A0%EB%84%88", kind: "suggestions" },
  { name: "skin_list", weight: 15, path: "/api/products?skinType=DRY", kind: "page" },
  { name: "category_list", weight: 15, path: "/api/products?categoryIds=2", kind: "page" },
  { name: "ingredient_list", weight: 10, path: "/api/products?includeIngredientIds=6", kind: "page" },
  { name: "detail", weight: 10, path: "/api/products/1", kind: "detail" },
  { name: "curation", weight: 5, path: "/api/curations/1", kind: "curation" },
  { name: "rankings", weight: 5, path: "/api/products/rankings?days=7", kind: "rankings" },
];
const weighted = routes.flatMap((route) => Array(route.weight).fill(route));
const schedule = Array.from({ length: 100 }, (_, i) => weighted[(i * 37) % 100]);
const baseUrl = (__ENV.BASE_URL || "https://staging.poudy.site").replace(/\/$/, "");
if (baseUrl !== "https://staging.poudy.site") throw new Error("Use the staging API host only");
const rate = Number(__ENV.RATE || 1);
const duration = __ENV.DURATION || "2m";
const badPayload = new Rate("invalid_payload");
const status5xx = new Counter("status_5xx");
const transport = new Counter("transport_failures");

const thresholds = {
  http_req_failed: [{ threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "1m" }],
  invalid_payload: [{ threshold: "rate==0", abortOnFail: true, delayAbortEval: "10s" }],
  dropped_iterations: ["count==0"],
};
for (const route of routes) {
  thresholds[`http_req_duration{endpoint:${route.name}}`] = ["p(95)<=250"];
  thresholds[`http_reqs{endpoint:${route.name}}`] = ["count>0"];
  thresholds[`http_req_failed{endpoint:${route.name}}`] = ["rate<0.001"];
}
export const options = {
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
  scenarios: { reads: { executor: "constant-arrival-rate", rate, timeUnit: "1s", duration,
    preAllocatedVUs: 50, maxVUs: 100, gracefulStop: "15s" } },
  thresholds,
};

export function validBody(route, body) {
  if (!body || typeof body !== "object") return false;
  if (route.kind === "detail") return body.id === 1 && typeof body.name === "string" && body.selectedPart?.ingredients?.length > 0;
  if (route.kind === "curation") return body.id === 1 && body.blocks?.length > 0;
  if (!Array.isArray(body.items) || body.items.length === 0) return false;
  if (route.kind === "rankings") return body.items.every((x) => Number.isInteger(x.product?.id) && x.product.name);
  if (!body.pagination || body.pagination.page !== 1 || body.pagination.totalElements < body.items.length) return false;
  if (!body.items.every((x) => Number.isInteger(x.id) && typeof x.name === "string" && x.name.length > 0)) return false;
  if (route.kind === "suggestions") return body.items.every((x) => x.match && typeof x.match.text === "string"
    && x.match.startIndex >= 0 && x.match.endIndexExclusive > x.match.startIndex
    && x.match.endIndexExclusive <= x.match.text.length);
  return body.items.every((x) => Number.isInteger(x.brand?.id) && typeof x.price === "number");
}

export default function () {
  const route = schedule[exec.scenario.iterationInTest % schedule.length];
  const response = http.get(baseUrl + route.path, {
    tags: { endpoint: route.name }, timeout: "10s",
    headers: { "User-Agent": "poudy-load-test/issue-679", "X-Poudy-Experiment": "issue-679-user-paths" },
  });
  let body;
  try { body = response.json(); } catch { body = null; }
  const valid = response.status === 200 && validBody(route, body);
  badPayload.add(!valid, { endpoint: route.name });
  status5xx.add(response.status >= 500 ? 1 : 0);
  transport.add(response.status === 0 ? 1 : 0);
  check(response, { "status 200 and meaningful response": () => valid }, { endpoint: route.name });
}

export function handleSummary(data) {
  const result = { metadata: { baseUrl, rate, duration, generatedAt: new Date().toISOString(),
    routes, preAllocatedVUs: 50, maxVUs: 100, scenarioVersion: "user-paths-v1", requestMethod: "GET" }, ...data };
  return { [__ENV.RESULT_FILE || "summary.json"]: JSON.stringify(result, null, 2) };
}
