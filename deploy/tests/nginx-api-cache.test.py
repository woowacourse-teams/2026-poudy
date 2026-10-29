"""실제 Nginx에서 공개 API TTL, 키 분리와 개인화/응답 헤더 보호를 검증한다.

실행: python3 deploy/tests/nginx-api-cache.test.py (Docker 필요, 서비스/빌드 캐시 접근 없음)
"""
import json
import ssl
import struct
import subprocess
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

DEPLOY = Path(__file__).resolve().parents[1]


class Upstream(BaseHTTPRequestHandler):
    count = 0

    def do_GET(self):
        type(self).count += 1
        body = json.dumps({"request": type(self).count, "path": self.path,
                           "origin": self.headers.get("Origin")}).encode()
        self.send_response(500 if "mode=error" in self.path else 200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        if "mode=no-store" in self.path:
            self.send_header("Cache-Control", "no-store")
        if "mode=private" in self.path:
            self.send_header("Cache-Control", "private")
        if "mode=set-cookie" in self.path:
            self.send_header("Set-Cookie", "member=upstream")
        self.end_headers()
        self.wfile.write(body)

    do_POST = do_GET

    def log_message(self, *_):
        pass


class ApiCacheTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="poudy-nginx-policy-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.root = Path(cls.tmp.name)
        cls.upstream = ThreadingHTTPServer(("0.0.0.0", 0), Upstream)
        cls.addClassCleanup(cls.upstream.server_close)
        cls.addClassCleanup(cls.upstream.shutdown)
        threading.Thread(target=cls.upstream.serve_forever, daemon=True).start()
        upstream_port = cls.upstream.server_port
        cert = cls.root / "cert"
        cert.mkdir()
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                        "-keyout", str(cert / "privkey.pem"), "-out", str(cert / "fullchain.pem"),
                        "-days", "1", "-subj", "/CN=poudy.site"], check=True, capture_output=True)
        cls.ports = {}
        cls.cache = cls.root / "cache"
        cls.cache.mkdir(mode=0o777)
        cls.cache.chmod(0o777)
        conf = cls.root / "conf"
        conf.mkdir()
        (conf / "backend.conf").write_text(
            f"upstream poudy_backend {{ server host.docker.internal:{upstream_port}; }}\n")
        # Exercise both deployment templates. Only listening/fixture upstreams change in the fixture.
        for mode in ["http", "https"]:
            template = DEPLOY / "nginx" / ("ec2-frontend-https.conf" if mode == "https" else "ec2-frontend.conf")
            rendered = cls.root / f"{mode}.conf"
            subprocess.run(["bash", "-c", 'source "$1"; load_frontend_site "$2" && '
                            'render_frontend_nginx_config "$3" "$4" 0', "bash",
                            str(DEPLOY / "scripts/lib/frontend-site.sh"),
                            str(DEPLOY / "config/frontend-site-production.env"),
                            str(template), str(rendered)], check=True)
            text = rendered.read_text().replace("127.0.0.1:3000", f"host.docker.internal:{upstream_port}")
            text = text.replace("listen 127.0.0.1:8081;", "listen 8081;")
            (conf / "site.conf").write_text(text)
            name = f"poudy976-cache-test-{mode}-{time.time_ns()}"
            cls.addClassCleanup(subprocess.run, ["docker", "rm", "-f", name], capture_output=True)
            subprocess.run(["docker", "run", "--detach", "--name", name,
                            "--add-host", "host.docker.internal:host-gateway",
                            "-p", "127.0.0.1::80", "-p", "127.0.0.1::443", "-p", "127.0.0.1::8081",
                            "-v", f"{DEPLOY / 'nginx/ec2-nginx.conf'}:/etc/nginx/nginx.conf:ro",
                            "-v", f"{conf}:/etc/nginx/conf.d:ro",
                            "-v", f"{cert}:/etc/letsencrypt/live/poudy.site:ro",
                            "-v", f"{cls.cache}:/var/cache/nginx", "nginx:1.27-alpine",
                            "sh", "-c", "mkdir -p /var/cache/nginx/poudy_categories "
                            "/var/cache/nginx/poudy_static /var/cache/nginx/poudy_sitemaps; "
                            "chown -R nginx:nginx /var/cache/nginx; exec nginx -g 'daemon off;'"],
                           check=True, capture_output=True)
            subprocess.run(["docker", "exec", name, "nginx", "-t"], check=True, capture_output=True)
            ports = json.loads(subprocess.check_output(["docker", "inspect", name]))[0]["NetworkSettings"]["Ports"]
            cls.ports[mode] = {kind: ports[f"{port}/tcp"][0]["HostPort"]
                               for kind, port in [("public", 443 if mode == "https" else 80), ("internal", 8081)]}
            # Each container must retain its own site config.
            renamed = cls.root / f"conf-{mode}"
            conf.rename(renamed)
            conf.mkdir()
            (conf / "backend.conf").write_text(
                f"upstream poudy_backend {{ server host.docker.internal:{upstream_port}; }}\n")

    def fetch(self, mode, kind, path, headers=None, method="GET"):
        protocol = "https" if mode == "https" and kind == "public" else "http"
        url = f"{protocol}://127.0.0.1:{self.ports[mode][kind]}{path}"
        request = Request(url, headers={"Host": "poudy.site", **(headers or {})}, method=method)
        try:
            response = urlopen(request, context=ssl._create_unverified_context(), timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.headers.get("X-Poudy-Cache"), response.read()

    def test_public_ttl_and_separate_inputs(self):
        expected = {"/api/categories": 600, "/api/brands": 60, "/api/brands/11": 600,
                    "/api/ingredient-groups": 600, "/api/skin-types": 600,
                    "/api/exclude-codes": 600, "/api/banners": 60, "/api/curations/11": 60,
                    "/api/products/11": 60, "/api/products/11/similarities": 60,
                    "/api/products?categoryIds=11&page=1": 30, "/api/products/rankings": 30,
                    "/api/ingredients/11": 30, "/api/ingredient-groups/CERAMIDES": 30}
        for mode in ["http", "https"]:
            for kind in ["public", "internal"]:
                for path, ttl in expected.items():
                    # Distinct query keys avoid cross-fixture cache collisions.
                    path += ("&" if "?" in path else "?") + f"fixture={mode}-{kind}"
                    with self.subTest(mode=mode, kind=kind, path=path):
                        first = self.fetch(mode, kind, path)
                        second = self.fetch(mode, kind, path)
                        self.assertEqual((200, "MISS"), first[:2])
                        self.assertEqual((200, "HIT"), second[:2])
                        self.assertEqual(first[2], second[2])
                        files = [p for p in (self.cache / "poudy_categories").rglob("*") if p.is_file()]
                        entries = [p.read_bytes() for p in files if path.encode() in p.read_bytes()]
                        self.assertTrue(entries)
                        # Nginx v5 cache header: version, valid_sec, updating_sec, error_sec,
                        # last_modified, date (64-bit fixture). Validate stored TTL, not config text.
                        self.assertTrue(any(struct.unpack_from("=6q", item)[0] == 5 and
                                            struct.unpack_from("=6q", item)[1] -
                                            struct.unpack_from("=6q", item)[5] == ttl for item in entries))

    def test_private_requests_and_upstream_protection(self):
        for kind in ["public", "internal"]:
            for path in ["/api/users/me/shelf/products", "/api/admin/users", "/api/new-api",
                         "/api/products?myFilter=true", "/api/products?myFilter=false&myFilter=true"]:
                with self.subTest(kind=kind, path=path):
                    first, second = self.fetch("https", kind, path), self.fetch("https", kind, path)
                    self.assertEqual("BYPASS", first[1])
                    self.assertEqual("BYPASS", second[1])
                    self.assertNotEqual(first[2], second[2])
            for headers in [{"Cookie": "JSESSIONID=test"}, {"Authorization": "Bearer test"}]:
                self.assertEqual("BYPASS", self.fetch("https", kind, "/api/categories", headers)[1])
            for mode in ["no-store", "private", "set-cookie", "error"]:
                path = f"/api/categories?mode={mode}"
                first, second = self.fetch("https", kind, path), self.fetch("https", kind, path)
                self.assertEqual("MISS", second[1])
                self.assertNotEqual(first[2], second[2])
            first = self.fetch("https", kind, "/api/categories", method="POST")
            self.assertNotEqual("HIT", first[1])
            self.assertNotEqual(first[2], self.fetch("https", kind, "/api/categories", method="POST")[2])
        for origin in ["https://a.example", "https://b.example"]:
            response = self.fetch("https", "public", "/api/brands?cors=1", {"Origin": origin})
            self.assertEqual(origin, json.loads(response[2])["origin"])


if __name__ == "__main__":
    unittest.main()
