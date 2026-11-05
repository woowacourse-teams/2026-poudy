"""Recorded-response checks; no AWS, Discord, or production service calls."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

SPEC = importlib.util.spec_from_file_location("collector", Path(__file__).parents[1] / "monitoring/deployment/collector.py")
c = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(c)


def state():
    return {"groups": {}, "group_success": {}, "deployments": {}, "events": {}, "cloudwatch": {}}


class CollectorTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.location = Path(self.temporary.name) / "state.json"
        self.patch = patch.object(c, "STATE", self.location)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.config = {"long_running_seconds": {g: 60 for g in c.GROUPS}, "rollback_linkage_verified": True}
        self.group = next(iter(c.GROUPS))

    def aws(self, records):
        def fake(service, operation, **arguments):
            if operation == "list-deployments":
                return {"deployments": [x["deploymentId"] for x in records if x["deploymentGroupName"] == arguments["deployment_group_name"]]}
            if operation == "batch-get-deployments":
                return {"deploymentsInfo": [x for x in records if x["deploymentId"] in arguments["deployment_ids"]]}
            raise AssertionError("Unexpected API operation")
        return fake

    def info(self, identifier, status, **extra):
        return {"deploymentId": identifier, "deploymentGroupName": self.group,
                "status": status, "createTime": 900, "completeTime": 990, **extra}

    def test_baseline_does_not_notify_completed_history(self):
        current = state()
        with patch.object(c, "aws", self.aws([self.info("d-OLD", "Succeeded")])):
            self.assertTrue(c.deployments(current, self.config, 1000))
        self.assertEqual(current["events"], {})
        self.assertEqual(len(current["groups"]), 4)

    def test_failure_stop_long_running_and_rollback_survive_restart(self):
        current = state()
        current["groups"] = {g: 999 for g in c.GROUPS}
        records = [self.info("d-FAIL", "Failed", errorInformation={"code": "FAILURE"}),
                   self.info("d-STOP", "Stopped"), self.info("d-LONG", "InProgress"),
                   self.info("d-ROLLBACK", "Succeeded", creator="codeDeployRollback",
                             rollbackInfo={"rollbackTriggeringDeploymentId": "d-FAIL"})]
        with patch.object(c, "aws", self.aws(records)):
            self.assertTrue(c.deployments(current, self.config, 1000))
            self.assertEqual(current["events"]["d-FAIL:Failed"]["payload"]["errorCode"], "FAILURE")
            self.assertIn("d-STOP:Stopped", current["events"])
            self.assertIn("d-LONG:LongRunning", current["events"])
            self.assertEqual(current["events"]["d-ROLLBACK:Succeeded"]["payload"]["rollbackOf"], "d-FAIL")
            c.atomic_json(self.location, current)
            loaded = json.loads(self.location.read_text())
            before = len(loaded["events"])
            c.deployments(loaded, self.config, 1001)
            self.assertEqual(len(loaded["events"]), before)

    def test_retry_after_persists_and_does_not_block_other_channel(self):
        current = state()
        for identifier in ["d-FIRST", "d-SECOND"]:
            c.enqueue(current, self.info(identifier, "Failed", deploymentGroupName=self.group if identifier == "d-FIRST" else "poudy-backend-staging-dg"), "Failed", 1000)
        def delivery(_config, _path, payload):
            if payload["deploymentId"] == "d-FIRST":
                raise HTTPError("https://example.test", 429, "limited", {"Retry-After": "90"}, None)
        with patch.object(c, "post", delivery):
            c.flush(current, self.config, 1000)
        loaded = json.loads(self.location.read_text())
        self.assertFalse(loaded["events"]["d-FIRST:Failed"]["sent"])
        self.assertEqual(loaded["events"]["d-FIRST:Failed"]["retry_after"], 1090)
        self.assertTrue(loaded["events"]["d-SECOND:Failed"]["sent"])
        with patch.object(c, "post") as post:
            c.flush(loaded, self.config, 1030)
            post.assert_not_called()
            c.flush(loaded, self.config, 1100)
            self.assertTrue(loaded["events"]["d-FIRST:Failed"]["sent"])
            self.assertEqual(post.call_count, 1)

    def test_late_cloudwatch_increment_is_not_counted_twice(self):
        current = state()
        def response(value):
            return {"MetricDataResults": [{"Id": f"m{i}", "StatusCode": "Complete",
                     "Timestamps": [c.iso(900)], "Values": [value if i == 0 else 0]}
                     for i in range(6)]}
        with patch.object(c, "aws", return_value=response(1)):
            c.cloudwatch(current, 1000)
        self.assertEqual(current["cloudwatch"]["poudy-pipeline"]["total"], 0)
        with patch.object(c, "aws", return_value=response(2)):
            c.cloudwatch(current, 1001)
            c.cloudwatch(current, 1002)
        self.assertEqual(current["cloudwatch"]["poudy-pipeline"]["total"], 1)
        self.assertEqual(current["cloudwatch"]["poudy-pipeline"]["last_failure"], 1001)

    def test_query_failure_does_not_advance_watermark(self):
        current = state()
        current["groups"] = {g: 900 for g in c.GROUPS}
        with patch.object(c, "aws", side_effect=RuntimeError("denied")):
            self.assertFalse(c.deployments(current, self.config, 1000))
        self.assertTrue(all(t == 900 for t in current["groups"].values()))


if __name__ == "__main__":
    unittest.main()
