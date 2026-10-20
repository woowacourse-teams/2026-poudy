"""공개 HTTP/2 검증이 HTTP/1.1 fallback이나 잘못된 응답을 성공으로 보지 않는지 확인한다."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "codedeploy/frontend/scripts/verify-http2.sh"


class FrontendHttp2Test(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.calls = self.root / "calls.jsonl"
        curl = self.root / "curl"
        curl.write_text("""#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
with Path(os.environ['HTTP2_TEST_CALLS']).open('a') as output:
    output.write(json.dumps(sys.argv[1:]) + '\\n')
alias = sys.argv[-1].startswith('https://www.')
if os.environ.get('HTTP2_TEST_CURL_FAILURE') == '1':
    sys.exit(60)
default = '301 2 redirect=https://poudy.site/products/601?source=canonical-probe' if alias else '200 2 redirect='
key = 'HTTP2_TEST_ALIAS_RESPONSE' if alias else 'HTTP2_TEST_CANONICAL_RESPONSE'
print(os.environ.get(key, default), end='')
""")
        curl.chmod(0o755)
        self.env = {
            **os.environ,
            "PATH": f"{self.root}:{os.environ['PATH']}",
            "HTTP2_TEST_CALLS": str(self.calls),
        }

    def probe(self, *hosts, **overrides):
        return subprocess.run(
            ["bash", str(SCRIPT), *hosts],
            env={**self.env, **overrides},
            capture_output=True,
            text=True,
        )

    def test_public_http2_and_canonical_redirect(self):
        result = self.probe("poudy.site", "www.poudy.site")
        self.assertEqual(0, result.returncode, result.stderr)
        calls = [json.loads(line) for line in self.calls.read_text().splitlines()]
        self.assertEqual(2, len(calls))
        self.assertEqual("https://poudy.site/", calls[0][-1])
        self.assertEqual("https://www.poudy.site/products/601?source=canonical-probe", calls[1][-1])
        for call in calls:
            self.assertIn("--http2", call)
            self.assertIn("--fail", call)
            for option in ["--insecure", "--resolve", "--location"]:
                self.assertNotIn(option, call)

    def test_staging_without_alias(self):
        result = self.probe("staging.poudy.site")
        self.assertEqual(0, result.returncode, result.stderr)
        calls = self.calls.read_text().splitlines()
        self.assertEqual(1, len(calls))
        self.assertEqual("https://staging.poudy.site/", json.loads(calls[0])[-1])

    def test_canonical_fallback_and_unexpected_status_fail(self):
        for response in ["200 1.1 redirect=", "301 2 redirect=https://other.site/", "404 2 redirect=", "500 2 redirect="]:
            with self.subTest(response=response):
                result = self.probe("poudy.site", HTTP2_TEST_CANONICAL_RESPONSE=response)
                self.assertNotEqual(0, result.returncode)
                self.assertIn("unexpected HTTP/2 response", result.stderr)

    def test_alias_fallback_and_wrong_redirect_fail(self):
        for response in [
            "301 1.1 redirect=https://poudy.site/products/601?source=canonical-probe",
            "301 2 redirect=https://poudy.site/",
            "200 2 redirect=",
        ]:
            with self.subTest(response=response):
                result = self.probe("poudy.site", "www.poudy.site", HTTP2_TEST_ALIAS_RESPONSE=response)
                self.assertNotEqual(0, result.returncode)
                self.assertIn("unexpected HTTP/2 response", result.stderr)

    def test_tls_or_curl_failure_fails(self):
        result = self.probe("poudy.site", HTTP2_TEST_CURL_FAILURE="1")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("HTTP/2 probe failed", result.stderr)

    def test_missing_host_fails_before_request(self):
        result = self.probe()
        self.assertNotEqual(0, result.returncode)
        self.assertFalse(self.calls.exists())


if __name__ == "__main__":
    unittest.main()
