#!/usr/bin/env python3
"""Create numbered FR, NFR, ADR, or EPIC Markdown records from JSON input."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any


STATUSES = {"draft", "accepted", "implemented", "verified", "deferred", "superseded"}
PREFIXES = {"FR", "NFR", "ADR", "EPIC"}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    if not slug:
        raise ValueError("title must contain at least one letter or digit")
    return slug


def load_input(path: str) -> dict[str, Any]:
    raw = sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("input must be a JSON object")
    return data


def required_string(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"'{key}' must be a non-empty string")
    return value.strip()


def string_list(data: dict[str, Any], key: str, required: bool = False) -> list[str]:
    value = data.get(key, [])
    if value is None and not required:
        return []
    if not isinstance(value, list) or (required and not value):
        qualifier = "a non-empty list" if required else "a list"
        raise ValueError(f"'{key}' must be {qualifier}")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"'{key}' entries must be non-empty strings")
    return [item.strip() for item in value]


def markdown_list(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items) if items else "- None"


def yaml_scalar(value: str) -> str:
    """Use readable plain scalars when safe and JSON quoting otherwise."""
    if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 ._/-]*", value):
        return value
    return json.dumps(value, ensure_ascii=False)


def front_matter(record_id: str, title: str, status: str, origin: str | None = None) -> str:
    lines = ["---", f"id: {record_id}", f"title: {yaml_scalar(title)}", f"status: {status}"]
    if origin is not None:
        lines.append(f"origin: {yaml_scalar(origin)}")
    lines.append("---")
    return "\n".join(lines)


def next_number(root: Path, prefix: str) -> int:
    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)(?:[-:.]|$)", re.IGNORECASE)
    highest = 0
    for path in root.glob("docs/**/*.md"):
        match = pattern.match(path.name)
        if match:
            highest = max(highest, int(match.group(1)))
    return highest + 1


def output_directory(root: Path, record_type: str, data: dict[str, Any]) -> Path:
    if record_type == "FR":
        return root / "docs/requirements/functional" / slugify(required_string(data, "epic"))
    if record_type == "NFR":
        return root / "docs/requirements/non-functional" / slugify(required_string(data, "epic"))
    if record_type == "ADR":
        return root / "docs/decisions"
    return root / "docs/epics"


def references(data: dict[str, Any]) -> str:
    return "\n".join([
        "## Architecture References",
        "",
        markdown_list(string_list(data, "architecture_references")),
        "",
        "## Dependencies",
        "",
        markdown_list(string_list(data, "dependencies")),
    ])


def render_requirement(record_type: str, record_id: str, title: str, status: str, data: dict[str, Any]) -> str:
    statement = required_string(data, "statement")
    criteria = string_list(data, "acceptance_criteria", required=True)
    return "\n\n".join([
        front_matter(record_id, title, status, required_string(data, "epic")),
        f"# {record_id} — {title}",
        "## Requirement\n\n" + statement,
        "## Acceptance Criteria\n\n" + markdown_list(criteria),
        references(data),
    ]) + "\n"


def render_adr(record_id: str, title: str, status: str, data: dict[str, Any]) -> str:
    return "\n\n".join([
        front_matter(record_id, title, status),
        f"# {record_id}: {title}",
        "## Context\n\n" + required_string(data, "context"),
        "## Decision\n\n" + required_string(data, "decision"),
        "## Consequences\n\n" + required_string(data, "consequences"),
        references(data),
    ]) + "\n"


def render_epic(record_id: str, title: str, status: str, data: dict[str, Any]) -> str:
    return "\n\n".join([
        front_matter(record_id, title, status),
        f"# {record_id} — {title}",
        "## Objective\n\n" + required_string(data, "objective"),
        "## Scope\n\n" + markdown_list(string_list(data, "scope", required=True)),
        "## Acceptance Criteria\n\n" + markdown_list(string_list(data, "acceptance_criteria", required=True)),
        references(data),
    ]) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("type", choices=sorted(PREFIXES))
    parser.add_argument("--input", required=True, help="JSON file path, or '-' for stdin")
    parser.add_argument("--root", default=".", help="repository root (default: current directory)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not (root / "docs").is_dir():
        raise ValueError(f"no docs directory found under {root}")
    data = load_input(args.input)
    title = required_string(data, "title")
    status = data.get("status", "draft")
    if status not in STATUSES:
        raise ValueError(f"'status' must be one of: {', '.join(sorted(STATUSES))}")

    number = next_number(root, args.type)
    record_id = f"{args.type}-{number:03d}"
    directory = output_directory(root, args.type, data)
    destination = directory / f"{record_id}-{slugify(title)}.md"

    if args.type in {"FR", "NFR"}:
        content = render_requirement(args.type, record_id, title, status, data)
    elif args.type == "ADR":
        content = render_adr(record_id, title, status, data)
    else:
        content = render_epic(record_id, title, status, data)

    if args.dry_run:
        print(destination.relative_to(root))
        return 0

    directory.mkdir(parents=True, exist_ok=True)
    destination.write_text(content, encoding="utf-8")
    print(destination.relative_to(root))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
