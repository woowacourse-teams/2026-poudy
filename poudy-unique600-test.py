#!/usr/bin/env python3
"""Replay 40 source images at 15 widths against the test frontend."""

from __future__ import annotations

import sys
import time
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import Request, urlopen


TEST_BASE = "http://13.124.56.13"
HOST = "poudy.site"
SOURCE_FILE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/poudy-s3-urls.txt")
IMAGE_PATH_FILE = Path("/tmp/poudy-image-paths-expanded.txt")
RESULT_FILE = Path(
    os.environ.get("RESULT_FILE", "/tmp/poudy-unique600-results.tsv")
)
WORKERS = 24
SOURCE_OFFSET = int(os.environ.get("SOURCE_OFFSET", "0"))
SOURCE_COUNT = int(os.environ.get("SOURCE_COUNT", "40"))
WIDTHS = (16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 3840)


def load_sources() -> list[str]:
    if SOURCE_FILE.exists():
        sources = [line.strip() for line in SOURCE_FILE.read_text().splitlines() if line.strip()]
    elif IMAGE_PATH_FILE.exists():
        sources = []
        seen: set[str] = set()
        for line in IMAGE_PATH_FILE.read_text().splitlines():
            try:
                source = parse_qs(urlsplit(line.strip()).query).get("url", [""])[0]
            except ValueError:
                continue
            if (
                source.startswith(
                    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/"
                )
                and source not in seen
            ):
                seen.add(source)
                sources.append(source)
        print(f"source fallback={IMAGE_PATH_FILE} unique_s3_sources={len(sources)}")
    else:
        raise SystemExit(
            f"입력 파일이 없습니다: {SOURCE_FILE} 또는 {IMAGE_PATH_FILE} 중 하나가 필요합니다."
        )

    selected = sources[SOURCE_OFFSET : SOURCE_OFFSET + SOURCE_COUNT]
    if len(selected) < SOURCE_COUNT:
        raise SystemExit(
            f"고유 S3 URL이 {len(sources)}개뿐이라 offset={SOURCE_OFFSET}, "
            f"count={SOURCE_COUNT} 구간을 만들 수 없습니다."
        )
    return selected


def fetch(args: tuple[int, str, int]) -> tuple[int, int, int | None, int, float, str]:
    index, source, width = args
    target = (
        f"{TEST_BASE}/_next/image"
        f"?url={quote(source, safe='')}&w={width}&q=75"
    )
    request = Request(
        target,
        headers={
            "Host": HOST,
            "Accept": "*/*",
            "User-Agent": "Python-urllib/3.12",
        },
    )
    started = time.monotonic()

    try:
        with urlopen(request, timeout=25) as response:
            body_size = len(response.read())
            return index, width, response.status, body_size, time.monotonic() - started, ""
    except HTTPError as error:
        return index, width, error.code, 0, time.monotonic() - started, f"HTTPError: {error}"
    except Exception as error:  # noqa: BLE001 - the test must record every failure
        return index, width, None, 0, time.monotonic() - started, f"{type(error).__name__}: {error}"


def percentile(values: list[float], ratio: float) -> float:
    ordered = sorted(values)
    position = min(len(ordered) - 1, int((len(ordered) - 1) * ratio))
    return ordered[position]


def main() -> None:
    sources = load_sources()
    jobs = [(index, source, width) for index, source in enumerate(sources) for width in WIDTHS]

    print(f"target={TEST_BASE}")
    print(f"sources={len(sources)} widths={len(WIDTHS)} jobs={len(jobs)} workers={WORKERS}")
    print(f"results={RESULT_FILE}")

    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        results = list(executor.map(fetch, jobs))
    elapsed = time.monotonic() - started

    durations = [result[4] for result in results]
    success = sum(result[2] == 200 for result in results)
    failures = len(results) - success
    statuses: dict[str, int] = {}
    for result in results:
        key = str(result[2]) if result[2] is not None else "error"
        statuses[key] = statuses.get(key, 0) + 1

    with RESULT_FILE.open("w") as output:
        for index, width, status, body_size, duration, error in results:
            output.write(
                f"{index}\t{width}\t{status}\t{body_size}\t{duration:.6f}\t{error}\n"
            )

    print(f"total={len(results)} success={success} failed={failures}")
    print("statuses=" + ", ".join(f"{key}:{value}" for key, value in sorted(statuses.items())))
    print(
        f"elapsed={elapsed:.3f}s min={min(durations):.3f}s "
        f"p50={percentile(durations, 0.50):.3f}s "
        f"p95={percentile(durations, 0.95):.3f}s "
        f"p99={percentile(durations, 0.99):.3f}s "
        f"max={max(durations):.3f}s"
    )

    errors = [result for result in results if result[5]]
    for index, width, status, _body_size, _duration, error in errors[:20]:
        print(f"ERROR index={index} width={width} status={status} {error}")


if __name__ == "__main__":
    main()
