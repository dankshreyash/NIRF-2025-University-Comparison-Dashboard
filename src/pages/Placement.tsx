import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPanel } from "../components/ChartPanel";
import { PageHeader } from "../components/PageHeader";
import type { UniversityData } from "../types";
import {
  availableProgramTypes,
  formatCurrency,
  formatNumber,
  formatPercent,
  getColor,
  higherStudiesRows,
  placementRateRows,
  placementTableRows,
  salaryTrendRows,
} from "../utils/metrics";

interface PlacementProps {
  universities: UniversityData[];
  selectedYear: string;
}

export function Placement({ universities, selectedYear }: PlacementProps) {
  const programs = availableProgramTypes(universities);
  const [programType, setProgramType] = useState(programs[0] ?? "");
  const selectedProgram = programs.includes(programType)
    ? programType
    : programs[0] ?? "";
  const rates = placementRateRows(universities, selectedYear);
  const salaries = salaryTrendRows(universities, selectedProgram, selectedYear);
  const higherStudies = higherStudiesRows(
    universities,
    selectedProgram,
    selectedYear,
  );
  const rows = useMemo(
    () => placementTableRows(universities, selectedProgram, selectedYear),
    [selectedProgram, selectedYear, universities],
  );

  const actions = (
    <label className="select-field">
      Program type
      <select value={selectedProgram} onChange={(event) => setProgramType(event.target.value)}>
        {programs.map((program) => (
          <option value={program} key={program}>
            {program}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Placement"
        description="Placement rate uses placed students divided by graduates in minimum stipulated time. Salary points are the reported median for the selected program type."
        actions={actions}
      />
      {universities.length === 0 ? (
        <div className="panel empty-state">Select at least one university to compare.</div>
      ) : (
        <>
          <div className="chart-grid">
            <ChartPanel
              title="Placement rate trend"
              description="Placed / graduated in minimum stipulated time, aggregated across program types."
              fileName="placement-rate-trend"
              data={rates}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rates} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis unit="%" />
                  <Tooltip formatter={(value) => formatPercent(typeof value === "number" ? value : null)} />
                  <Legend />
                  {universities.map((university) => {
                    const shortName = university.institute.shortName;
                    return (
                      <Line
                        key={shortName}
                        type="monotone"
                        dataKey={shortName}
                        name={shortName}
                        stroke={getColor(universities, shortName)}
                        strokeWidth={2}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel
              title="Median salary trend"
              description={`${selectedProgram || "No program selected"} · values are INR as submitted.`}
              fileName="placement-median-salary"
              data={salaries}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salaries} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                  <Tooltip formatter={(value) => formatCurrency(typeof value === "number" ? value : null)} />
                  <Legend />
                  {universities.map((university) => {
                    const shortName = university.institute.shortName;
                    return (
                      <Line
                        key={shortName}
                        type="monotone"
                        dataKey={shortName}
                        name={shortName}
                        stroke={getColor(universities, shortName)}
                        strokeWidth={2}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel
              title="Students pursuing higher studies"
              description={`${selectedProgram || "No program selected"} · summed over the selected year scope.`}
              fileName="placement-higher-studies"
              data={higherStudies}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={higherStudies} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="university" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : null)} />
                  <Legend />
                  <Bar dataKey="higherStudies" name="Higher studies" radius={[5, 5, 0, 0]}>
                    {higherStudies.map((row) => (
                      <Cell key={row.university} fill={getColor(universities, row.university)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Placement detail</h2>
                <p>Separate source rows include intake/admission and graduation years because the PDF reports both.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>University</th>
                    <th>Program</th>
                    <th>Intake year</th>
                    <th>Intake</th>
                    <th>Admitted</th>
                    <th>Graduation year</th>
                    <th>Graduated</th>
                    <th>Placed</th>
                    <th>Median salary</th>
                    <th>Higher studies</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.university}-${row.intakeAcademicYear}-${index}`}>
                      <td>{row.university}</td>
                      <td>{row.programType ?? "Not reported"}</td>
                      <td>{row.intakeAcademicYear}</td>
                      <td>{formatNumber(row.intake)}</td>
                      <td>{formatNumber(row.admitted)}</td>
                      <td>{row.graduationAcademicYear ?? "Not reported"}</td>
                      <td>{formatNumber(row.graduatedMinimumTime)}</td>
                      <td>{formatNumber(row.placed)}</td>
                      <td>{formatCurrency(row.medianSalaryInr)}</td>
                      <td>{formatNumber(row.higherStudies)}</td>
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
