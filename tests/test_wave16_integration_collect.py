"""Wave16: integration suite must collect cleanly and stay marked.

Unit CI clears DATABASE_URL (tests skip). Integration CI sets it and must
run every ``@pytest.mark.integration`` case — not silently skip. This pin
guards collect + marker wiring without needing Postgres in the unit job.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

# DB-gated cases tagged ``integration`` (module or function). Keep in sync
# when adding a new DATABASE_URL skipif — collect count is the ratchet.
_MIN_INTEGRATION_COLLECTED = 12

_EXPECTED_NODEIDS = (
    "tests/test_advisory_lock.py::test_advisory_lock_blocks_second_holder",
    "tests/test_poller_integration.py::test_crossing_fires_telegram_once",
    "tests/test_poller_integration.py::test_kill_restart_no_double_send",
    "tests/test_dual_poller_lock.py::test_dual_poller_run_once_one_holds_lock",
    "tests/test_dead_letter_db.py::test_dead_letter_excludes_from_unsent_alerts",
    "tests/test_unsent_active.py::test_unsent_alerts_filters_inactive_rules",
    "tests/test_claim_unsent_lease.py::test_claim_unsent_batch_leases_and_excludes",
    "tests/test_claim_unsent_lease.py::test_claim_alert_lease_blocks_claim_unsent_until_ok_or_expiry",
    "tests/test_claim_unsent_lease.py::test_claim_unsent_batch_skip_locked_concurrent",
    "tests/test_migrate_idempotent.py::test_apply_migrations_twice_idempotent",
    "tests/test_delivery_attempted_ok.py::test_delivery_attempted_ok_excludes_from_unsent_db",
    "tests/test_wave13_migrate_sanity.py::test_apply_migrations_twice_when_database_url",
)


def _collect_integration() -> list[str]:
    """Return collected nodeids for ``-m integration`` (no cov; no DB needed)."""
    env = os.environ.copy()
    env["DATABASE_URL"] = ""
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "--collect-only",
            "--no-cov",
            "-m",
            "integration",
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    if proc.returncode != 0:
        pytest.fail(
            "integration collect failed:\n"
            f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
        )
    return [
        line.strip()
        for line in proc.stdout.splitlines()
        if line.startswith("tests/") and "::" in line
    ]


def test_integration_marker_collects_db_suite() -> None:
    """``pytest -m integration --collect-only`` lists every DB-gated case."""
    nodeids = _collect_integration()
    assert len(nodeids) >= _MIN_INTEGRATION_COLLECTED, (
        f"expected ≥{_MIN_INTEGRATION_COLLECTED} integration tests, got {len(nodeids)}:\n"
        + "\n".join(nodeids)
    )
    missing = [n for n in _EXPECTED_NODEIDS if n not in nodeids]
    assert not missing, "integration collect missing:\n" + "\n".join(missing)


def test_integration_marker_registered() -> None:
    """Unknown-marker warnings would mean pyproject markers drifted."""
    env = os.environ.copy()
    env["DATABASE_URL"] = ""
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "--collect-only",
            "--no-cov",
            "-m",
            "integration",
            "-W",
            "error::pytest.PytestUnknownMarkWarning",
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert proc.returncode == 0, (
        f"unknown integration marker or collect error:\n"
        f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
    )
