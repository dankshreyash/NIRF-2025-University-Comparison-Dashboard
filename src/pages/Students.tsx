import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPanel } from "../components/ChartPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import type { UniversityData } from "../types";
import {
  formatNumber,
  formatPercent,
  getColor,
  sociallyChallengedRows,
  studentGenderRows,
  studentRegionRows,
} from "../utils/metrics";

interface StudentsProps {
  universities: UniversityData[];
}

export function Students({ universities }: StudentsProps) {
  const gender = studentGenderRows(universities);
  const regions = studentRegionRows(universities);
  const challenge = sociallyChallengedRows(universities);
  const metricCards = universities.map((university) => {
    const row = challenge.find(
      (item) => item.university === university.institute.shortName,
    );
    return {
      university,
      percent: row?.percent ?? null,
    };
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Students"
        description="Current student strength by program type, gender, region, and reported social category."
      />
      <div className="metric-grid">
        {metricCards.map(({ university, percent }) => (
          <MetricCard
            key={university.institute.shortName}
            label={`${university.institute.shortName} · socially challenged`}
            value={formatPercent(percent)}
            hint="SC + ST + OBC / total student strength"
            color={getColor(universities, university.institute.shortName)}
          />
        ))}
      </div>
      <div className="chart-grid">
        <ChartPanel
          title="Gender split by program"
          description="Male and female headcounts from the reported program rows."
          fileName="students-gender-split"
          data={gender}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gender} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="label" width={230} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="male" name="Male" fill="#16283f" radius={[0, 4, 4, 0]} />
              <Bar dataKey="female" name="Female" fill="#db5a22" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Student origin by program"
          description="In-state, out-of-state, and international student counts."
          fileName="students-origin"
          data={regions}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regions} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="label" width={230} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="withinState" name="Within state" stackId="origin" fill="#16283f" />
              <Bar dataKey="outsideState" name="Outside state" stackId="origin" fill="#db5a22" />
              <Bar dataKey="outsideCountry" name="Outside country" stackId="origin" fill="#eca23c" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Socially challenged share"
          description="Reported SC + ST + OBC students as a share of reported total strength."
          fileName="students-socially-challenged"
          data={challenge}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={challenge} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="university" />
              <YAxis unit="%" />
              <Tooltip formatter={(value) => formatPercent(typeof value === "number" ? value : null)} />
              <Legend />
              <Bar dataKey="percent" name="Socially challenged" radius={[5, 5, 0, 0]}>
                {challenge.map((row) => (
                  <Cell key={row.university} fill={getColor(universities, row.university)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Reported totals by program type</h2>
              <p>Student strength rows remain separate to preserve source categories.</p>
            </div>
          </div>
          <div className="table-scroll compact-table">
            <table>
              <thead>
                <tr>
                  <th>University</th>
                  <th>Program</th>
                  <th>Male</th>
                  <th>Female</th>
                  <th>Total</th>
                  <th>Within state</th>
                  <th>Outside state</th>
                  <th>International</th>
                </tr>
              </thead>
              <tbody>
                {universities.flatMap((university) =>
                  university.studentStrength.map((row, index) => (
                    <tr key={`${university.institute.shortName}-${index}`}>
                      <td>{university.institute.shortName}</td>
                      <td>{row.programType}</td>
                      <td>{formatNumber(row.male)}</td>
                      <td>{formatNumber(row.female)}</td>
                      <td>{formatNumber(row.total)}</td>
                      <td>{formatNumber(row.withinState)}</td>
                      <td>{formatNumber(row.outsideState)}</td>
                      <td>{formatNumber(row.outsideCountry)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
