import datetime as dt
import importlib.util
import ipaddress
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("crawl_report", Path(__file__).resolve().parents[1] / "scripts/report-google-crawls.py")
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class GoogleCrawlsTest(unittest.TestCase):
    def test_verified_bot_and_inspection_are_separate_and_other_hosts_are_excluded(self):
        def row(ip, agent, tail="host=poudy.site", hour=1):
            return f'{ip} [2026-10-23T{hour:02}:00:00+00:00] "GET /products/1200 HTTP/2.0" 200 100 0.02 200 "{agent}" {tail}'
        result = report.summarize([
            row("66.249.66.1", "Googlebot/2.1"),
            row("66.249.66.1", "Google-InspectionTool/1.0"),
            row("192.0.2.1", "Googlebot/2.1"),
            row("66.249.66.1", "Googlebot/2.1", "host=www.poudy.site"),
            row("66.249.66.1", "Googlebot/2.1", "", hour=0),
        ], [ipaddress.ip_network("66.249.66.0/24")], ["/products/1200"],
            dt.datetime.fromisoformat("2026-10-23T00:30:00+00:00"), "poudy.site")
        self.assertEqual(1, result["urls"]["/products/1200"]["googlebot"])
        self.assertEqual(1, result["urls"]["/products/1200"]["inspection"])
        self.assertEqual("2026-10-23T10:00:00+09:00", result["urls"]["/products/1200"]["lastGooglebotKst"])
        self.assertEqual(0, result["matchedRequestsWithoutHost"])


if __name__ == "__main__":
    unittest.main()
