#!/usr/bin/env python
"""Extract NIRF 2025 submitted institute data from the supplied PDFs."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
INPUT_DIRS = (ROOT / "data" / "pdfs", ROOT / "docs")
OUTPUT_DIR = ROOT / "public" / "data"

KNOWN_SHORT_NAMES = {
    "IR-O-U-0298": "BAMU",
    "IR-O-U-1257": "COEP",
    "IR-O-U-0320": "KBCNMU",
    "IR-O-U-0318": "MU",
    "IR-O-U-0332": "RTMNU",
    "IR-O-U-0324": "SGBAU",
    "IR-O-U-0323": "SPPU",
}

PROGRAM_RE = re.compile(
    r"\b(?:UG|PG)\s*\[\s*\d+\s*Years?\s*Program\(s\)\s*\]"
    r"|\bPG\s*-\s*Integrated(?:\s*\[\s*\d+\s*Years?\s*Program\(s\)\s*\])?",
    re.IGNORECASE,
)
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\s*[-–]\s*(?:\d{2}|(?:19|20)\d{2})\b")
FACULTY_HEADER = "srno"
NUMBER_RE = re.compile(r"[-+]?\d[\d,]*(?:\.\d+)?")
NULL_MARKERS = {"", "-", "--", "—", "–", "not reported", "n/a", "na"}


@dataclass
class TableData:
    rows: list[list[str | None]]
    bbox: tuple[float, float, float, float] | None = None


@dataclass
class PageData:
    text: str
    tables: list[TableData]
    width: float = 0
    height: float = 0
    positioned_words: list[tuple[float, float, str]] | None = None


def clean(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def read_with_pdfplumber(path: Path) -> list[PageData]:
    import pdfplumber

    pages: list[PageData] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            found = page.find_tables()
            tables = [
                TableData(
                    rows=[[cell for cell in row] for row in table.extract()],
                    bbox=tuple(table.bbox),
                )
                for table in found
            ]
            pages.append(
                PageData(
                    text=page.extract_text() or "",
                    tables=tables,
                    width=page.width,
                    height=page.height,
                    positioned_words=[
                        (word["top"], word["x0"], word["text"])
                        for word in page.extract_words()
                    ],
                )
            )
    return pages


def read_with_pymupdf(path: Path) -> list[PageData]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError(
            "pdfplumber could not read this PDF and PyMuPDF is unavailable. "
            "Install the dependencies from requirements.txt and retry."
        ) from exc

    pages: list[PageData] = []
    with fitz.open(path) as document:
        for page in document:
            text = page.get_text("text")
            tables: list[TableData] = []
            positioned_words: list[tuple[float, float, str]] = []
            for word in page.get_text("words"):
                x0, y0, _x1, _y1, token = word[:5]
                positioned_words.append((y0, x0, token))
            finder = getattr(page, "find_tables", None)
            if finder is not None:
                for table in finder().tables:
                    tables.append(
                        TableData(
                            rows=[[cell for cell in row] for row in table.extract()],
                            bbox=tuple(table.bbox),
                        )
                    )
            else:
                words = page.get_text("words")
                lines: dict[tuple[int, int], list[tuple[float, str]]] = {}
                for word in words:
                    x0, y0, _x1, _y1, token, block, line, _word = word
                    lines.setdefault((block, line), []).append((x0, token))
                rows = [
                    [clean(token) for _x, token in sorted(line)]
                    for _key, line in sorted(lines.items())
                ]
                if rows:
                    tables.append(TableData(rows=rows))
            pages.append(
                PageData(
                    text=text,
                    tables=tables,
                    width=page.rect.width,
                    height=page.rect.height,
                    positioned_words=positioned_words,
                )
            )
    return pages


def read_pdf(path: Path, warnings: list[str]) -> list[PageData]:
    try:
        return read_with_pdfplumber(path)
    except Exception as exc:
        warnings.append(
            f"pdfplumber failed ({type(exc).__name__}: {exc}); attempted PyMuPDF fallback."
        )
        return read_with_pymupdf(path)


def parse_number(value: Any) -> int | float | None:
    text = clean(value)
    if text.lower() in NULL_MARKERS:
        return None
    match = NUMBER_RE.search(text)
    if not match:
        return None
    number = float(match.group().replace(",", ""))
    return int(number) if number.is_integer() else number


def parse_bool(value: Any) -> bool | None:
    text = clean(value).lower()
    if re.search(r"\byes\b", text):
        return True
    if re.search(r"\bno\b", text):
        return False
    return None


def parse_date(value: Any) -> str | None:
    text = clean(value)
    if text.lower() in NULL_MARKERS:
        return None
    try:
        return datetime.strptime(text, "%d-%m-%Y").date().isoformat()
    except ValueError:
        return None


def normalize_program(value: str) -> str:
    text = clean(value).replace("–", "-")
    integrated = re.fullmatch(
        r"PG\s*-\s*Integrated(?:\s*\[\s*(\d+)\s*Years?\s*Program\(s\)\s*\])?",
        text,
        re.IGNORECASE,
    )
    if integrated:
        years = integrated.group(1)
        return f"PG-Integrated [{years} Years Program(s)]" if years else "PG-Integrated"
    standard = re.fullmatch(
        r"(UG|PG)\s*\[\s*(\d+)\s*Years?\s*Program\(s\)\s*\]",
        text,
        re.IGNORECASE,
    )
    if standard:
        program, year_count = standard.groups()
        return f"{program.upper()} [{year_count} {'Year' if year_count == '1' else 'Years'} Program(s)]"
    return re.sub(r"\s+", " ", text)


def find_programs(value: str) -> list[str]:
    return [normalize_program(match.group()) for match in PROGRAM_RE.finditer(value)]


def years_in(values: list[Any]) -> list[str]:
    found: list[str] = []
    for value in values:
        text = clean(value).replace("–", "-")
        if not re.fullmatch(r"(?:19|20)\d{2}\s*-\s*\d{2}", text):
            continue
        year = re.sub(r"\s+", "", text)
        if year not in found:
            found.append(year)
    return found


def table_text(table: TableData) -> str:
    return " ".join(clean(cell) for row in table.rows for cell in row if cell)


def cell_at(row: list[Any], index: int) -> str:
    return clean(row[index]) if index < len(row) else ""


def all_tables(pages: list[PageData]) -> list[tuple[int, PageData, TableData]]:
    return [
        (page_number, page, table)
        for page_number, page in enumerate(pages, start=1)
        for table in page.tables
    ]


def make_warning(warnings: list[str], message: str) -> None:
    if message not in warnings:
        warnings.append(message)


def extract_institute(pages: list[PageData], path: Path) -> dict[str, str | None]:
    first_text = "\n".join(page.text for page in pages[:2])
    match = re.search(
        r"Institute Name:\s*(.*?)\s*\[(IR-[A-Z]-[A-Z]-\d+)\]",
        first_text,
        re.IGNORECASE,
    )
    name = clean(match.group(1)) if match else path.stem
    nirf_id = match.group(2).upper() if match else None
    short_name = KNOWN_SHORT_NAMES.get(nirf_id or "")
    if not short_name:
        name_match = re.search(r"(?:NIRF(?:_Ranking)?[_\s-]*2025[_\s-]*)?([A-Za-z0-9]+)$", path.stem)
        short_name = name_match.group(1).upper() if name_match else path.stem.upper()
    return {"shortName": short_name, "name": name, "nirfId": nirf_id}


def extract_intake(tables: list[tuple[int, PageData, TableData]]) -> list[dict[str, Any]]:
    for _page_number, _page, table in tables:
        for row in table.rows:
            if "Academic Year" not in clean(row[0] if row else ""):
                continue
            academic_years = [clean(cell) for cell in row[1:] if clean(cell)]
            program_rows = [
                candidate
                for candidate in table.rows
                if candidate and PROGRAM_RE.search(clean(candidate[0]))
            ]
            if not program_rows:
                continue
            output = []
            for candidate in program_rows:
                label = normalize_program(clean(candidate[0]))
                values = {
                    academic_years[index]: parse_number(candidate[index + 1])
                    for index in range(min(len(academic_years), max(0, len(candidate) - 1)))
                }
                output.append({"programType": label, "byAcademicYear": values})
            return output
    return []


def extract_students(
    tables: list[tuple[int, PageData, TableData]], warnings: list[str]
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for page_number, _page, table in tables:
        joined = table_text(table).lower()
        if "no. of male" not in joined or "total students" not in joined:
            continue
        for row_number, row in enumerate(table.rows):
            label = cell_at(row, 0)
            if not PROGRAM_RE.search(label):
                continue
            record = {
                "programType": normalize_program(label),
                "male": parse_number(cell_at(row, 1)),
                "female": parse_number(cell_at(row, 2)),
                "total": parse_number(cell_at(row, 3)),
                "withinState": parse_number(cell_at(row, 4)),
                "outsideState": parse_number(cell_at(row, 5)),
                "outsideCountry": parse_number(cell_at(row, 6)),
                "economicallyBackward": parse_number(cell_at(row, 7)),
                "sociallyChallenged": parse_number(cell_at(row, 8)),
                "feeReimbursement": {
                    "stateAndCentralGovernment": parse_number(cell_at(row, 9)),
                    "institution": parse_number(cell_at(row, 10)),
                    "privateBodies": parse_number(cell_at(row, 11)),
                    "notReceivingFullTuitionFeeReimbursement": parse_number(
                        cell_at(row, 12)
                    ),
                },
                "sourcePage": page_number,
                "sourceRow": row_number + 1,
            }
            output.append(record)
            for field in ("male", "female", "total"):
                if record[field] is None:
                    make_warning(
                        warnings,
                        f"studentStrength[{len(output) - 1}].{field} is missing "
                        f"(page {page_number}, row {row_number + 1}).",
                    )
    return output


def extract_placements(
    pages: list[PageData], warnings: list[str]
) -> list[dict[str, Any]]:
    placements: list[dict[str, Any]] = []
    current_program: str | None = None
    for page_number, page in enumerate(pages, start=1):
        for table in page.tables:
            if table.bbox:
                positioned = page.positioned_words or []
                prior_words = [
                    (top, x0, text)
                    for top, x0, text in positioned
                    if top < table.bbox[1]
                ]
                prior_lines: list[list[Any]] = []
                for top, x0, token in sorted(prior_words):
                    if not prior_lines or abs(top - prior_lines[-1][0]) > 2:
                        prior_lines.append([top, x0, token])
                    else:
                        prior_lines[-1][1] = min(prior_lines[-1][1], x0)
                        prior_lines[-1][2] += " " + token
                prior = " ".join(line[2] for line in prior_lines)
                labels = find_programs(prior)
                if labels:
                    current_program = labels[-1]

            rows = table.rows
            if not rows:
                continue
            for row_number, row in enumerate(rows):
                year = clean(cell_at(row, 0))
                if not re.fullmatch(r"(?:19|20)\d{2}\s*[-–]\s*\d{2}", year):
                    continue
                if len(row) < 8:
                    continue
                if len(row) >= 10:
                    record = {
                        "programType": current_program,
                        "intakeAcademicYear": re.sub(r"\s+", "", year).replace("–", "-"),
                        "intake": parse_number(cell_at(row, 1)),
                        "admitted": parse_number(cell_at(row, 2)),
                        "lateralEntryAcademicYear": clean(cell_at(row, 3)) or None,
                        "lateralEntry": parse_number(cell_at(row, 4)),
                        "graduationAcademicYear": clean(cell_at(row, 5)) or None,
                        "graduatedMinimumTime": parse_number(cell_at(row, 6)),
                        "placed": parse_number(cell_at(row, 7)),
                        "medianSalaryInr": parse_number(cell_at(row, 8)),
                        "higherStudies": parse_number(cell_at(row, 9)),
                    }
                else:
                    record = {
                        "programType": current_program,
                        "intakeAcademicYear": re.sub(r"\s+", "", year).replace("–", "-"),
                        "intake": parse_number(cell_at(row, 1)),
                        "admitted": parse_number(cell_at(row, 2)),
                        "lateralEntryAcademicYear": None,
                        "lateralEntry": None,
                        "graduationAcademicYear": clean(cell_at(row, 3)) or None,
                        "graduatedMinimumTime": parse_number(cell_at(row, 4)),
                        "placed": parse_number(cell_at(row, 5)),
                        "medianSalaryInr": parse_number(cell_at(row, 6)),
                        "higherStudies": parse_number(cell_at(row, 7)),
                    }
                if record["programType"] is None:
                    make_warning(
                        warnings,
                        f"Placement program type could not be resolved on page {page_number}, "
                        f"row {row_number + 1}.",
                    )
                record["sourcePage"] = page_number
                placements.append(record)
        bounded_tables = [table for table in page.tables if table.bbox]
        if bounded_tables and page.positioned_words:
            final_table_bottom = max(table.bbox[3] for table in bounded_tables if table.bbox)
            trailing_words = [
                (top, x0, text)
                for top, x0, text in page.positioned_words
                if top > final_table_bottom
            ]
            trailing_text = " ".join(
                text for _top, _x0, text in sorted(trailing_words)
            )
            labels = find_programs(trailing_text)
            if labels:
                current_program = labels[-1]
    return placements


def extract_phd(tables: list[tuple[int, PageData, TableData]]) -> dict[str, Any]:
    pursuing: dict[str, int | float | None] = {"fullTime": None, "partTime": None}
    graduated: dict[str, dict[str, int | float | None]] = {}
    for _page_number, _page, table in tables:
        text = table_text(table).lower()
        if "ph.d" not in text and "phd" not in text:
            continue
        current_section = "pursuing" if "total students" in text else None
        graduation_years: list[str] = []
        for row in table.rows:
            row_text = " ".join(clean(cell) for cell in row)
            if "total students" in row_text.lower():
                current_section = "pursuing"
            row_years = years_in(row)
            if len(row_years) >= 2:
                graduation_years = row_years[:3]
                current_section = "graduated"
                for year in graduation_years:
                    graduated.setdefault(year, {"fullTime": None, "partTime": None})
            label = clean(cell_at(row, 0)).lower()
            field = "fullTime" if label.startswith("full time") else (
                "partTime" if label.startswith("part time") else None
            )
            if not field or current_section is None:
                continue
            values = [parse_number(cell) for cell in row[1:]]
            if current_section == "graduated" and graduation_years:
                for index, year in enumerate(graduation_years):
                    graduated[year][field] = values[index] if index < len(values) else None
            elif values:
                present = [value for value in values if value is not None]
                if present:
                    pursuing[field] = present[-1]
    return {
        "pursuing": pursuing,
        "graduated": [
            {"academicYear": year, **counts}
            for year, counts in sorted(graduated.items())
        ],
    }


FINANCE_FIELDS = {
    "library": ("library",),
    "labEquipment": ("laborator", "laboratory"),
    "workshops": ("workshop",),
    "studios": ("studio",),
    "other": ("other expenditure on creation of capital assets",),
    "salaries": ("salaries",),
    "maintenance": ("maintenance of academic infrastructure",),
    "seminars": ("seminars", "conferences", "workshops"),
}


def map_finance_field(label: str, kind: str) -> str | None:
    text = clean(label).lower()
    allowed = (
        ("library", "labEquipment", "workshops", "studios", "other")
        if kind == "capex"
        else ("salaries", "maintenance", "seminars")
    )
    for key in allowed:
        if any(needle in text for needle in FINANCE_FIELDS[key]):
            return key
    return None


def table_year_header(table: TableData) -> tuple[int, list[str]] | None:
    for index, row in enumerate(table.rows):
        years = years_in(row)
        if len(years) >= 2:
            return index, years[:3]
    return None


def extract_finance(tables: list[tuple[int, PageData, TableData]]) -> dict[str, Any]:
    by_year: dict[str, dict[str, dict[str, int | float | None]]] = {}
    last_years: list[str] = []
    current_kind: str | None = None
    for _page_number, _page, table in tables:
        text = table_text(table).lower()
        header = table_year_header(table)
        if header:
            last_years = header[1]
        if "capital expenditure" in text:
            current_kind = "capex"
        elif "operational expenditure" in text or "salaries" in text:
            current_kind = "opex"
        if current_kind is None or not last_years:
            continue
        for year in last_years:
            year_data = by_year.setdefault(year, {"capex": {}, "opex": {}})
            for field in (
                ("library", "labEquipment", "workshops", "studios", "other")
                if current_kind == "capex"
                else ("salaries", "maintenance", "seminars")
            ):
                year_data[current_kind].setdefault(field, None)
        for row in table.rows:
            field = map_finance_field(cell_at(row, 0), current_kind)
            if not field:
                continue
            for index, year in enumerate(last_years):
                value = parse_number(cell_at(row, index + 1))
                by_year[year][current_kind][field] = value
    return {
        "years": [
            {"academicYear": year, "capex": values["capex"], "opex": values["opex"]}
            for year, values in sorted(by_year.items(), reverse=True)
        ]
    }


def extract_ipr(tables: list[tuple[int, PageData, TableData]]) -> list[dict[str, Any]]:
    result: dict[str, dict[str, int | float | None]] = {}
    for _page_number, _page, table in tables:
        rows = table.rows
        header = next(
            (
                [clean(cell) for cell in row]
                for row in rows
                if any(re.fullmatch(r"(?:19|20)\d{2}", clean(cell)) for cell in row)
            ),
            [],
        )
        years = [clean(cell) for cell in header if re.fullmatch(r"(?:19|20)\d{2}", clean(cell))]
        if not years:
            continue
        for row in rows:
            label = clean(cell_at(row, 0)).lower()
            field = "published" if "patent" in label and "published" in label else (
                "granted" if "patent" in label and "granted" in label else None
            )
            if not field:
                continue
            for index, year in enumerate(years):
                result.setdefault(year, {"published": None, "granted": None})
                result[year][field] = parse_number(cell_at(row, index + 1))
    return [
        {"calendarYear": year, **values}
        for year, values in sorted(result.items(), reverse=True)
    ]


def extract_annual_metrics(
    tables: list[tuple[int, PageData, TableData]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    sponsored: dict[str, dict[str, Any]] = {}
    consultancy: dict[str, dict[str, Any]] = {}
    edp: dict[str, dict[str, Any]] = {}
    last_years: list[str] = []

    for _page_number, _page, table in tables:
        header = table_year_header(table)
        if header:
            last_years = header[1]
        years = header[1] if header else last_years
        for row in table.rows:
            label = clean(cell_at(row, 0)).lower()
            if not label:
                continue
            category: dict[str, dict[str, Any]] | None = None
            field: str | None = None
            if "sponsored" in label and "project" in label:
                category, field = sponsored, "projects"
            elif "funding agencies" in label:
                category, field = sponsored, "fundingAgencies"
            elif "consultancy" in label and "project" in label:
                category, field = consultancy, "projects"
            elif "client organizations" in label:
                category, field = consultancy, "clients"
            elif "executive development" in label or "management development programs" in label:
                category, field = edp, "programs"
            elif "participants" in label:
                category, field = edp, "participants"
            elif "total annual earnings" in label and "in words" not in label:
                category, field = edp, "earningsInr"
            elif "total amount received" in label:
                if "funding agencies" in table_text(table).lower():
                    category, field = sponsored, "amountInr"
                elif "consultancy" in table_text(table).lower():
                    category, field = consultancy, "amountInr"
                elif "sponsored projects" in table_text(table).lower():
                    category, field = sponsored, "amountInr"
                elif "consultancy projects" in table_text(table).lower():
                    category, field = consultancy, "amountInr"
                else:
                    category, field = sponsored, "amountInr"
            if category is None or field is None or not years:
                continue
            for index, year in enumerate(years):
                record = category.setdefault(year, {"financialYear": year})
                record[field] = parse_number(cell_at(row, index + 1))
    return (
        list(sponsored.values()),
        list(consultancy.values()),
        list(edp.values()),
    )


def extract_accessibility_and_accreditation(
    pages: list[PageData], tables: list[tuple[int, PageData, TableData]]
) -> tuple[dict[str, Any], dict[str, Any]]:
    accessibility: dict[str, Any] = {
        "liftsRamps": None,
        "walkingAids": None,
        "accessibleToilets": None,
    }
    naac: dict[str, Any] = {
        "valid": None,
        "validFrom": None,
        "validUpto": None,
        "cgpa": None,
    }
    for _page_number, _page, table in tables:
        text = table_text(table).lower()
        if "naac" in text or "accreditation" in text:
            for row in table.rows:
                label = clean(cell_at(row, 0)).lower()
                if "valid" in label and "accreditation" in label:
                    naac["valid"] = parse_bool(cell_at(row, 2) or cell_at(row, 1))
                elif label == "valid from":
                    naac["validFrom"] = parse_date(cell_at(row, 0))
                elif "valid from" in text and "valid upto" in text and len(row) >= 2:
                    if parse_date(cell_at(row, 0)):
                        naac["validFrom"] = parse_date(cell_at(row, 0))
                        naac["validUpto"] = parse_date(cell_at(row, 1))
                        for cell in row[2:]:
                            numeric = parse_number(cell)
                            if numeric is not None:
                                naac["cgpa"] = numeric
                                break
                if "cgpa" in label:
                    for cell in row[1:]:
                        value = parse_number(cell)
                        if value is not None:
                            naac["cgpa"] = value
            if "does your institute have a valid naac accreditation" in text:
                for row in table.rows:
                    if any(parse_date(cell) for cell in row):
                        dates = [parse_date(cell) for cell in row]
                        date_values = [value for value in dates if value]
                        if len(date_values) >= 2:
                            naac["validFrom"], naac["validUpto"] = date_values[:2]
                        numeric = [parse_number(cell) for cell in row]
                        numeric_values = [value for value in numeric if value is not None]
                        if numeric_values:
                            naac["cgpa"] = numeric_values[-1]
        if "physically challenged" in text or "lifts/ramps" in text:
            for row in table.rows:
                label = clean(cell_at(row, 0)).lower()
                answer = clean(cell_at(row, 1)) or None
                if "lifts/ramps" in label:
                    accessibility["liftsRamps"] = answer
                elif "walking aids" in label:
                    accessibility["walkingAids"] = answer
                elif "specially designed toilets" in label:
                    accessibility["accessibleToilets"] = answer
    # Some PDFs expose NAAC as text even when the table detector merged the cells.
    for page in pages:
        text = page.text
        if "valid naac accreditation" in text.lower():
            lines = [clean(line) for line in text.splitlines()]
            for index, line in enumerate(lines):
                if "valid from" in line.lower() and index + 1 < len(lines):
                    parts = lines[index + 1].split()
                    dates = [parse_date(value) for value in parts]
                    dates = [value for value in dates if value]
                    if len(dates) >= 2:
                        naac["validFrom"], naac["validUpto"] = dates[:2]
                    if parts:
                        value = parse_number(parts[-1])
                        if value is not None:
                            naac["cgpa"] = value
                if "valid naac accreditation" in line.lower():
                    naac["valid"] = parse_bool(line)
    return accessibility, naac


def extract_policies(
    tables: list[tuple[int, PageData, TableData]]
) -> dict[str, bool | None]:
    mappings = {
        "multipleEntryExit": ("multiple entry/exit",),
        "indianLanguages": ("teaching courses in indian languages",),
        "indianKnowledgeSystem": ("indian knowledge system",),
        "grievanceCell": ("grievance redressal cell",),
        "nationalStateEntranceExams": ("national and state level entrance exam",),
    }
    output: dict[str, bool | None] = {key: None for key in mappings}
    for _page_number, _page, table in tables:
        for row in table.rows:
            label = clean(cell_at(row, 0)).lower()
            answer = parse_bool(" ".join(clean(cell) for cell in row[1:]))
            for key, needles in mappings.items():
                if any(needle in label for needle in needles):
                    output[key] = answer
    return output


def extract_sustainability(pages: list[PageData]) -> list[dict[str, Any]]:
    practices: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    section_active = False
    for page in pages:
        if "sustainable living practices" in page.text.lower():
            section_active = True
        for table in page.tables:
            for row in table.rows:
                value = clean(cell_at(row, 0))
                if not value:
                    continue
                if clean(value).lower() == FACULTY_HEADER:
                    section_active = False
                    current = None
                    continue
                if "faculty details" in value.lower():
                    section_active = False
                    current = None
                    continue
                if "sustainable living practices" in value.lower():
                    section_active = True
                    continue
                if not section_active:
                    continue
                if re.match(r"^\d+\s*\.?\s*what\b", value, re.IGNORECASE):
                    current = {"practice": value, "selectedOptions": []}
                    practices.append(current)
                    continue
                option = re.sub(r"^[\uFFFD\u2022\u25A0\s]+", "", value).strip()
                if current is not None and option and not re.match(r"^\d+\s*\.", option):
                    current["selectedOptions"].append(option)
    return practices


def designation_group(value: str) -> str:
    text = clean(value).lower()
    if "vice chancellor" in text or "dean" in text or "principal" in text or "director" in text:
        return "Leadership"
    if "assistant professor" in text:
        return "Assistant Professor"
    if "associate professor" in text:
        return "Associate Professor"
    if re.search(r"\bprofessor\b", text):
        return "Professor"
    if "reader" in text:
        return "Reader"
    return "Other"


def qualification_group(value: str) -> str:
    text = clean(value).lower()
    if re.search(r"\bph\.?\s*d\b", text) or "doctor of philosophy" in text:
        return "PhD"
    if re.search(r"\b(net|set|slet)\b", text):
        return "NET-SET-SLET"
    if re.search(r"\b(m\.?sc|m\.?a|m\.?tech|m\.?e\.?|mba|m\.?com|master)\b", text):
        return "Masters"
    return "Other"


def extract_faculty(
    pages: list[PageData], warnings: list[str]
) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    declared_count: int | None = None
    in_faculty_section = False
    for page_number, page in enumerate(pages, start=1):
        for table in page.tables:
            text = table_text(table).lower()
            if "number of faculty members entered" in text:
                for row in table.rows:
                    if "number of faculty members entered" in clean(cell_at(row, 0)).lower():
                        declared_count = parse_number(cell_at(row, 1))
                in_faculty_section = True
                continue
            if any(clean(cell).lower() == FACULTY_HEADER for row in table.rows for cell in row):
                in_faculty_section = True
            if not in_faculty_section:
                continue
            for row_number, row in enumerate(table.rows):
                if len(row) < 10:
                    continue
                srno = parse_number(cell_at(row, 0))
                if srno is None or not float(srno).is_integer():
                    continue
                raw_designation = clean(cell_at(row, 3))
                raw_qualification = clean(cell_at(row, 5))
                currently_working = parse_bool(cell_at(row, 7))
                joining_raw = clean(cell_at(row, 8))
                leaving_raw = clean(cell_at(row, 9))
                joining_date = parse_date(joining_raw)
                leaving_date = parse_date(leaving_raw)
                for field, raw, parsed in (
                    ("joiningDate", joining_raw, joining_date),
                    ("leavingDate", leaving_raw, leaving_date),
                ):
                    if raw.lower() not in NULL_MARKERS and parsed is None:
                        make_warning(
                            warnings,
                            f"faculty row SrNo {int(srno)} has unparsed {field}: {raw!r} "
                            f"(page {page_number}).",
                        )
                records.append(
                    {
                        "srNo": int(srno),
                        "name": clean(cell_at(row, 1)) or None,
                        "age": parse_number(cell_at(row, 2)),
                        "designation": raw_designation or None,
                        "designationGroup": designation_group(raw_designation),
                        "gender": clean(cell_at(row, 4)) or None,
                        "qualification": raw_qualification or None,
                        "qualificationGroup": qualification_group(raw_qualification),
                        "experienceMonths": parse_number(cell_at(row, 6)),
                        "currentlyWorking": currently_working,
                        "joiningDate": joining_date,
                        "leavingDate": leaving_date,
                        "associationType": clean(cell_at(row, 10)) or None,
                        "sourcePage": page_number,
                        "sourceRow": row_number + 1,
                    }
                )
    if declared_count is not None and not records:
        make_warning(
            warnings,
            f"Faculty details declare {int(declared_count)} members, but no individual "
            "faculty rows are present in this PDF.",
        )
    return {"reportedCount": declared_count, "rows": records}


def extract_university(path: Path) -> dict[str, Any]:
    warnings: list[str] = []
    pages = read_pdf(path, warnings)
    tables = all_tables(pages)
    institute = extract_institute(pages, path)
    sanctioned = extract_intake(tables)
    students = extract_students(tables, warnings)
    placements = extract_placements(pages, warnings)
    finance = extract_finance(tables)
    sponsored, consultancy, edp = extract_annual_metrics(tables)
    accessibility, naac = extract_accessibility_and_accreditation(pages, tables)
    faculty = extract_faculty(pages, warnings)

    if not institute["nirfId"]:
        make_warning(warnings, "Institute NIRF ID could not be parsed from the PDF.")
    if not sanctioned:
        make_warning(warnings, "Sanctioned intake table could not be found.")
    if not students:
        make_warning(warnings, "Student strength table could not be found.")
    if not placements:
        make_warning(warnings, "Placement tables could not be found.")
    if not faculty["rows"] and faculty["reportedCount"] is None:
        make_warning(warnings, "No individual faculty rows or declared faculty count were found.")

    institute["shortName"] = institute["shortName"] or path.stem.upper()
    data = {
        "schemaVersion": 1,
        "sourceFile": path.name,
        "institute": institute,
        "sanctionedIntake": sanctioned,
        "studentStrength": students,
        "placements": placements,
        "phd": extract_phd(tables),
        "finance": finance,
        "ipR": extract_ipr(tables),
        "sponsoredResearch": sponsored,
        "consultancy": consultancy,
        "executiveDevelopment": edp,
        "accessibility": accessibility,
        "naac": naac,
        "policies": extract_policies(tables),
        "sustainability": extract_sustainability(pages),
        "faculty": faculty,
        "dataWarnings": warnings,
    }
    return data


def discover_pdfs() -> list[Path]:
    found: list[Path] = []
    seen: set[Path] = set()
    for directory in INPUT_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.pdf")):
            resolved = path.resolve()
            if resolved not in seen:
                seen.add(resolved)
                found.append(path)
    return found


def main() -> int:
    paths = discover_pdfs()
    if not paths:
        print(
            "No PDFs found. Add submitted institute PDFs to data/pdfs/ or docs/.",
            file=sys.stderr,
        )
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    universities: list[dict[str, Any]] = []
    seen_short_names: set[str] = set()
    for path in paths:
        data = extract_university(path)
        short_name = str(data["institute"]["shortName"])
        if short_name in seen_short_names:
            print(
                f"Skipping duplicate institute key {short_name!r} from {path.name}.",
                file=sys.stderr,
            )
            continue
        seen_short_names.add(short_name)
        destination = OUTPUT_DIR / f"{short_name.lower()}.json"
        destination.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        universities.append(data)
        print(
            f"{short_name}: {len(data['studentStrength'])} student rows, "
            f"{len(data['placements'])} placement rows, "
            f"{len(data['faculty']['rows'])} faculty rows, "
            f"{len(data['dataWarnings'])} extraction warnings -> {destination}"
        )

    combined = {
        "schemaVersion": 1,
        "source": "NIRF 2025 submitted institute data",
        "universities": universities,
    }
    (OUTPUT_DIR / "all.json").write_text(
        json.dumps(combined, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote combined data for {len(universities)} universities.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
