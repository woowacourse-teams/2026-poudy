"""Storybook Nginx 구간이 인증서가 그 도메인을 포함할 때만 켜지는지 확인한다(#859)."""
import subprocess
import tempfile
import unittest
from pathlib import Path


DEPLOY = Path(__file__).resolve().parents[1]
SITE_LIB = DEPLOY / "scripts/lib/frontend-site.sh"
CERT_LIB = DEPLOY / "scripts/lib/frontend-certificate.sh"
HTTPS_TEMPLATE = DEPLOY / "nginx/ec2-frontend-https.conf"
HTTP_TEMPLATE = DEPLOY / "nginx/ec2-frontend.conf"


def bash(script, *args):
    return subprocess.run(
        ["bash", "-c", script, "bash", *args],
        capture_output=True,
        text=True,
    )


class FrontendStorybookTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def certificate(self, *hosts):
        path = self.root / f"cert-{len(hosts)}.pem"
        san = ",".join(f"DNS:{host}" for host in hosts)
        subprocess.run(
            [
                "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                "-keyout", str(self.root / "key.pem"), "-out", str(path),
                "-days", "1", "-subj", f"/CN={hosts[0]}", "-addext", f"subjectAltName={san}",
            ],
            check=True,
            capture_output=True,
        )
        return path

    def site(self, storybook_host):
        path = self.root / "site.env"
        path.write_text(
            "POUDY_SITE_HOST=poudy.site\n"
            "POUDY_SITE_ALIASES=www.poudy.site\n"
            "POUDY_SITE_INDEXED=true\n"
            f"POUDY_STORYBOOK_HOST={storybook_host}\n"
        )
        return path

    def render(self, template, storybook):
        output = self.root / "rendered.conf"
        result = bash(
            f'source "{SITE_LIB}"; load_frontend_site "$1" && render_frontend_nginx_config "$2" "$3" "$4"',
            str(self.site("ds.poudy.site")), str(template), str(output), storybook,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return output.read_text()

    def enabled(self, storybook_host, certificate):
        return bash(
            f'source "{CERT_LIB}"; source "{SITE_LIB}"; '
            'load_frontend_site "$1" && frontend_storybook_enabled "$2"',
            str(self.site(storybook_host)), str(certificate),
        ).returncode == 0

    def test_storybook_section_is_removed_when_disabled(self):
        config = self.render(HTTPS_TEMPLATE, "0")
        self.assertNotIn("ds.poudy.site", config)
        self.assertNotIn("poudy-storybook", config)
        self.assertNotIn("__POUDY_", config)
        self.assertIn("server_name poudy.site;", config)

    def test_storybook_section_is_kept_with_host_when_enabled(self):
        config = self.render(HTTPS_TEMPLATE, "1")
        self.assertNotIn("__POUDY_", config)
        self.assertIn("server_name ds.poudy.site;", config)
        self.assertIn("return 301 https://ds.poudy.site$request_uri;", config)
        self.assertIn("ssl_certificate /etc/letsencrypt/live/poudy.site/fullchain.pem;", config)
        self.assertIn('add_header X-Robots-Tag "noindex, nofollow" always;', config)

    def test_http_bootstrap_template_has_no_storybook(self):
        config = self.render(HTTP_TEMPLATE, "1")
        self.assertNotIn("ds.poudy.site", config)
        self.assertNotIn("__POUDY_", config)

    def test_enabled_only_when_certificate_covers_storybook_host(self):
        covered = self.certificate("poudy.site", "www.poudy.site", "ds.poudy.site")
        uncovered = self.certificate("poudy.site", "www.poudy.site")
        self.assertTrue(self.enabled("ds.poudy.site", covered))
        self.assertFalse(self.enabled("ds.poudy.site", uncovered))
        self.assertFalse(self.enabled("", covered))

    def test_site_files_load_and_reject_invalid_storybook_host(self):
        for environment, host in (("production", "ds.poudy.site"), ("staging", "ds.staging.poudy.site")):
            result = bash(
                f'source "{SITE_LIB}"; load_frontend_site "$1" && printf %s "$POUDY_STORYBOOK_HOST"',
                str(DEPLOY / f"config/frontend-site-{environment}.env"),
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, host)

        result = bash(f'source "{SITE_LIB}"; load_frontend_site "$1"', str(self.site("DS_poudy/site")))
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
