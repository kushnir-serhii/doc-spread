"""Runner: dataset x models x repeats through `eval-extract`, results to results.jsonl.

    uv run python -m evals.run --models opus,haiku [--subset 'inv-00*,scanned'] [--repeat 2]
    uv run python -m evals.run --resume evals/runs/<run> [--max-usd 20]

Stdout shows progress, ids, outcomes, time and cost only, never document values.
Exit codes: 0 done, 2 spending cap reached (or bad usage), 130 interrupted.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from collections import Counter
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from evals.dataset import (
    DEFAULT_DATASET,
    EVALS_DIR,
    TYPE_FILES,
    Doc,
    dataset_hash,
    load_dataset,
    select,
)
from evals.models import resolve_model

REPO_ROOT = EVALS_DIR.parent


def _rel_to_evals(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(EVALS_DIR.resolve()).as_posix()
    except ValueError:
        return str(resolved)
RUNS_DIR = EVALS_DIR / "runs"
# Flags that define a run; with --resume they come from the run's run.json.
FIXED_FLAGS = ("models", "repeat", "subset", "dataset", "label", "classify_model")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def eval_extract_prefix() -> list[str]:
    """argv prefix of the eval-extract command; EVAL_EXTRACT_CMD (JSON list) replaces pnpm."""
    env = os.environ.get("EVAL_EXTRACT_CMD")
    if env:
        prefix = json.loads(env)
        if not isinstance(prefix, list) or not all(isinstance(x, str) for x in prefix):
            raise SystemExit("EVAL_EXTRACT_CMD must be a JSON list of strings")
        return prefix
    pnpm = shutil.which("pnpm")
    if pnpm is None:
        raise SystemExit("pnpm not found on PATH")
    return [pnpm, "--silent", "--filter", "@docspread/api", "eval-extract"]


def _last_line(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return lines[-1][:200] if lines else ""


def call_once(argv: list[str], timeout: float) -> tuple[dict[str, Any] | None, str]:
    """Run eval-extract once. Returns (result, "") or (None, short reason)."""
    try:
        p = subprocess.run(
            argv, cwd=REPO_ROOT, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return None, f"timeout after {timeout:g}s"
    except OSError as e:
        return None, f"cannot start: {e.__class__.__name__}"
    if p.returncode != 0:
        tail = _last_line(p.stderr)
        return None, f"exit {p.returncode}" + (f": {tail}" if tail else "")
    try:
        obj = json.loads(p.stdout)
    except json.JSONDecodeError:
        return None, "stdout is not valid JSON"
    if not isinstance(obj, dict):
        return None, "stdout is not a JSON object"
    return obj, ""


def run_one(doc: Doc, alias: str, repeat: int, cfg: dict[str, Any]) -> dict[str, Any]:
    """One (document, model, repeat): call, retry once on a crash, record `error` after that."""
    model_id = resolve_model(alias)
    argv = [
        *cfg["prefix"], "--file", str(doc.path),
        "--types", ",".join(str(p) for p in TYPE_FILES),
        "--extract-model", model_id,
    ]
    if cfg["classify_model"]:
        argv += ["--classify-model", resolve_model(cfg["classify_model"])]
    result: dict[str, Any] | None = None
    reason = ""
    for _ in range(2):
        result, reason = call_once(argv, cfg["timeout"])
        if result is not None:
            break
    if result is None:
        result = {
            "file": doc.path.name, "outcome": "error", "error": reason,
            "classification": None, "values": {}, "overallConfidence": None,
            "calls": [], "ms": None, "promptHash": None,
        }
    calls = result.get("calls") or []
    cost = sum(float(c.get("costUsd") or 0) for c in calls if isinstance(c, dict))
    return {
        **result, "id": doc.id, "model": alias, "modelId": model_id,
        "repeat": repeat, "costUsd": cost,
    }


def read_results(path: Path) -> list[dict[str, Any]]:
    """Valid lines of results.jsonl. A truncated or broken line is dropped and the file repaired."""
    if not path.exists():
        return []
    raw = path.read_bytes().decode("utf-8", errors="replace")
    good: list[dict[str, Any]] = []
    dropped = 0
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            if not isinstance(obj, dict) or not {"id", "model", "repeat"} <= obj.keys():
                raise ValueError
            good.append(obj)
        except ValueError:
            dropped += 1
    if dropped or (raw and not raw.endswith("\n")):
        path.write_text("".join(json.dumps(o) + "\n" for o in good), encoding="utf-8")
        if dropped:
            print(f"Repaired {path.name}: dropped {dropped} unreadable line(s)")
    return good


def git_info() -> tuple[str | None, bool | None]:
    def git(*a: str) -> str | None:
        try:
            p = subprocess.run(["git", *a], cwd=REPO_ROOT, capture_output=True, text=True)
        except OSError:
            return None
        return p.stdout if p.returncode == 0 else None

    sha = git("rev-parse", "HEAD")
    status = git("status", "--porcelain", "--", ".", ":(exclude)evals/runs")
    return (sha.strip() if sha else None), (bool(status.strip()) if status is not None else None)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def find_run_dir(arg: str) -> Path | None:
    for p in (Path(arg), RUNS_DIR / arg, EVALS_DIR / arg):
        if (p / "run.json").is_file():
            return p.resolve()
    return None


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m evals.run", description=__doc__.split("\n")[0])
    ap.add_argument("--dataset", help="dataset dir (default dataset/)")
    ap.add_argument("--subset", help="comma-separated id globs or tags")
    ap.add_argument("--models", help="extraction models, aliases or ids (default haiku)")
    ap.add_argument("--classify-model", dest="classify_model", help="classification model (default: eval-extract's)")
    ap.add_argument("--repeat", type=int, help="repeats per document and model (default 1)")
    ap.add_argument("--label", help="run dir suffix (default: model aliases joined by +)")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--max-usd", dest="max_usd", type=float, default=10.0)
    ap.add_argument("--timeout", type=float, default=300.0, help="seconds per call")
    ap.add_argument("--resume", help="run dir to continue; its models/repeat/subset/dataset are reused")
    ap.add_argument("--runs-dir", dest="runs_dir", default=str(RUNS_DIR), help=argparse.SUPPRESS)
    return ap


def main(argv: list[str] | None = None) -> int:
    ap = build_parser()
    a = ap.parse_args(argv)
    if a.concurrency < 1:
        ap.error("--concurrency must be at least 1")

    if a.resume:
        run_dir = find_run_dir(a.resume)
        if run_dir is None:
            print(f"No run.json in {a.resume}", file=sys.stderr)
            return 2
        given = [f"--{f.replace('_', '-')}" for f in FIXED_FLAGS if getattr(a, f) is not None]
        if given:
            print(f"With --resume the run's own settings are used; remove {', '.join(given)}", file=sys.stderr)
            return 2
        meta = json.loads((run_dir / "run.json").read_text(encoding="utf-8"))
        meta["finished"] = None
        meta["capped"] = False
        dataset_dir = Path(meta["dataset"]["path"])
        if not dataset_dir.is_absolute():
            dataset_dir = EVALS_DIR / dataset_dir
    else:
        dataset_dir = Path(a.dataset) if a.dataset else DEFAULT_DATASET
        if not dataset_dir.is_dir() and not Path(a.dataset or "").is_absolute():
            dataset_dir = EVALS_DIR / dataset_dir
        if not dataset_dir.is_dir():
            print(f"Dataset dir not found: {dataset_dir}", file=sys.stderr)
            return 2
        aliases = [m.strip() for m in (a.models or "haiku").split(",") if m.strip()]
        label = re.sub(r"[^A-Za-z0-9._+-]", "-", a.label or "+".join(aliases))
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        run_dir = Path(a.runs_dir) / f"{stamp}-{label}"
        meta = {
            "label": label,
            "models": {m: resolve_model(m) for m in aliases},
            "classifyModel": a.classify_model,
            "repeat": a.repeat or 1,
            "subset": a.subset,
            # Relative to evals/ when inside it, so run.json carries no local user paths.
            "dataset": {"path": _rel_to_evals(dataset_dir)},
        }

    docs = select(load_dataset(dataset_dir), meta["subset"])
    if not docs:
        print("No documents match the subset", file=sys.stderr)
        return 2
    ds_hash = dataset_hash(docs, dataset_dir)
    if a.resume and meta["dataset"].get("hash") not in (None, ds_hash):
        print("Warning: the dataset changed since this run started")
    meta["dataset"]["hash"] = ds_hash
    meta["documents"] = len(docs)

    run_dir.mkdir(parents=True, exist_ok=True)
    results_path = run_dir / "results.jsonl"
    existing = read_results(results_path)
    done = {(r["id"], r["model"], r["repeat"]) for r in existing}

    # Document-major: all models (and repeats) of a document run next to each other.
    aliases = list(meta["models"])
    work = [
        (d, m, k)
        for d in docs
        for k in range(1, meta["repeat"] + 1)
        for m in aliases
        if (d.id, m, k) not in done
    ]
    total_items = len(docs) * len(aliases) * meta["repeat"]
    total_cost = sum(float(r.get("costUsd") or 0) for r in existing)
    outcomes = Counter(r.get("outcome") for r in existing)
    prompt_hash = next((r["promptHash"] for r in existing if r.get("promptHash")), None)

    if not a.resume:
        git_sha, dirty = git_info()
        meta.update(gitSha=git_sha, dirty=dirty, started=now_iso())
    meta.update(maxUsd=a.max_usd, concurrency=a.concurrency)
    meta.setdefault("finished", None)
    meta["capped"] = False
    meta.update(costUsd=round(total_cost, 6), outcomes=dict(outcomes), promptHash=prompt_hash)
    write_json(run_dir / "run.json", meta)

    try:
        shown = run_dir.relative_to(REPO_ROOT)
    except ValueError:
        shown = run_dir
    print(f"Run {shown}: {len(docs)} documents x {len(aliases)} model(s) x {meta['repeat']} = "
          f"{total_items} calls, {len(existing)} already done, cap ${a.max_usd:.2f}")

    cfg = {
        "prefix": eval_extract_prefix(), "timeout": a.timeout,
        "classify_model": meta.get("classifyModel"),
    }
    capped = False
    finished_n = len(existing)
    not_started = 0
    started_at = {}

    ex = ThreadPoolExecutor(max_workers=a.concurrency)
    pending: dict[Future, tuple[Doc, str, int]] = {}
    out = results_path.open("a", encoding="utf-8")

    def handle(fut: Future) -> None:
        nonlocal total_cost, finished_n, prompt_hash
        doc, alias, k = pending.pop(fut)
        rec = fut.result()
        out.write(json.dumps(rec) + "\n")
        out.flush()
        total_cost += rec["costUsd"]
        outcomes[rec["outcome"]] += 1
        prompt_hash = prompt_hash or rec.get("promptHash")
        finished_n += 1
        secs = time.monotonic() - started_at.pop(fut)
        print(f"[{finished_n}/{total_items}] {doc.id} {alias} #{k} {rec['outcome']} "
              f"{secs:.1f}s ${rec['costUsd']:.4f}  total ${total_cost:.4f}", flush=True)

    try:
        for i, (doc, alias, k) in enumerate(work):
            while len(pending) >= a.concurrency:
                finished, _ = wait(pending, return_when=FIRST_COMPLETED)
                for f in finished:
                    handle(f)
            if total_cost >= a.max_usd:
                capped = True
                not_started = len(work) - i
                break
            fut = ex.submit(run_one, doc, alias, k, cfg)
            pending[fut] = (doc, alias, k)
            started_at[fut] = time.monotonic()
        while pending:
            finished, _ = wait(pending, return_when=FIRST_COMPLETED)
            for f in finished:
                handle(f)
    except KeyboardInterrupt:
        out.flush()
        print(f"\nInterrupted. {finished_n} of {total_items} results are saved. "
              f"Continue with: uv run python -m evals.run --resume {shown}", flush=True)
        meta.update(costUsd=round(total_cost, 6), outcomes=dict(outcomes), promptHash=prompt_hash)
        write_json(run_dir / "run.json", meta)
        os._exit(130)  # don't wait for in-flight calls
    finally:
        out.close()
        ex.shutdown(wait=False, cancel_futures=True)

    meta.update(
        finished=now_iso(), capped=capped, costUsd=round(total_cost, 6),
        outcomes=dict(outcomes), promptHash=prompt_hash,
    )
    write_json(run_dir / "run.json", meta)
    counts = ", ".join(f"{k} {v}" for k, v in sorted(outcomes.items(), key=lambda kv: str(kv[0])))
    print(f"Done: {finished_n} of {total_items} results ({counts}), total ${total_cost:.4f}")
    if capped:
        print(f"Spending cap reached: ${total_cost:.2f} of ${a.max_usd:.2f}; {not_started} not started. "
              f"Resume with: uv run python -m evals.run --resume {shown} --max-usd {a.max_usd * 2:g}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
