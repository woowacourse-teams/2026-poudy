#!/usr/bin/env python3
"""Serial AWS polling on Monitoring EC2; durable outbox and Prometheus metrics."""
import datetime as dt
import http.server
import json
import logging
import os
import re
from pathlib import Path
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

REGION = "ap-northeast-2"
GROUPS = {
    "poudy-backend-dg": ("production", "BE"),
    "poudy-frontend-dg": ("production", "FE"),
    "poudy-backend-staging-dg": ("staging", "BE"),
    "poudy-frontend-staging-dg": ("staging", "FE"),
}
TARGETS = [
    ("production", "pipeline", "all", "poudy-pipeline"),
    ("staging", "pipeline", "all", "poudy-staging-pipeline"),
    ("production", "build", "BE", "poudy-codebuild"),
    ("production", "build", "FE", "poudy-frontend-codebuild"),
    ("staging", "build", "BE", "poudy-staging-codebuild"),
    ("staging", "build", "FE", "poudy-staging-frontend-codebuild"),
]
TERMINAL = {"Succeeded", "Failed", "Stopped"}
STATE = Path(os.environ.get("DEPLOY_STATE", "/var/lib/poudy-deployment-monitor/state.json"))
CONFIG = Path(os.environ.get("DEPLOY_CONFIG", "/etc/poudy-deployment-monitor/config.json"))
LOCK = threading.Lock()
METRICS = b"poudy_deployment_collector_up 0\n"


def iso(stamp):
    return dt.datetime.fromtimestamp(stamp, dt.timezone.utc).isoformat().replace("+00:00", "Z")


def seconds(value):
    if isinstance(value, (float, int)):
        return value
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def atomic_json(path, value):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w") as stream:
        json.dump(value, stream)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


def aws(service, operation, **arguments):
    command = ["aws", service, operation, "--region", REGION, "--output", "json", "--no-cli-pager"]
    for key, value in arguments.items():
        command += ["--" + key.replace("_", "-"), value if isinstance(value, str) else json.dumps(value)]
    # Never use an operator's saved credentials or profile in this long-running service.
    env = {key: value for key, value in os.environ.items() if not key.startswith("AWS_")}
    env.update(AWS_CONFIG_FILE="/dev/null", AWS_SHARED_CREDENTIALS_FILE="/dev/null",
               AWS_RETRY_MODE="standard", AWS_MAX_ATTEMPTS="3", AWS_PAGER="")
    completed = subprocess.run(command, capture_output=True, text=True, timeout=45, env=env)
    if completed.returncode:
        # API stderr may contain resource details. Emit only operation and exit code.
        match = re.search(r"\(([A-Za-z][A-Za-z0-9]+)\)|Unable to locate credentials|Permission denied|HOME", completed.stderr)
        reason = match.group(0) if match else "unclassified CLI error"
        raise RuntimeError(f"AWS {service}:{operation} exit={completed.returncode} {reason}")
    return json.loads(completed.stdout)


def enqueue(state, info, status, now, rollback=False):
    deployment_id = info["deploymentId"]
    event_id = f"{deployment_id}:{status}"
    if event_id in state["events"]:
        return
    payload = {"kind": "deployment-status", "eventId": event_id,
               "deploymentId": deployment_id, "group": info["deploymentGroupName"],
               "status": status, "timestamp": iso(seconds(info.get("completeTime") or now) if status in TERMINAL else time.time())}
    code = info.get("errorInformation", {}).get("code")
    if code:
        payload["errorCode"] = code[:160]
    # Enable only after checking historical CodeDeploy rollback linkage for this account.
    original = (info.get("rollbackInfo") or {}).get("rollbackTriggeringDeploymentId")
    if rollback and info.get("creator") == "codeDeployRollback" and original:
        payload["rollbackOf"] = original
    state["events"][event_id] = {"payload": payload, "sent": False, "created": now}


