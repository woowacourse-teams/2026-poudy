#!/usr/bin/env python3
"""Google 공식 IP 범위와 운영 로그를 대조한다. 사용자 IP·쿼리는 출력하지 않는다."""
import argparse
import collections
import datetime as dt
import glob
import gzip
import ipaddress
import json
from pathlib import Path
import re
import urllib.request

IP_RANGES = "https://developers.google.com/static/crawling/ipranges/common-crawlers.json"
ROW = re.compile(r'^(\S+) \[([^\]]+)\] "\S+ (\S+) [^"]+" (\d+) \S+ [\d.]+ \S+ "([^"]*)"(.*)$')
KST = dt.timezone(dt.timedelta(hours=9))


def summarize(lines, networks, paths, since, host):
    results = {path: {"googlebot": 0, "inspection": 0, "statuses": collections.Counter(),
                      "lastGooglebotKst": None, "lastInspectionKst": None} for path in paths}
    missing_host = 0
    for line in lines:
        match = ROW.search(line)
        if not match:
            continue
        ip, timestamp, path, status, agent, tail = match.groups()
        kind = "inspection" if "Google-InspectionTool" in agent else "googlebot" if "Googlebot" in agent else None
        if kind is None or path not in results:
            continue
        try:
            valid = any(ipaddress.ip_address(ip) in network for network in networks)
            visited = dt.datetime.fromisoformat(timestamp)
        except ValueError:
            continue
        if not valid or visited < since:
            continue
        logged_host = re.search(r'\bhost=([^\s]+)', tail)
        if logged_host and logged_host[1] != host:
            continue
        if not logged_host:
            missing_host += 1
        result = results[path]
        result[kind] += 1
        result["statuses"][status] += 1
        key = "lastInspectionKst" if kind == "inspection" else "lastGooglebotKst"
        value = visited.astimezone(KST).isoformat()
        result[key] = max(result[key] or value, value)
    return {"urls": results, "matchedRequestsWithoutHost": missing_host}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--since", help="시간대가 있는 ISO 시각. 생략하면 설정의 baselineKst")
    parser.add_argument("--logs", default="/var/log/nginx/access.log*")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    since = dt.datetime.fromisoformat(args.since or config["baselineKst"])
    if since.tzinfo is None:
        parser.error("--since에는 시간대가 필요합니다.")
    with urllib.request.urlopen(IP_RANGES, timeout=20) as response:
        ranges = json.load(response)
    networks = [ipaddress.ip_network(next(iter(prefix.values()))) for prefix in ranges["prefixes"]]

    def lines():
        for filename in sorted(glob.glob(args.logs)):
            with (gzip.open if filename.endswith(".gz") else open)(filename, "rt", errors="replace") as stream:
                yield from stream

    paths = config["urls"] + config.get("inspectionControls", []) + ["/sitemap.xml", "/sitemap-pages.xml", "/sitemap-products.xml", "/sitemap-ingredients.xml"]
    report = summarize(lines(), networks, paths, since, config["host"])
    report.update({"asOfKst": dt.datetime.now(KST).isoformat(), "since": since.isoformat(),
                   "ipRangesCreated": ranges["creationTime"], "note": config["note"]})
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
