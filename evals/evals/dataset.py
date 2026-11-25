"""Loading the golden dataset for the runner: documents, truth, subsets, hash."""

from __future__ import annotations

import fnmatch
import hashlib
from dataclasses import dataclass
from pathlib import Path

from evals.truth import Truth

EVALS_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATASET = EVALS_DIR / "dataset"
# Both types are always offered to the classifier (a company with an Invoice and a Receipt type).
TYPE_FILES = [EVALS_DIR / "types" / "invoice.json", EVALS_DIR / "types" / "receipt.json"]


@dataclass(frozen=True)
class Doc:
    id: str
    path: Path  # the document file
    truth_path: Path
    truth: Truth

    @property
    def tags(self) -> list[str]:
        return self.truth.tags


def load_dataset(dataset_dir: str | Path) -> list[Doc]:
    """Every `*.truth.json` under dataset_dir (recursive), sorted by id."""
    docs = []
    for tp in Path(dataset_dir).glob("**/*.truth.json"):
        truth = Truth.model_validate_json(tp.read_text(encoding="utf-8"))
        docs.append(Doc(truth.id, (tp.parent / truth.file).resolve(), tp.resolve(), truth))
    return sorted(docs, key=lambda d: d.id)


def select(docs: list[Doc], subset: str | None) -> list[Doc]:
    """Comma-separated patterns; a pattern matches an id (fnmatch) or equals a tag."""
    if not subset:
        return list(docs)
    patterns = [p.strip() for p in subset.split(",") if p.strip()]
    return [
        d
        for d in docs
        if any(fnmatch.fnmatchcase(d.id, p) or p in d.tags for p in patterns)
    ]


def dataset_hash(docs: list[Doc], dataset_dir: str | Path) -> str:
    """sha256 over sorted (relative path, bytes) of documents and truth files."""
    root = Path(dataset_dir).resolve()
    files = sorted({p for d in docs for p in (d.path, d.truth_path)})
    h = hashlib.sha256()
    for p in sorted(files, key=lambda p: p.relative_to(root).as_posix()):
        h.update(p.relative_to(root).as_posix().encode())
        h.update(b"\0")
        h.update(p.read_bytes())
        h.update(b"\0")
    return h.hexdigest()