def deployments(state, config, now):
    healthy = True
    for group in GROUPS:
        previous = state["groups"].get(group)
        start = previous - 600 if previous else now - 86400
        try:
            # AWS CLI paginates the full result; there is deliberately no --max-items.
            ids = aws("deploy", "list-deployments", application_name="poudy-codedeploy",
                      deployment_group_name=group, create_time_range={"start": iso(start)})["deployments"]
            if previous is None:
                ids += aws("deploy", "list-deployments", application_name="poudy-codedeploy",
                           deployment_group_name=group,
                           include_only_statuses=["Created", "Queued", "InProgress"])["deployments"]
            ids = set(ids) | {key for key, value in state["deployments"].items()
                              if value["group"] == group and value["status"] not in TERMINAL}
            infos = []
            ids = sorted(ids)
            for offset in range(0, len(ids), 25):
                infos += aws("deploy", "batch-get-deployments",
                             deployment_ids=ids[offset:offset + 25])["deploymentsInfo"]
            for info in infos:
                if info["deploymentGroupName"] != group:
                    raise RuntimeError("Unexpected deployment group")
                key, status = info["deploymentId"], info["status"]
                old = state["deployments"].get(key)
                # First installation silently baselines completed history, but keeps active work.
                if (previous is not None or status not in TERMINAL) and (old is None or old["status"] != status):
                    if status in TERMINAL | {"Created", "Queued", "InProgress"}:
                        enqueue(state, info, status, now, config.get("rollback_linkage_verified", False))
                if status not in TERMINAL and now - seconds(info["createTime"]) > config["long_running_seconds"][group]:
                    enqueue(state, info, "LongRunning", now)
                state["deployments"][key] = {"group": group, "status": status, "seen": now}
            state["groups"][group] = now
            state["group_success"][group] = now
        except (RuntimeError, subprocess.TimeoutExpired, ValueError, KeyError) as error:
            logging.error("Deployment query failed: %s: %s", group, str(error))
            healthy = False
    return healthy


def cloudwatch(state, now):
    queries = []
    for i, (_, kind, _, target) in enumerate(TARGETS):
        metric = {"Namespace": "AWS/CodePipeline" if kind == "pipeline" else "AWS/CodeBuild",
                  "MetricName": "FailedPipelineExecutions" if kind == "pipeline" else "FailedBuilds",
                  "Dimensions": [{"Name": "Pipeline" if kind == "pipeline" else "ProjectName", "Value": target}]}
        queries.append({"Id": f"m{i}", "MetricStat": {"Metric": metric, "Period": 60, "Stat": "Sum"}})
    previous = state.get("cloudwatch_success")
    start = max(previous - 3600, now - 7 * 86400) if previous else now - 3600
    result = aws("cloudwatch", "get-metric-data", metric_data_queries=queries,
                 start_time=iso(start), end_time=iso(now), scan_by="TimestampAscending")
    by_id = {f"m{i}": [] for i in range(len(TARGETS))}
    for row in result["MetricDataResults"]:
        if row["StatusCode"] != "Complete":
            raise RuntimeError("Incomplete CloudWatch response")
        by_id[row["Id"]] += list(zip(row["Timestamps"], row["Values"]))
    for i, (_, _, _, target) in enumerate(TARGETS):
        counter = state["cloudwatch"].setdefault(target, {"points": {}, "total": 0, "last_failure": 0})
        for timestamp, value in by_id[f"m{i}"]:
            old = counter["points"].get(timestamp, 0)
            if previous is not None and value > old:
                counter["total"] += value - old
                counter["last_failure"] = now
            counter["points"][timestamp] = value
        counter["points"] = {key: value for key, value in counter["points"].items()
                             if seconds(key) > now - 7 * 86400}
    state["cloudwatch_success"] = now


