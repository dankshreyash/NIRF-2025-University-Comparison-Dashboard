import { useMemo, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import type { UniversityData } from "../types";
import {
  facultyCount,
  formatCurrency,
  formatNumber,
  getColor,
  phdStudentCount,
  totalPatentsGranted,
  totalSponsoredResearch,
  totalStudents,
} from "../utils/metrics";

type SortKey =
  | "students"
  | "faculty"
  | "phd"
  | "cgpa"
  | "research"
  | "patents";

interface OverviewProps {
  universities: UniversityData[];
}

export function Overview({ universities }: OverviewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("students");
  const [descending, setDescending] = useState(true);

  const rows = useMemo(
    () =>
      universities
        .map((university) => ({
          university,
          students: totalStudents(university),
          faculty: facultyCount(university),
          phd: phdStudentCount(university),
          cgpa: university.naac.cgpa,
          research: totalSponsoredResearch(university),
          patents: totalPatentsGranted(university),
        }))
        .sort((left, right) => {
          const a = left[sortKey];
          const b = right[sortKey];
          if (a == null && b == null) return 0;
          if (a == null) return 1;
          if (b == null) return -1;
          const difference = a - b;
          return descending ? -difference : difference;
        }),
    [descending, sortKey, universities],
  );

  function sortBy(key: SortKey) {
    if (sortKey === key) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(true);
    }
  }

  function sortLabel(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <button className="sort-button" type="button" onClick={() => sortBy(key)}>
        {label} {active ? (descending ? "↓" : "↑") : ""}
      </button>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Overview"
        description="A side-by-side snapshot of the submitted institute data."
      />
      {universities.length === 0 ? (
        <div className="panel empty-state">Select at least one university to compare.</div>
      ) : (
        <>
          <div className="university-kpis">
            {universities.map((university) => {
              const shortName = university.institute.shortName;
              return (
                <section className="university-kpi-card" key={shortName}>
                  <div className="university-kpi-title">
                    <span className="color-dot" style={{ backgroundColor: getColor(universities, shortName) }} />
                    <div>
                      <strong>{shortName}</strong>
                      <span>{university.institute.name}</span>
                    </div>
                  </div>
                  <div className="university-kpi-grid">
                    <MetricCard label="Students" value={formatNumber(totalStudents(university))} />
                    <MetricCard label="Faculty" value={formatNumber(facultyCount(university))} />
                    <MetricCard label="Ph.D. students" value={formatNumber(phdStudentCount(university))} />
                    <MetricCard label="NAAC CGPA" value={formatNumber(university.naac.cgpa, 2)} />
                    <MetricCard label="Sponsored research · 3 yrs" value={formatCurrency(totalSponsoredResearch(university))} />
                    <MetricCard label="Patents granted · 3 yrs" value={formatNumber(totalPatentsGranted(university))} />
                  </div>
                </section>
              );
            })}
          </div>

          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Comparison table</h2>
                <p>Click a heading to sort. The order is based on the selected metric, not an official NIRF rank.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>University</th>
                    <th>{sortLabel("Students", "students")}</th>
                    <th>{sortLabel("Faculty", "faculty")}</th>
                    <th>{sortLabel("Ph.D.", "phd")}</th>
                    <th>{sortLabel("NAAC CGPA", "cgpa")}</th>
                    <th>{sortLabel("Sponsored research · 3 yrs", "research")}</th>
                    <th>{sortLabel("Patents granted · 3 yrs", "patents")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.university.institute.shortName}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="table-university">
                          <span className="color-dot" style={{ backgroundColor: getColor(universities, row.university.institute.shortName) }} />
                          {row.university.institute.name}
                        </span>
                      </td>
                      <td>{formatNumber(row.students)}</td>
                      <td>{formatNumber(row.faculty)}</td>
                      <td>{formatNumber(row.phd)}</td>
                      <td>{formatNumber(row.cgpa, 2)}</td>
                      <td>{formatCurrency(row.research)}</td>
                      <td>{formatNumber(row.patents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
