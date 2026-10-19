"""실제 Docker 대신 명령 대역으로 이미지 보존 정책과 실패 처리를 검증한다."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "codedeploy/backend-container/scripts/cleanup-images.sh"


class BackendImageCleanupTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.state = {"images": [], "containers": {}, "fail": None}
        shim = self.root / "docker"
        shim.write_text("""#!/usr/bin/env python3
import json, os, pathlib, sys
root = pathlib.Path(os.environ['IMAGE_CLEANUP_TEST_ROOT'])
state = json.loads((root / 'state.json').read_text())
args = sys.argv[1:]
with (root / 'calls.jsonl').open('a') as log:
    log.write(json.dumps(args) + '\\n')
if args[:2] == ['container', 'ls']:
    if state['fail'] == 'list': sys.exit(1)
    print('\\n'.join(state['containers']))
elif args[:2] == ['container', 'inspect']:
    print(state['containers'][args[-1]])
elif args[:2] == ['image', 'ls']:
    print('\\n'.join(' '.join(image) for image in state['images']))
elif args[:2] == ['image', 'rm']:
    if state['fail'] == 'remove': sys.exit(1)
    assert len(args) == 3, 'forced or broad removal is forbidden'
    repo, tag = args[2].split(':')
    image = next(image for image in state['images'] if image[:2] == [repo, tag])
    assert image[2] not in state['containers'].values(), 'container image must survive'
    state['images'].remove(image)
    (root / 'state.json').write_text(json.dumps(state))
else:
    raise AssertionError(args)
""")
        shim.chmod(0o755)
        self.env = dict(os.environ, PATH=f"{self.root}:{os.environ['PATH']}",
                        IMAGE_CLEANUP_TEST_ROOT=str(self.root))

    def images(self, count):
        # Docker와 같은 생성 시각 내림차순. 태그와 ID는 별도로 다룬다.
        self.state["images"] = [
            ["poudy-backend", f"{index:040x}", f"sha256:{index:064x}"]
            for index in range(count, 0, -1)
        ]

    def run_cleanup(self):
        (self.root / "state.json").write_text(json.dumps(self.state))
        result = subprocess.run(["bash", str(SCRIPT)], env=self.env, capture_output=True, text=True)
        self.state = json.loads((self.root / "state.json").read_text())
        return result

    def removals(self):
        calls = [json.loads(line) for line in (self.root / "calls.jsonl").read_text().splitlines()]
        return [args[2] for args in calls if args[:2] == ["image", "rm"]]

    def test_retains_three_latest_and_running_and_stopped_container_images(self):
        self.images(7)
        self.state["containers"] = {"running": "sha256:" + f"{1:064x}",
                                    "stopped": "sha256:" + f"{2:064x}"}
        result = self.run_cleanup()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([f"poudy-backend:{index:040x}" for index in [4, 3]], self.removals())
        self.assertEqual(5, len(self.state["images"]))

    def test_multiple_tags_of_latest_image_do_not_consume_retention_slots(self):
        self.images(5)
        self.state["images"].insert(1, ["poudy-backend", "abcdef0", self.state["images"][0][2]])
        result = self.run_cleanup()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([f"poudy-backend:{index:040x}" for index in [2, 1]], self.removals())

    def test_other_repositories_custom_tags_and_dangling_images_are_preserved(self):
        self.images(4)
        extra = [["another-service", "abcdef0", "sha256:other"],
                 ["poudy-backend", "manual-backup", "sha256:backup"],
                 ["poudy-backend", "<none>", "sha256:dangling"]]
        self.state["images"].extend(extra)
        result = self.run_cleanup()
        self.assertEqual(0, result.returncode, result.stderr)
        for image in extra:
            self.assertIn(image, self.state["images"])

    def test_empty_image_list(self):
        result = self.run_cleanup()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([], self.removals())

    def test_repeated_cleanup_keeps_remaining_images(self):
        self.images(6)
        self.assertEqual(0, self.run_cleanup().returncode)
        remaining = self.state["images"].copy()
        self.assertEqual(0, self.run_cleanup().returncode)
        self.assertEqual(remaining, self.state["images"])
        self.assertEqual(3, len(self.removals()))

    def test_container_listing_failure_stops_without_deletion(self):
        self.images(6)
        self.state["fail"] = "list"
        self.assertNotEqual(0, self.run_cleanup().returncode)
        self.assertEqual([], self.removals())

    def test_removal_failure_is_not_ignored(self):
        self.images(6)
        self.state["fail"] = "remove"
        self.assertNotEqual(0, self.run_cleanup().returncode)
        self.assertEqual(6, len(self.state["images"]))


if __name__ == "__main__":
    unittest.main()
