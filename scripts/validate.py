#!/usr/bin/env python
"""Validate extracted NIRF JSON and write validation_report.md."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
REPORT_PATH = ROOT / "validation_report.md"

NUMERIC_FIELDS = {
    "male",
    "female",
    "total",
    "withinState",
    "outsideState",
    "outsideCountry",
    "economicallyBackward",
    "sociallyChallenged",
    "stateAndCentralGovernment",
    "institution",
    "privateBodies",
    "notReceivingFullTuitionFeeReimbursement",
    "intake",
    "admitted",
    "graduatedMinimumTime",
    "placed",
    "medianSalaryInr",
    "higherStudies",
    "fullTime",
    "partTime",
    "library",
    "labEquipment",
    "workshops",
    "studios",
    "other",
    "salaries",
    "maintenance",
    "seminars",
    "published",
    "granted",
    "projects",
    "fundingAgencies",
    "amountInr",
    "clients",
    "programs",
    "participants",
    "earningsInr",
    "cgpa",
    "age",
    "experienceMonths",
}


def walk_values(value: Any, path: str = ""):
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else key
            yield from walk_values(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_values(child, f"{path}[{index}]")
    else:
        yield path, value


def validate_university(data: dict[str, Any]) -> list[str]:
    short_name = data.get("institute", {}).get("shortName", "Unknown")
    warnings: list[str] = list(data.get("dataWarnings", []))

    def warn(message: str) -> None:
        if message not in warnings:
            warnings.append(message)

    for path, value in walk_values(data):
        field = path.rsplit(".", 1)[-1]
        if field in NUMERIC_FIELDS and value is None:
            warn(f"Missing numeric value: {path}.")

    for index, row in enumerate(data.get("studentStrength", [])):
        male, female, total = row.get("male"), row.get("female"), row.get("total")
        if all(isinstance(value, (int, float)) for value in (male, female, total)):
            if male + female != total:
                warn(
                    f"Student gender total mismatch: studentStrength[{index}] "
                    f"({row.get('programType')}): {male} + {female} != {total}."
                )

    for index, row in enumerate(data.get("placements", [])):
        placed = row.get("placed")
        graduated = row.get("graduatedMinimumTime")
        if (
            isinstance(placed, (int, float))
            and isinstance(graduated, (int, float))
            and placed > graduated
        ):
            warn(
                f"Placement sanity check failed: placements[{index}] "
                f"({row.get('programType')}, {row.get('graduationAcademicYear')}): "
                f"placed {placed} > graduatedMinimumTime {graduated}."
            )

    faculty = data.get("faculty", {})
    rows = faculty.get("rows", [])
    if rows:
        last_srno = rows[-1].get("srNo")
        if isinstance(last_srno, int) and len(rows) != last_srno:
            warn(
                f"Faculty count mismatch: extracted {len(rows)} rows; "
                f"last SrNo in PDF is {last_srno}."
            )
        serials = [row.get("srNo") for row in rows]
        if len(serials) != len(set(serials)):
            warn("Faculty table contains duplicate SrNo values.")
        if isinstance(last_srno, int) and serials != list(range(1, last_srno + 1)):
            missing = sorted(set(range(1, last_srno + 1)) - set(serials))
            if missing:
                warn(
                    "Faculty SrNo sequence has gaps; missing serial numbers: "
                    + ", ".join(str(value) for value in missing)
                    + "."
                )
    elif not faculty.get("reportedCount"):
        warn("Faculty rows and a reported faculty count are both unavailable.")

    for section, label in (
        ("ipR", "patent"),
        ("sponsoredResearch", "sponsored research"),
        ("consultancy", "consultancy"),
        ("executiveDevelopment", "executive development"),
    ):
        if not data.get(section):
            warn(f"No {label} data rows were extracted.")

    if data.get("dataWarnings") is None:
        warn("Extraction warning list is missing from this university record.")
    if not short_name or short_name == "Unknown":
        warn("Institute short name could not be determined.")
    return warnings


def main() -> int:
    combined_path = DATA_DIR / "all.json"
    if not combined_path.exists():
        print(
            f"Missing {combined_path}. Run scripts/extract.py first.",
            file=sys.stderr,
        )
        return 1

    combined = json.loads(combined_path.read_text(encoding="utf-8"))
    universities = combined.get("universities", [])
    if not universities:
        print("No university records found in all.json.", file=sys.stderr)
        return 1

    report_lines = [
        "# NIRF 2025 extraction validation report",
        "",
        "Source: institute-submitted NIRF 2025 PDFs. Values are not corrected or inferred.",
        "A warning means the source was incomplete, a check failed, or a value could not be verified.",
        "",
        f"Universities checked: {len(universities)}",
        "",
    ]
    total_warnings = 0
    has_errors = False
    for data in universities:
        name = data.get("institute", {}).get("shortName", "Unknown")
        display_name = data.get("institute", {}).get("name", name)
        warnings = validate_university(data)
        total_warnings += len(warnings)
        faculty_rows = data.get("faculty", {}).get("rows", [])
        last_srno = faculty_rows[-1].get("srNo") if faculty_rows else None
        if faculty_rows and len(faculty_rows) != last_srno:
            has_errors = True
        report_lines.extend(
            [
                f"## {name} — {display_name}",
                "",
                f"- Faculty detail rows extracted: {len(faculty_rows)}",
                f"- Last faculty SrNo extracted: {last_srno if last_srno is not None else 'Not available'}",
                f"- Warnings: {len(warnings)}",
                "",
            ]
        )
        if warnings:
            report_lines.extend(f"- **Warning:** {warning}" for warning in warnings)
        else:
            report_lines.append("- No warnings.")
        report_lines.append("")

    report_lines.extend(
        [
            "## Overall",
            "",
            f"- Warnings logged: {total_warnings}",
            "- Null values remain null; source values were not silently changed.",
            "- SPPU reports 653 faculty members but its supplied PDF contains no individual faculty rows.",
            "",
        ]
    )
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"Wrote {REPORT_PATH} ({total_warnings} warnings across {len(universities)} universities).")
    return 1 if has_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
