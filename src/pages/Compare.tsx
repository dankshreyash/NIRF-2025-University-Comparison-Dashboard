import { useMemo, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import { UniversityLogo } from "../components/UniversityLogo";
import type { UniversityData } from "../types";
import { formatINR, type CurrencyMode } from "../utils/format";
import {
  comparisonMetrics,
  facultyCount,
  FIXED_UNIVERSITY_ORDER,
  formatNumber,
  formatPercent,
  getColor,
  overallPlacementRate,
  phdStudentCount,
  totalPatentsGranted,
  totalSponsoredResearch,
  totalStudents,
} from "../utils/metrics";

interface CompareProps {
  universities: UniversityData[];
  currencyMode: CurrencyMode;
}

export function Compare({ universities, currencyMode }: CompareProps) {
  const [picked, setPicked] = useState<string[]>(
    universities.slice(0, 4).map((university) => university.institute.shortName),
  );
  const comparison = useMemo(() => {
    const active = universities.filter((university) =>
      picked.includes(university.institute.shortName),
    );
    return { active, ...comparisonMetrics(active) };
  }, [picked, universities]);

  function toggle(shortName: string) {
    if (picked.includes(shortName)) {
      setPicked((current) => current.filter((value) => value !== shortName));
    } else if (picked.length < 4) {
      setPicked((current) => {
        const next = [...current, shortName];
        return next.sort(
          (a, b) =>
            (FIXED_UNIVERSITY_ORDER as readonly string[]).indexOf(a) -
            (FIXED_UNIVERSITY_ORDER as readonly string[]).indexOf(b),
        );
      });
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Compare"
        description="Select two to four universities for a side-by-side radar and metric table."
      />
      <section className="panel compare-picker">
        <div className="panel-heading">
          <div>
            <h2>Universities to compare</h2>
            <p>{picked.length} selected · select 2–4 for the radar view.</p>
          </div>
        </div>
        <div className="compare-options">
          {universities.map((university) => {
            const shortName = university.institute.shortName;
            const checked = picked.includes(shortName);
            return (
              <label className="compare-option" key={shortName}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && picked.length >= 4}
                  onChange={() => toggle(shortName)}
                />
                <UniversityLogo shortName={shortName} size="small" />
                <span className="color-dot" style={{ backgroundColor: getColor(universities, shortName) }} />
                <span>{university.institute.name}</span>
              </label>
            );
          })}
        </div>
      </section>
      {comparison.active.length < 2 ? (
        <div className="panel empty-state">Select at least two universities to build a comparison.</div>
      ) : (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Relative metric profile</h2>
                <p>Each metric is normalized to the highest selected value (100). Missing values remain blank.</p>
              </div>
            </div>
            <div className="compare-radar">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={comparison.radar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Tooltip formatter={(value) => typeof value === "number" ? `${value.toFixed(1)}% of selected maximum` : "Not reported"} />
                  <Legend />
                  {comparison.active.map((university) => {
                    const shortName = university.institute.shortName;
                    return (
                      <Radar
                        key={shortName}
                        name={shortName}
                        dataKey={shortName}
                        stroke={getColor(universities, shortName)}
                        fill={getColor(universities, shortName)}
                        fillOpacity={0.12}
                      />
                    );
                  })}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Metric table</h2>
                <p>Raw values; sponsored research is the sum of the three reported financial years.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {comparison.active.map((university) => (
                      <th key={university.institute.shortName}>
                        <UniversityLogo shortName={university.institute.shortName} size="small" />
                        {university.institute.shortName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.metrics.map((metric) => (
                    <tr key={metric.key}>
                      <td>{metric.label}</td>
                      {comparison.active.map((university) => {
                        const index = comparison.active.findIndex(
                          (item) => item.institute.shortName === university.institute.shortName,
                        );
                        const value = metric.values[index] ?? null;
                        return (
                          <td
                            key={university.institute.shortName}
                            title={
                              metric.key === "research" || metric.key === "finance"
                                ? formatINR(value, "full")
                                : undefined
                            }
                          >
                            {formatMetricValue(metric.key, value, currencyMode)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Raw comparison values</h2>
                <p>Selected metrics shown directly from the extracted records.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>University</th>
                    <th>Students</th>
                    <th>Faculty</th>
                    <th>Ph.D.</th>
                    <th>Placement rate</th>
                    <th>Research · 3 yrs</th>
                    <th>Patents granted</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.active.map((university) => (
                    <tr key={university.institute.shortName}>
                      <td>
                        <span className="table-university">
                          <UniversityLogo shortName={university.institute.shortName} size="small" />
                          {university.institute.name}
                        </span>
                      </td>
                      <td>{formatNumber(totalStudents(university))}</td>
                      <td>{formatNumber(facultyCount(university))}</td>
                      <td>{formatNumber(phdStudentCount(university))}</td>
                      <td>{formatPercent(overallPlacementRate(university))}</td>
                      <td title={formatINR(totalSponsoredResearch(university), "full")}>
                        {formatINR(totalSponsoredResearch(university), currencyMode)}
                      </td>
                      <td>{formatNumber(totalPatentsGranted(university))}</td>
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

function formatMetricValue(
  key: string,
  value: number | null,
  currencyMode: CurrencyMode,
): string {
  if (key === "placement") return formatPercent(value);
  if (key === "research" || key === "finance") {
    return formatINR(value, currencyMode);
  }
  return formatNumber(value, key === "naac" ? 2 : 0);
}
