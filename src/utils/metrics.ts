import type {
  AnnualMetric,
  FinanceYear,
  Numeric,
  StudentStrength,
  UniversityData,
} from "../types";
import { CRORE, type CurrencyMode } from "./format";

export const UNIVERSITY_COLORS = [
  "#16283f",
  "#db5a22",
  "#eca23c",
  "#5f7c96",
  "#b44c34",
  "#788a5b",
  "#7b6178",
  "#425466",
];

export function isNumber(value: Numeric | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function sumComplete(values: Numeric[]): Numeric {
  if (values.length === 0 || values.some((value) => !isNumber(value))) {
    return null;
  }
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function totalStudents(university: UniversityData): Numeric {
  // Total enrollment is the sum of the reported, mutually exclusive program-type totals.
  return sumComplete(university.studentStrength.map((row) => row.total));
}

export function phdStudentCount(university: UniversityData): Numeric {
  // Pursuing doctoral students include both full-time and part-time students.
  return sumComplete([
    university.phd.pursuing.fullTime,
    university.phd.pursuing.partTime,
  ]);
}

export function facultyCount(university: UniversityData): Numeric {
  // Prefer the individually extracted rows; use the PDF-reported count only if rows are absent.
  if (university.faculty.rows.length > 0) {
    return university.faculty.rows.length;
  }
  return university.faculty.reportedCount;
}

export function facultyStudentRatio(university: UniversityData): string | null {
  // The ratio is expressed as students per faculty member.
  const students = totalStudents(university);
  const faculty = facultyCount(university);
  if (!isNumber(students) || !isNumber(faculty) || faculty === 0) {
    return null;
  }
  return `${(students / faculty).toFixed(1)}:1`;
}

export function totalSponsoredResearch(university: UniversityData): Numeric {
  // The overview total covers all three reported financial years.
  return sumComplete(
    university.sponsoredResearch.map((row) => row.amountInr ?? null),
  );
}

export function totalConsultancyAmount(university: UniversityData): Numeric {
  // The consultancy total covers all three reported financial years.
  return sumComplete(university.consultancy.map((row) => row.amountInr ?? null));
}

export function totalEdpEarnings(university: UniversityData): Numeric {
  // The executive-development earnings total covers all three reported years.
  return sumComplete(
    university.executiveDevelopment.map((row) => row.earningsInr ?? null),
  );
}

export function totalPatentsGranted(university: UniversityData): Numeric {
  // Patents granted is summed over the three reported calendar years.
  return sumComplete(university.ipR.map((row) => row.granted));
}

export function placementRate(
  placed: Numeric,
  graduated: Numeric,
): Numeric {
  // Placement rate uses placed students divided by graduates in minimum stipulated time.
  if (!isNumber(placed) || !isNumber(graduated) || graduated === 0) {
    return null;
  }
  return (placed / graduated) * 100;
}

export function sociallyChallengedPercent(
  rows: StudentStrength[],
): Numeric {
  // Share socially challenged students (SC+ST+OBC) from the total reported strength.
  const total = sumComplete(rows.map((row) => row.total));
  const challenged = sumComplete(rows.map((row) => row.sociallyChallenged));
  if (!isNumber(total) || total === 0 || !isNumber(challenged)) {
    return null;
  }
  return (challenged / total) * 100;
}

export function overallPlacementRate(university: UniversityData): Numeric {
  const placed = sumComplete(university.placements.map((row) => row.placed));
  const graduated = sumComplete(
    university.placements.map((row) => row.graduatedMinimumTime),
  );
  return placementRate(placed, graduated);
}

export function availableYears(universities: UniversityData[]): string[] {
  const years = new Set<string>();
  for (const university of universities) {
    university.placements.forEach((row) => {
      if (row.graduationAcademicYear) years.add(row.graduationAcademicYear);
    });
  }
  return Array.from(years).sort().reverse();
}

export function availableProgramTypes(universities: UniversityData[]): string[] {
  const programs = new Set<string>();
  for (const university of universities) {
    university.placements.forEach((row) => {
      if (row.programType) programs.add(row.programType);
    });
  }
  return Array.from(programs).sort();
}

export function studentGenderRows(universities: UniversityData[]) {
  return universities.flatMap((university) =>
    university.studentStrength.map((row) => ({
      label: `${university.institute.shortName} · ${row.programType}`,
      university: university.institute.shortName,
      programType: row.programType,
      male: row.male,
      female: row.female,
    })),
  );
}

export function studentRegionRows(universities: UniversityData[]) {
  return universities.flatMap((university) =>
    university.studentStrength.map((row) => ({
      label: `${university.institute.shortName} · ${row.programType}`,
      university: university.institute.shortName,
      programType: row.programType,
      withinState: row.withinState,
      outsideState: row.outsideState,
      outsideCountry: row.outsideCountry,
    })),
  );
}

export function sociallyChallengedRows(universities: UniversityData[]) {
  return universities.map((university) => ({
    university: university.institute.shortName,
    percent: sociallyChallengedPercent(university.studentStrength),
  }));
}

function groupByYear<T extends { graduationAcademicYear: string | null }>(
  rows: T[],
  selectedYear: string,
): Map<string, T[]> {
  const byYear = new Map<string, T[]>();
  for (const row of rows) {
    const year = row.graduationAcademicYear;
    if (!year || (selectedYear !== "All years" && year !== selectedYear)) {
      continue;
    }
    byYear.set(year, [...(byYear.get(year) ?? []), row]);
  }
  return byYear;
}

export function placementRateRows(
  universities: UniversityData[],
  selectedYear: string,
) {
  const yearSet = new Set<string>();
  const grouped = universities.map((university) => {
    const byYear = groupByYear(university.placements, selectedYear);
    byYear.forEach((_rows, year) => yearSet.add(year));
    return { university, byYear };
  });
  return Array.from(yearSet)
    .sort()
    .map((year) => {
      const row: Record<string, string | number | null> = { year };
      for (const { university, byYear } of grouped) {
        const values = byYear.get(year) ?? [];
        const placed = sumComplete(values.map((item) => item.placed));
        const graduated = sumComplete(
          values.map((item) => item.graduatedMinimumTime),
        );
        row[university.institute.shortName] = placementRate(placed, graduated);
      }
      return row;
    });
}

export function salaryTrendRows(
  universities: UniversityData[],
  programType: string,
  selectedYear: string,
) {
  const years = new Set<string>();
  const byUniversity = universities.map((university) => {
    const rows = university.placements.filter(
      (row) =>
        row.programType === programType &&
        row.graduationAcademicYear &&
        (selectedYear === "All years" ||
          row.graduationAcademicYear === selectedYear),
    );
    rows.forEach((row) => {
      if (row.graduationAcademicYear) years.add(row.graduationAcademicYear);
    });
    return { university, rows };
  });
  return Array.from(years)
    .sort()
    .map((year) => {
      const result: Record<string, string | number | null> = { year };
      for (const { university, rows } of byUniversity) {
        const matching = rows.filter((row) => row.graduationAcademicYear === year);
        result[university.institute.shortName] =
          matching.length === 1 ? matching[0].medianSalaryInr : null;
      }
      return result;
    });
}

export function higherStudiesRows(
  universities: UniversityData[],
  programType: string,
  selectedYear: string,
) {
  return universities.map((university) => {
    const rows = university.placements.filter(
      (row) =>
        row.programType === programType &&
        (selectedYear === "All years" ||
          row.graduationAcademicYear === selectedYear),
    );
    return {
      university: university.institute.shortName,
      higherStudies: sumComplete(rows.map((row) => row.higherStudies)),
    };
  });
}

export function placementTableRows(
  universities: UniversityData[],
  programType: string,
  selectedYear: string,
) {
  return universities.flatMap((university) =>
    university.placements
      .filter(
        (row) =>
          row.programType === programType &&
          (selectedYear === "All years" ||
            row.graduationAcademicYear === selectedYear),
      )
      .map((row) => ({
        university: university.institute.shortName,
        ...row,
      })),
  );
}

function annualSeries(
  universities: UniversityData[],
  property: "sponsoredResearch" | "consultancy" | "executiveDevelopment",
  field: keyof AnnualMetric,
  selectedYear: string,
  unit: CurrencyMode,
) {
  const yearSet = new Set<string>();
  const values = universities.map((university) => {
    const rows = university[property].filter(
      (row) =>
        selectedYear === "All years" || row.financialYear === selectedYear,
    );
    rows.forEach((row) => yearSet.add(row.financialYear));
    return { university, rows };
  });
  return Array.from(yearSet)
    .sort()
    .map((year) => {
      const result: Record<string, string | number | null> = { year };
      for (const { university, rows } of values) {
        const value = rows.find((row) => row.financialYear === year)?.[field];
        result[university.institute.shortName] =
          isNumber(value as Numeric)
            ? unit === "crore"
              ? (value as number) / CRORE
              : (value as number)
            : null;
      }
      return result;
    });
}

export function sponsoredResearchRows(
  universities: UniversityData[],
  selectedYear: string,
  unit: CurrencyMode,
) {
  return annualSeries(
    universities,
    "sponsoredResearch",
    "amountInr",
    selectedYear,
    unit,
  );
}

export function consultancyRows(
  universities: UniversityData[],
  selectedYear: string,
  unit: CurrencyMode,
) {
  return annualSeries(
    universities,
    "consultancy",
    "amountInr",
    selectedYear,
    unit,
  );
}

export function edpEarningsRows(
  universities: UniversityData[],
  selectedYear: string,
  unit: CurrencyMode,
) {
  return annualSeries(
    universities,
    "executiveDevelopment",
    "earningsInr",
    selectedYear,
    unit,
  );
}

export function patentRows(
  universities: UniversityData[],
  selectedYear: string,
) {
  const years = new Set<string>();
  const records = universities.map((university) => {
    const rows = university.ipR.filter(
      (row) =>
        selectedYear === "All years" ||
        row.calendarYear === selectedYear.slice(0, 4),
    );
    rows.forEach((row) => years.add(row.calendarYear));
    return { university, rows };
  });
  return Array.from(years)
    .sort()
    .map((year) => {
      const result: Record<string, string | number | null> = { year };
      for (const { university, rows } of records) {
        result[university.institute.shortName] =
          rows.find((row) => row.calendarYear === year)?.granted ?? null;
      }
      return result;
    });
}

export function patentSeriesRows(
  universities: UniversityData[],
  selectedYear: string,
) {
  const years = new Set<string>();
  const records = universities.map((university) => {
    const rows = university.ipR.filter(
      (row) =>
        selectedYear === "All years" ||
        row.calendarYear === selectedYear.slice(0, 4),
    );
    rows.forEach((row) => years.add(row.calendarYear));
    return { university, rows };
  });
  return Array.from(years)
    .sort()
    .map((year) => {
      const result: Record<string, string | number | null> = { year };
      for (const { university, rows } of records) {
        const source = rows.find((row) => row.calendarYear === year);
        result[`${university.institute.shortName} · granted`] =
          source?.granted ?? null;
        result[`${university.institute.shortName} · published`] =
          source?.published ?? null;
      }
      return result;
    });
}

function sumObjectValues(
  values: Record<string, Numeric>,
): Numeric {
  return sumComplete(Object.values(values));
}

export function financeRows(
  universities: UniversityData[],
  selectedYear: string,
  unit: CurrencyMode,
) {
  const years = new Set<string>();
  const records = universities.map((university) => {
    const rows = university.finance.years.filter(
      (row) =>
        selectedYear === "All years" || row.academicYear === selectedYear,
    );
    rows.forEach((row) => years.add(row.academicYear));
    return { university, rows };
  });
  return Array.from(years)
    .sort()
    .map((year) => {
      const result: Record<string, string | number | null> = { year };
      for (const { university, rows } of records) {
        const source = rows.find((row) => row.academicYear === year);
        const capex = source ? sumObjectValues(source.capex) : null;
        const opex = source ? sumObjectValues(source.opex) : null;
        result[`${university.institute.shortName} capex`] =
          isNumber(capex) ? (unit === "crore" ? capex / CRORE : capex) : null;
        result[`${university.institute.shortName} opex`] =
          isNumber(opex) ? (unit === "crore" ? opex / CRORE : opex) : null;
      }
      return result;
    });
}

export function studentEnrollmentRows(universities: UniversityData[]) {
  return universities.map((university) => ({
    university: university.institute.shortName,
    students: totalStudents(university),
  }));
}

export function phdRows(universities: UniversityData[]) {
  return universities.map((university) => ({
    university: university.institute.shortName,
    students: phdStudentCount(university),
  }));
}

export function facultyDesignationRows(universities: UniversityData[]) {
  const groups = Array.from(
    new Set(
      universities.flatMap((university) =>
        university.faculty.rows.map((row) => row.designationGroup),
      ),
    ),
  ).sort();
  return groups.map((group) => {
    const row: Record<string, string | number | null> = {
      designation: group,
    };
    for (const university of universities) {
      const shortName = university.institute.shortName;
      row[shortName] =
        university.faculty.rows.length === 0
          ? null
          : university.faculty.rows.filter(
              (faculty) => faculty.designationGroup === group,
            ).length;
    }
    return row;
  });
}

export function facultyAssociationRows(universities: UniversityData[]) {
  const groups = ["Regular", "Adhoc-Contractual", "Other"];
  return groups.map((group) => {
    const row: Record<string, string | number | null> = { association: group };
    for (const university of universities) {
      const shortName = university.institute.shortName;
      if (university.faculty.rows.length === 0) {
        row[shortName] = null;
        continue;
      }
      row[shortName] = university.faculty.rows.filter((faculty) => {
        const association = (faculty.associationType ?? "").toLowerCase();
        if (group === "Regular") return association.includes("regular");
        if (group === "Adhoc-Contractual") {
          return association.includes("adhoc") || association.includes("contract");
        }
        return !association.includes("regular") &&
          !association.includes("adhoc") &&
          !association.includes("contract");
      }).length;
    }
    return row;
  });
}

export function facultyGenderRows(universities: UniversityData[]) {
  return universities.map((university) => ({
    university: university.institute.shortName,
    male:
      university.faculty.rows.length === 0
        ? null
        : university.faculty.rows.filter(
            (faculty) => faculty.gender?.toLowerCase() === "male",
          ).length,
    female:
      university.faculty.rows.length === 0
        ? null
        : university.faculty.rows.filter(
            (faculty) => faculty.gender?.toLowerCase() === "female",
          ).length,
  }));
}

export function facultyQualificationPercent(university: UniversityData): Numeric {
  const rows = university.faculty.rows;
  if (rows.length === 0) return null;
  // Ph.D. share uses extracted faculty rows as its denominator.
  return (
    (rows.filter((faculty) => faculty.qualificationGroup === "PhD").length /
      rows.length) *
    100
  );
}

export function facultyAverageExperience(university: UniversityData): Numeric {
  const reported = university.faculty.rows
    .map((faculty) => faculty.experienceMonths)
    .filter(isNumber);
  // Average experience is calculated only from rows that report months.
  if (reported.length === 0) return null;
  return reported.reduce((total, months) => total + months, 0) / reported.length;
}

export function facultyAverageAge(university: UniversityData): Numeric {
  const reported = university.faculty.rows
    .map((faculty) => faculty.age)
    .filter(isNumber);
  // Average age is calculated only from rows that report an age.
  if (reported.length === 0) return null;
  return reported.reduce((total, age) => total + age, 0) / reported.length;
}

export function facultyAgeDistribution(universities: UniversityData[]) {
  const buckets = [
    { ageBand: "Under 30", min: 0, max: 29 },
    { ageBand: "30–39", min: 30, max: 39 },
    { ageBand: "40–49", min: 40, max: 49 },
    { ageBand: "50–59", min: 50, max: 59 },
    { ageBand: "60+", min: 60, max: Number.POSITIVE_INFINITY },
  ];
  return buckets.map((bucket) => {
    const row: Record<string, string | number | null> = { ageBand: bucket.ageBand };
    for (const university of universities) {
      row[university.institute.shortName] =
        university.faculty.rows.length === 0
          ? null
          : university.faculty.rows.filter(
              (faculty) =>
                isNumber(faculty.age) &&
                faculty.age >= bucket.min &&
                faculty.age <= bucket.max,
            ).length;
    }
    return row;
  });
}

export function facultyTableRows(university: UniversityData) {
  return university.faculty.rows;
}

function financeTotal(row: FinanceYear): Numeric {
  const capex = sumObjectValues(row.capex);
  const opex = sumObjectValues(row.opex);
  return isNumber(capex) && isNumber(opex) ? capex + opex : null;
}

interface ComparisonMetric {
  key: string;
  label: string;
  values: Numeric[];
}

export function comparisonMetrics(universities: UniversityData[]) {
  const metrics: ComparisonMetric[] = [
    {
      key: "students",
      label: "Total students",
      values: universities.map(totalStudents),
    },
    {
      key: "faculty",
      label: "Faculty count",
      values: universities.map(facultyCount),
    },
    {
      key: "phd",
      label: "Ph.D. students",
      values: universities.map(phdStudentCount),
    },
    {
      key: "placement",
      label: "Placement rate",
      values: universities.map(overallPlacementRate),
    },
    {
      key: "research",
      label: "Sponsored research (INR)",
      values: universities.map(totalSponsoredResearch),
    },
    {
      key: "patents",
      label: "Patents granted",
      values: universities.map(totalPatentsGranted),
    },
    {
      key: "finance",
      label: "Capex + opex",
      values: universities.map((university) =>
        sumComplete(university.finance.years.map(financeTotal)),
      ),
    },
    {
      key: "naac",
      label: "NAAC CGPA",
      values: universities.map((university) => university.naac.cgpa),
    },
  ];
  const radar = metrics.map((metric) => {
    const known = metric.values.filter(isNumber);
    const maximum = known.length > 0 ? Math.max(...known) : 0;
    const row: Record<string, string | number | null> = { metric: metric.label };
    metric.values.forEach((value, index) => {
      const shortName = universities[index].institute.shortName;
      // Radar values are relative to the selected-university maximum; null inputs remain missing.
      row[shortName] =
        isNumber(value) && maximum > 0 ? (value / maximum) * 100 : null;
    });
    return row;
  });
  return { metrics, radar };
}

const FIXED_COLOR_ORDER = ["BAMU", "COEP", "KBCNMU", "MU", "RTMNU", "SGBAU", "SPPU"];

export function getColor(_universities: UniversityData[], shortName: string): string {
  const index = FIXED_COLOR_ORDER.indexOf(shortName);
  const stableIndex =
    index >= 0
      ? index
      : Array.from(shortName).reduce((total, character) => total + character.charCodeAt(0), 0);
  return UNIVERSITY_COLORS[stableIndex % UNIVERSITY_COLORS.length];
}

export function currencyValue(value: Numeric, unit: CurrencyMode): Numeric {
  if (!isNumber(value)) return null;
  return unit === "crore" ? value / CRORE : value;
}

export function formatNumber(value: Numeric, maximumFractionDigits = 0): string {
  if (!isNumber(value)) return "Not reported";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: Numeric, maximumFractionDigits = 1): string {
  return isNumber(value)
    ? `${formatNumber(value, maximumFractionDigits)}%`
    : "Not reported";
}

