"""빌드 계측이 원래 명령의 종료 상태를 보존하는지 확인한다."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/measure-build.sh"


class BuildMeasurementTest(unittest.TestCase):
    def test_command_status_and_report(self):
        with tempfile.TemporaryDirectory() as directory:
            for command, expected in [("true", 0), ("false", 1)]:
                with self.subTest(command=command):
                    result = subprocess.run(
                        ["bash", str(SCRIPT), "check", command],
                        env={**os.environ, "CODEBUILD_SRC_DIR": directory},
                        capture_output=True,
                        text=True,
                    )
                    self.assertEqual(expected, result.returncode, result.stderr)
                    self.assertTrue(Path(directory, ".artifacts/metrics/check.txt").is_file())

    def test_invalid_label(self):
        result = subprocess.run(
            ["bash", str(SCRIPT), "../invalid", "true"], capture_output=True
        )
        self.assertEqual(2, result.returncode)


if __name__ == "__main__":
    unittest.main()
