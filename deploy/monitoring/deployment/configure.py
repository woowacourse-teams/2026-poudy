#!/usr/bin/env python3
"""Root-only provisioning helper. Never print Grafana credentials or webhook URLs."""
import argparse
import base64
import json
import math
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request

import collector

BASE = Path("/opt/poudy-monitoring")


def api(path, data=None, method=None):
    container = json.loads(subprocess.check_output(["docker", "inspect", "poudy-grafana"]))[0]
    env = dict(item.split("=", 1) for item in container["Config"]["Env"] if "=" in item)
    credential = env.get("GF_SECURITY_ADMIN_USER", "admin") + ":" + env["GF_SECURITY_ADMIN_PASSWORD"]
    request = urllib.request.Request("http://127.0.0.1:3000" + path,
        data=json.dumps(data).encode() if data is not None else None,
        method=method, headers={"Authorization": "Basic " + base64.b64encode(credential.encode()).decode(),
                              "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read()
        return json.loads(body) if body else None


def thresholds():
    limits, samples = {}, {}
    for group in collector.GROUPS:
        ids = collector.aws("deploy", "list-deployments", application_name="poudy-codedeploy",
            deployment_group_name=group, create_time_range={"start": collector.iso(time.time() - 14 * 86400)})["deployments"][:25]
        infos = collector.aws("deploy", "batch-get-deployments", deployment_ids=ids)["deploymentsInfo"] if ids else []
        durations = sorted(collector.seconds(i["completeTime"]) - collector.seconds(i["createTime"])
                           for i in infos if i["status"] == "Succeeded" and i.get("completeTime"))
        limits[group] = max(600, math.ceil(durations[math.ceil(len(durations) * .95) - 1] * 2 / 60) * 60) if durations else 1800
        samples[group] = {"count": len(durations), "max_seconds": round(max(durations), 1) if durations else None,
                          "threshold_seconds": limits[group], "rollback_records": [
                              {"id": i["deploymentId"], "creator": i.get("creator"), "rollback": i.get("rollbackInfo")}
                              for i in infos if i.get("creator") == "codeDeployRollback" or i.get("rollbackInfo")]}
    return limits, samples


def rule(uid, title, expression, receiver, environment, pending="0s"):
    return {"uid": uid, "title": title, "condition": "C", "for": pending,
        "noDataState": "Alerting" if environment == "monitoring" else "OK", "execErrState": "Error",
        "annotations": {"summary": title,
                        "description": "失敗 집계와 재시도를 포함할 수 있습니다. 개별 배포나 전체 릴리스의 복구 완료 판정이 아닙니다.".replace("失敗", "실패")},
        "labels": {"environment": environment, "severity": "warning", "source": "deployment-observer"},
        "notification_settings": {"receiver": receiver, "group_by": ["grafana_folder", "alertname", "target"],
                                  "group_wait": "30s", "group_interval": "5m", "repeat_interval": "4h"},
        "data": [
            {"refId": "A", "relativeTimeRange": {"from": 600, "to": 0}, "datasourceUid": "prometheus",
             "model": {"refId": "A", "expr": expression, "instant": True, "range": False,
                       "intervalMs": 1000, "maxDataPoints": 43200, "datasource": {"type": "prometheus", "uid": "prometheus"}}},
            {"refId": "C", "relativeTimeRange": {"from": 0, "to": 0}, "datasourceUid": "__expr__",
             "model": {"refId": "C", "type": "threshold", "expression": "A", "conditions": [
                 {"evaluator": {"type": "gt", "params": [0]}, "operator": {"type": "and"},
                  "query": {"params": ["C"]}, "reducer": {"type": "last", "params": []}, "type": "query"}],
                 "datasource": {"type": "__expr__", "uid": "__expr__"}}}]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["inspect", "apply", "reload"])
    args = parser.parse_args()
    if args.mode == "reload":
        api("/api/admin/provisioning/alerting/reload", {}, "POST")
        print("Grafana alert provisioning reloaded")
        return
    points = api("/api/v1/provisioning/contact-points")
    names = sorted({p["name"] for p in points if p["type"] == "discord"})
    print("discord_contact_names", json.dumps(names))
    if args.mode == "inspect":
        existing = api("/api/v1/provisioning/alert-rules")
        print("rule_example", json.dumps({key: existing[0].get(key) for key in ["title", "notification_settings"]}))
    limits, samples = thresholds()
    collector.atomic_json(BASE / "deployment/history-summary.json", samples)
    print("deployment_history", json.dumps(samples))
    if args.mode == "inspect":
        return
    for expected in ["Discord Production", "Discord Staging"]:
        if expected not in names:
            raise RuntimeError("Expected existing Discord contact point is missing: " + expected)
    backup = BASE / "backup" / ("deployment-977-" + str(int(time.time())))
    backup.mkdir(parents=True)
    config = Path("/etc/poudy-deployment-monitor/config.json")
    shutil.copy2(config, backup / "config.json")
    current = json.loads(config.read_text())
    current["long_running_seconds"] = limits
    collector.atomic_json(config, current)
    config.chmod(0o644)
    rules = []
    for environment, receiver, label in [("production", "Discord Production", "운영"), ("staging", "Discord Staging", "스테이징")]:
        rules.append(rule("poudy-ci-fail-" + environment, "AWS 파이프라인·빌드 실패 집계 — " + label,
                          'time() - poudy_ci_last_failure_observed_seconds{environment="' + environment + '"} < bool 900',
                          receiver, environment))
    rules += [rule("poudy-deploy-collector-health", "배포 수집기 조회·생존 이상",
                   '(clamp_max((max(time() - poudy_deployment_collector_cycle_seconds) > bool 180) + (1 - min(poudy_deployment_collector_up)), 1)) or absent(poudy_deployment_collector_cycle_seconds)',
                   "Discord Production", "monitoring", "3m"),
              rule("poudy-deploy-delivery-pending", "배포 알림 전송 대기 지속",
                   'max(poudy_deployment_pending_notifications) > bool 0',
                   "Discord Production", "monitoring", "10m")]
    target = BASE / "config/grafana/provisioning/alerting/poudy-deployment.json"
    target.parent.mkdir(exist_ok=True)
    if target.exists():
        shutil.copy2(target, backup / "poudy-deployment.json")
    collector.atomic_json(target, {"apiVersion": 1, "groups": [{"orgId": 1, "name": "poudy-deployment",
        "folder": "Poudy Deployment Alert", "interval": "60s", "rules": rules}]})
    target.chmod(0o644)
    prometheus = BASE / "config/prometheus/prometheus.yml"
    shutil.copy2(prometheus, backup / "prometheus.yml")
    contents = prometheus.read_text()
    if 'job_name: poudy_deployment_monitor' not in contents:
        with prometheus.open("a") as stream:
            stream.write('\n  - job_name: poudy_deployment_monitor\n    scrape_interval: 60s\n    static_configs:\n      - targets: ["172.18.0.1:9830"]\n        labels:\n          environment: monitoring\n          service: poudy-deployment-monitor\n')
    print("Public provisioning written; reload pending; backup", str(backup))


if __name__ == "__main__":
    main()