def post(config, path, payload=None):
    request = urllib.request.Request(config["worker_origin"] + path,
        data=json.dumps(payload).encode() if payload is not None else b"",
        headers={"Authorization": "Bearer " + os.environ["DEPLOY_NOTIFY_TOKEN"],
                 "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (compatible; PoudyDeploymentMonitor/1.0; +https://poudy.site)"}, method="POST")
    # Do not follow redirects with an Authorization header.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args):
            return None
    with urllib.request.build_opener(NoRedirect).open(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError("Notification not acknowledged")


def flush(state, config, now):
    attempted = 0
    for event in state["events"].values():
        if event["sent"] or now < event.get("retry_after", 0):
            continue
        if attempted >= 5:
            return
        attempted += 1
        try:
            post(config, "/deployment-notify", event["payload"])
        except (urllib.error.URLError, TimeoutError, RuntimeError) as error:
            attempt = min(event.get("retry_attempt", 0) + 1, 7)
            delay = min(3600, 60 * 2 ** (attempt - 1))
            if isinstance(error, urllib.error.HTTPError) and error.code == 429:
                try:
                    delay = max(delay, min(3600, float(error.headers.get("Retry-After", "60"))))
                except ValueError:
                    pass
            if isinstance(error, urllib.error.HTTPError):
                error.close()
            event["retry_attempt"], event["retry_after"] = attempt, now + delay
            logging.warning("Deployment delivery postponed; retry in %ss", delay)
            continue
        event["retry_attempt"] = 0
        event["sent"] = True
        event["sent_at"] = time.time()
        atomic_json(STATE, state)


def render(state, healthy, now):
    rows = [f"poudy_deployment_collector_up {int(healthy)}",
            f"poudy_deployment_collector_cycle_seconds {now}",
            f"poudy_deployment_cloudwatch_success_seconds {state.get('cloudwatch_success', 0)}",
            f"poudy_deployment_pending_notifications {sum(not e['sent'] for e in state['events'].values())}"]
    for group, stamp in state["group_success"].items():
        rows.append(f'poudy_deployment_group_success_seconds{{group="{group}"}} {stamp}')
    for environment, kind, component, target in TARGETS:
        counter = state["cloudwatch"].get(target, {})
        labels = f'environment="{environment}",kind="{kind}",component="{component}",target="{target}"'
        rows += [f'poudy_ci_failures_total{{{labels}}} {counter.get("total", 0)}',
                 f'poudy_ci_last_failure_observed_seconds{{{labels}}} {counter.get("last_failure", 0)}']
    global METRICS
    with LOCK:
        METRICS = ("\n".join(rows) + "\n").encode()


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_error(404)
            return
        with LOCK:
            body = METRICS
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


def monitoring_ready():
    for url in ["http://127.0.0.1:3000/api/health", "http://127.0.0.1:9090/-/ready"]:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status != 200:
                    return False
        except (urllib.error.URLError, TimeoutError):
            return False
    return True


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    config = json.loads(CONFIG.read_text())
    origin = urllib.parse.urlparse(config["worker_origin"])
    if origin.scheme != "https" or origin.netloc != "poudy-discord-worker.inaemin.workers.dev" or origin.path:
        raise ValueError("Unexpected Worker origin")
    if not os.environ.get("DEPLOY_NOTIFY_TOKEN"):
        raise ValueError("Missing deployment credential")
    state = json.loads(STATE.read_text()) if STATE.exists() else {
        "groups": {}, "group_success": {}, "deployments": {}, "events": {}, "cloudwatch": {}}
    server = http.server.ThreadingHTTPServer((config["listen_address"], 9830), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    while True:
        started = time.monotonic()
        now = time.time()
        healthy = deployments(state, config, now)
        try:
            cloudwatch(state, now)
        except (RuntimeError, subprocess.TimeoutExpired, ValueError, KeyError):
            healthy = False
            logging.error("CloudWatch query failed")
        healthy = monitoring_ready() and healthy
        # Save observations and outbox together before attempting network delivery.
        atomic_json(STATE, state)
        flush(state, config, now)
        if healthy and now - state.get("heartbeat", 0) >= 300:
            try:
                post(config, "/deployment-heartbeat")
                state["heartbeat"] = now
            except (urllib.error.URLError, TimeoutError, RuntimeError):
                logging.warning("External heartbeat postponed")
        cutoff = now - 30 * 86400
        state["events"] = {key: value for key, value in state["events"].items()
                           if not value["sent"] or value["created"] > cutoff}
        state["deployments"] = {key: value for key, value in state["deployments"].items()
                                if value["status"] not in TERMINAL or value["seen"] > cutoff}
        atomic_json(STATE, state)
        render(state, healthy, now)
        logging.info("Cycle completed: healthy=%s pending=%s", healthy,
                     sum(not event["sent"] for event in state["events"].values()))
        time.sleep(max(1, 60 - (time.monotonic() - started)))


if __name__ == "__main__":
    main()
