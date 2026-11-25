import json
import sys
from pathlib import Path

import pytest

from evals import run
from evals.dataset import load_dataset, select
from evals.models import resolve_model

FAKE = Path(__file__).resolve().parent / "fake_eval_extract.py"


def _make_dataset(root: Path) -> Path:
    """inv-001..003 (scanned: 002), rcp-001 (photo), dst-001 (no type)."""
    spec = [
        ("inv-001", "invoice", ["text-pdf"]),
        ("inv-002", "invoice", ["scanned"]),
        ("inv-003", "invoice", ["text-pdf"]),
        ("rcp-001", "receipt", ["photo"]),
        ("dst-001", None, ["contract"]),
    ]
    for i, (id_, typ, tags) in enumerate(spec):
        sub = root / ("distractors" if typ is None else typ + "s")
        sub.mkdir(parents=True, exist_ok=True)
        (sub / f"{id_}.pdf").write_bytes(f"doc {id_}".encode())
        (sub / f"{id_}.truth.json").write_text(json.dumps({
            "id": id_, "file": f"{id_}.pdf", "expectedType": typ,
            "source": "synthetic", "tags": tags, "seed": i, "fields": {},
        }))
    return root


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("EVAL_EXTRACT_CMD", json.dumps([sys.executable, str(FAKE)]))
    monkeypatch.setenv("FAKE_LOG", str(tmp_path / "calls.log"))
    for k in ("FAKE_CRASH", "FAKE_GARBAGE", "FAKE_FAIL_ONCE_DIR", "FAKE_COST"):
        monkeypatch.delenv(k, raising=False)
    ds = _make_dataset(tmp_path / "ds")
    runs = tmp_path / "runs"

    def go(*args: str) -> int:
        return run.main(["--dataset", str(ds), "--runs-dir", str(runs), "--concurrency", "1", *args])

    go.ds, go.runs, go.log = ds, runs, tmp_path / "calls.log"
    return go


def _run_dir(env) -> Path:
    (d,) = list(env.runs.iterdir())
    return d


def _lines(d: Path) -> list[dict]:
    return [json.loads(x) for x in (d / "results.jsonl").read_text().splitlines()]


def _calls(env) -> list[str]:
    return env.log.read_text().splitlines() if env.log.exists() else []


def _resume(env, d: Path, *extra: str) -> int:
    return run.main(["--resume", str(d), "--concurrency", "1", *extra])


def test_resolve_model():
    assert resolve_model("haiku") == "claude-haiku-5-5"
    assert resolve_model("opus") == "claude-opus-5-5"
    assert resolve_model("claude-foo-1") == "claude-foo-1"


def test_subset_glob_and_tag(env):
    docs = load_dataset(env.ds)
    assert [d.id for d in docs] == ["dst-001", "inv-001", "inv-002", "inv-003", "rcp-001"]
    assert [d.id for d in select(docs, "inv-00*")] == ["inv-001", "inv-002", "inv-003"]
    assert [d.id for d in select(docs, "scanned")] == ["inv-002"]
    assert [d.id for d in select(docs, "photo, dst-*")] == ["dst-001", "rcp-001"]
    assert len(select(docs, None)) == 5


def test_one_line_per_doc_model_repeat(env, capsys):
    assert env("--models", "opus,haiku", "--repeat", "2", "--subset", "inv-00*") == 0
    lines = _lines(_run_dir(env))
    assert len(lines) == 3 * 2 * 2
    assert {(r["id"], r["model"], r["repeat"]) for r in lines} == {
        (i, m, k) for i in ("inv-001", "inv-002", "inv-003") for m in ("opus", "haiku") for k in (1, 2)
    }
    r = lines[0]
    assert r["modelId"] == resolve_model(r["model"])
    assert r["costUsd"] == pytest.approx(0.004)
    # document-major: the first document finishes all its models and repeats first
    assert {x["id"] for x in lines[:4]} == {"inv-001"}
    out = capsys.readouterr().out
    assert "inv-001 opus #1 needs_review" in out and "total $" in out
    assert "SECRET VALUE" not in out
    assert "fake log line" not in out


def test_run_json_fields(env):
    assert env("--models", "haiku", "--subset", "inv-00*", "--label", "t") == 0
    d = _run_dir(env)
    assert d.name.endswith("-t")
    meta = json.loads((d / "run.json").read_text())
    assert meta["models"] == {"haiku": "claude-haiku-5-5"}
    assert meta["repeat"] == 1 and meta["subset"] == "inv-00*"
    assert meta["capped"] is False and meta["finished"] and meta["started"]
    assert meta["costUsd"] == pytest.approx(0.012)
    assert meta["outcomes"] == {"needs_review": 3}
    assert meta["promptHash"] == "abc123"
    assert len(meta["dataset"]["hash"]) == 64 and meta["dataset"]["path"]
    assert "gitSha" in meta and "dirty" in meta and meta["label"] == "t"


