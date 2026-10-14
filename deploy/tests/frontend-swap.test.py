#!/usr/bin/env python3
"""Filesystem fixtures; privileged Linux commands are replaced, not executed."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SOURCE = Path(__file__).parents[1] / "scripts/configure-frontend-swap.sh"


class SwapSetupTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.swap = self.root / "swapfile"
        self.fstab = self.root / "fstab"
        self.fstab.write_text("# existing host mounts\n")
        script = SOURCE.read_text().replace(
            '[[ "${EUID}" -eq 0 ]] || { echo \'root 권한이 필요합니다.\' >&2; exit 1; }', ":"
        ).replace("/swapfile", str(self.swap)).replace("/etc/fstab", str(self.fstab))
        self.script = self.root / "setup.sh"
        self.script.write_text(script)
        shim = self.root / "command.py"
        shim.write_text("""#!/usr/bin/env python3
import os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
root = pathlib.Path(os.environ['SWAP_TEST_ROOT'])
with (root / 'calls').open('a') as f: f.write(name + '\\n')
swap = root / 'swapfile'
if name == 'dd':
    with swap.open('wb') as f: f.truncate(536870912)
elif name == 'mkswap': (root / 'swaptype').write_text('swap')
elif name == 'blkid':
    if not (root / 'swaptype').exists(): sys.exit(2)
    print('swap')
elif name == 'stat': print(swap.stat().st_size)
elif name == 'swapon':
    if '--show' in sys.argv:
        if (root / 'active').exists(): print(swap)
    else: (root / 'active').touch()
""")
        shim.chmod(0o755)
        for name in ["dd", "mkswap", "blkid", "stat", "chown", "swapon"]:
            (self.root / name).symlink_to(shim)
        self.env = dict(os.environ, PATH=f"{self.root}:{os.environ['PATH']}", SWAP_TEST_ROOT=str(self.root))

    def run_setup(self):
        return subprocess.run(["bash", str(self.script)], env=self.env, capture_output=True, text=True)

    def existing_swap(self, size=536870912):
        with self.swap.open("wb") as f:
            f.truncate(size)
        (self.root / "swaptype").write_text("swap")

    def test_create_and_repeat_without_reformat_or_duplicate(self):
        self.assertEqual(self.run_setup().returncode, 0)
        self.assertEqual(self.run_setup().returncode, 0)
        calls = (self.root / "calls").read_text().splitlines()
        self.assertEqual(calls.count("dd"), 1)
        self.assertEqual(calls.count("mkswap"), 1)
        self.assertEqual(self.fstab.read_text().count(f"{self.swap} none swap"), 1)
        self.assertEqual(self.swap.stat().st_mode & 0o777, 0o600)

    def test_existing_active_swap_preserved(self):
        self.existing_swap()
        (self.root / "active").touch()
        original = f"{self.swap} none swap sw 0 0\n"
        self.fstab.write_text(original)
        self.assertEqual(self.run_setup().returncode, 0)
        self.assertEqual(self.fstab.read_text(), original)
        self.assertNotIn("mkswap", (self.root / "calls").read_text())

    def test_non_swap_file_not_overwritten(self):
        self.existing_swap()
        (self.root / "swaptype").unlink()
        self.assertNotEqual(self.run_setup().returncode, 0)
        self.assertEqual(self.swap.stat().st_size, 536870912)
        self.assertFalse((self.root / "active").exists())

    def test_small_swap_not_resized(self):
        self.existing_swap(1024)
        self.assertNotEqual(self.run_setup().returncode, 0)
        self.assertEqual(self.swap.stat().st_size, 1024)

    def test_dangling_symlink_not_followed(self):
        self.swap.symlink_to(self.root / "missing")
        self.assertNotEqual(self.run_setup().returncode, 0)
        self.assertFalse((self.root / "missing").exists())

    def test_invalid_fstab_not_activated(self):
        self.existing_swap()
        for options in ["noauto", "sw\n" + f"{self.swap} none swap sw 0 0"]:
            with self.subTest(options=options):
                self.fstab.write_text(f"{self.swap} none swap {options} 0 0\n")
                self.assertNotEqual(self.run_setup().returncode, 0)
                self.assertFalse((self.root / "active").exists())


if __name__ == "__main__":
    unittest.main()
