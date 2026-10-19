"""Run the fixed #679 staging scenario and record separate API health probes."""

import argparse
import json
from pathlib import Path
import re
import signal
import subprocess
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('rate', type=int, help='Requests per second from this generator')
    parser.add_argument('duration', help='k6 duration, e.g. 10m or 5m')
    parser.add_argument('--output-dir', type=Path, required=True, help='New directory for this run')
    parser.add_argument('--label', default='run', help='Filename prefix')
    args = parser.parse_args()
    if args.rate < 1:
        parser.error('rate must be positive')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', args.label):
        parser.error('label must contain only letters, digits, _ or -')
    folder = args.output_dir.resolve()
    folder.mkdir(parents=True, exist_ok=False)
    scenario = Path(__file__).resolve().with_name('user-paths-679.js')
    command = ['k6', 'run', '-q', '-e', f'RATE={args.rate}', '-e', f'DURATION={args.duration}',
               '-e', f'RESULT_FILE={folder / (args.label + ".json")}', str(scenario)]
    health_failed = False
    with (folder / (args.label + '.log')).open('x') as log, \
            (folder / (args.label + '-health.jsonl')).open('x') as health:
        process = subprocess.Popen(command, stdout=log, stderr=log)
        try:
            while process.poll() is None:
                row = {'at': time.time(), 'k6pid': process.pid, 'probes': []}
                for host in ['https://poudy.site', 'https://staging.poudy.site']:
                    result = subprocess.run(
                        ['curl', '-sS', '--max-time', '8', '-o', '/dev/null', '-w',
                         '%{http_code} %{time_total}', host + '/api/products/1'],
                        capture_output=True, text=True, timeout=10,
                    )
                    row['probes'].append({'host': host, 'result': result.stdout, 'exit': result.returncode})
                    if result.returncode or not result.stdout.startswith('200 '):
                        health_failed = True
                        row['abort'] = 'health failure'
                        if process.poll() is None:
                            process.send_signal(signal.SIGINT)
                health.write(json.dumps(row) + '\n')
                health.flush()
                for _ in range(15):
                    if process.poll() is not None:
                        break
                    time.sleep(1)
            return 1 if health_failed else process.returncode
        finally:
            if process.poll() is None:
                process.send_signal(signal.SIGINT)
                try:
                    process.wait(timeout=20)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == '__main__':
    raise SystemExit(main())