def test_resume_skips_finished_and_repairs_truncated_line(env):
    assert env("--models", "haiku") == 0
    d = _run_dir(env)
    lines = (d / "results.jsonl").read_text().splitlines()
    assert len(lines) == 5
    # keep 2 finished lines, then a line cut off mid-write
    (d / "results.jsonl").write_text("\n".join(lines[:2]) + "\n" + lines[2][:40])
    env.log.write_text("")
    assert _resume(env, d) == 0
    result = _lines(d)
    assert len(result) == 5 and len({r["id"] for r in result}) == 5
    redone = [c.split()[0] for c in _calls(env)]
    assert len(redone) == 3
    assert not {r["file"] for r in result[:2]} & set(redone)


def test_resume_rejects_changed_settings(env, capsys):
    assert env("--models", "haiku", "--subset", "inv-001") == 0
    assert run.main(["--resume", str(_run_dir(env)), "--models", "opus"]) == 2
    assert "--models" in capsys.readouterr().err


def test_crash_is_retried_once_then_recorded_as_error(env, monkeypatch):
    monkeypatch.setenv("FAKE_CRASH", "inv-002")
    assert env("--models", "haiku", "--subset", "inv-00*") == 0
    d = _run_dir(env)
    lines = {r["id"]: r for r in _lines(d)}
    bad = lines["inv-002"]
    assert bad["outcome"] == "error" and bad["calls"] == [] and bad["values"] == {}
    assert bad["costUsd"] == 0
    assert bad["error"] == "exit 1: second line of stderr"
    assert lines["inv-001"]["outcome"] == "needs_review"
    assert sum(1 for c in _calls(env) if c.startswith("inv-002")) == 2  # one retry only
    assert json.loads((d / "run.json").read_text())["outcomes"] == {"needs_review": 2, "error": 1}


def test_full_result_counts_despite_crash_on_exit(env, monkeypatch):
    monkeypatch.setenv("FAKE_EXIT_CRASH", "inv-001")
    assert env("--models", "haiku", "--subset", "inv-001") == 0
    (rec,) = _lines(_run_dir(env))
    assert rec["outcome"] == "needs_review"
    assert len(_calls(env)) == 1  # no retry


def test_retry_can_succeed(env, monkeypatch, tmp_path):
    marks = tmp_path / "marks"
    marks.mkdir()
    monkeypatch.setenv("FAKE_FAIL_ONCE_DIR", str(marks))
    assert env("--models", "haiku", "--subset", "inv-001") == 0
    (rec,) = _lines(_run_dir(env))
    assert rec["outcome"] == "needs_review"
    assert len(_calls(env)) == 2


def test_unparseable_stdout_is_an_error(env, monkeypatch):
    monkeypatch.setenv("FAKE_GARBAGE", "inv-001")
    assert env("--models", "haiku", "--subset", "inv-001") == 0
    (rec,) = _lines(_run_dir(env))
    assert rec["outcome"] == "error" and "not valid JSON" in rec["error"]


def test_cap_stops_early_with_exit_2_then_resume_finishes(env, capsys):
    # 0.004 per call, cap 0.01: three calls finish ($0.012), the other two are not started
    assert env("--models", "haiku", "--max-usd", "0.01") == 2
    out = capsys.readouterr().out
    assert "Spending cap reached: $0.01 of $0.01; 2 not started. Resume with:" in out
    assert "--resume" in out and "--max-usd" in out
    d = _run_dir(env)
    assert len(_lines(d)) == 3
    assert json.loads((d / "run.json").read_text())["capped"] is True

    env.log.write_text("")
    assert _resume(env, d) == 0
    assert len(_lines(d)) == 5
    assert len(_calls(env)) == 2
    meta = json.loads((d / "run.json").read_text())
    assert meta["capped"] is False and meta["costUsd"] == pytest.approx(0.02)


def test_resume_counts_earlier_cost_toward_cap(env):
    assert env("--models", "haiku", "--max-usd", "0.01") == 2
    d = _run_dir(env)
    # already at $0.012: a cap of 0.012 stops again before starting anything new
    assert _resume(env, d, "--max-usd", "0.012") == 2
    assert len(_lines(d)) == 3


def test_no_match_is_a_usage_error(env):
    assert env("--subset", "nothing-*") == 2
