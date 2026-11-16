import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { CRORE, formatINR, type CurrencyMode } from "../utils/format";
import {
  consultancyRows,
  formatNumber,
  getColor,
  patentSeriesRows,
  totalPatentsGranted,
  totalSponsoredResearch,
  totalConsultancyAmount,
  totalEdpEarnings,
  sponsoredResearchRows,
  edpEarningsRows,
} from "../utils/metrics";

interface ResearchFinanceProps {
  universities: UniversityData[];
  selectedYear: string;
  currencyMode: CurrencyMode;
}

export function ResearchFinance({
  universities,
  selectedYear,
  currencyMode,
}: ResearchFinanceProps) {
  const sponsored = sponsoredResearchRows(universities, selectedYear, currencyMode);
  const consultancy = consultancyRows(universities, selectedYear, currencyMode);
  const edp = edpEarningsRows(universities, selectedYear, currencyMode);
  const patents = patentSeriesRows(universities, selectedYear);
  const researchSummary = universities.map((university) => ({
    university: university.institute.shortName,
    research: totalSponsoredResearch(university),
    consultancy: totalConsultancyAmount(university),
    edp: totalEdpEarnings(university),
    patents: formatNumber(totalPatentsGranted(university)),
  }));
  const activityRows = universities.flatMap((university) => {
    const years = new Set([
      ...university.sponsoredResearch.map((row) => row.financialYear),
      ...university.consultancy.map((row) => row.financialYear),
      ...university.executiveDevelopment.map((row) => row.financialYear),
    ]);
    return Array.from(years).map((year) => {
      const research = university.sponsoredResearch.find(
        (row) => row.financialYear === year,
      );
      const consulting = university.consultancy.find(
        (row) => row.financialYear === year,
      );
      const development = university.executiveDevelopment.find(
        (row) => row.financialYear === year,
      );
      return {
        university: university.institute.shortName,
        year,
        sponsoredProjects: research?.projects ?? null,
        fundingAgencies: research?.fundingAgencies ?? null,
        consultancyProjects: consulting?.projects ?? null,
        consultancyClients: consulting?.clients ?? null,
        edpPrograms: development?.programs ?? null,
        edpParticipants: development?.participants ?? null,
      };
    });
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Research & Finance"
        description="Three-year research, consultancy, executive education, patent, capital, and operating expenditure trends."
      />
      <div className="metric-grid">
        {researchSummary.map((row) => {
          const university = universities.find(
            (item) => item.institute.shortName === row.university,
          );
          return (
            <section className="university-summary-card" key={row.university}>
              <strong>{row.university}</strong>
              <MetricCard
                label="Research (3 yrs)"
                labelTitle="Sponsored research · 3 yrs"
                value={formatINR(row.research, currencyMode)}
                valueTitle={formatINR(row.research, "full")}
              />
              <MetricCard
                label="Consultancy · 3 yrs"
                value={formatINR(row.consultancy, currencyMode)}
                valueTitle={formatINR(row.consultancy, "full")}
              />
              <MetricCard
                label="EDP earnings · 3 yrs"
                value={formatINR(row.edp, currencyMode)}
                valueTitle={formatINR(row.edp, "full")}
              />
              <MetricCard
                label="Patents (3 yrs)"
                labelTitle="Patents granted · 3 yrs"
                value={row.patents}
              />
              {university && (
                <span className="summary-color" style={{ backgroundColor: getColor(universities, row.university) }} />
              )}
            </section>
          );
        })}
      </div>
      <div className="chart-grid">
        <ChartPanel
          title="Sponsored research amount"
          description={`Reported total received · ${currencyMode === "crore" ? "Crore" : "Full INR"}`}
          fileName="sponsored-research"
          data={sponsored}
          className="chart-panel-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sponsored} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => formatINR(chartAmount(value, currencyMode), currencyMode)} />
              <Tooltip formatter={(value) => amountTooltip(value, currencyMode)} />
              <Legend />
              {universities.map((university) => {
                const shortName = university.institute.shortName;
                return (
                  <Bar
                    key={shortName}
                    dataKey={shortName}
                    name={shortName}
                    fill={getColor(universities, shortName)}
                    radius={[3, 3, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Consultancy amount"
          description={`Reported total received · ${currencyMode === "crore" ? "Crore" : "Full INR"}`}
          fileName="consultancy-amount"
          data={consultancy}
          className="chart-panel-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consultancy} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => formatINR(chartAmount(value, currencyMode), currencyMode)} />
              <Tooltip formatter={(value) => amountTooltip(value, currencyMode)} />
              <Legend />
              {universities.map((university) => {
                const shortName = university.institute.shortName;
                return (
                  <Bar
                    key={shortName}
                    dataKey={shortName}
                    name={shortName}
                    fill={getColor(universities, shortName)}
                    radius={[3, 3, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Executive development earnings"
          description={`Reported annual earnings · ${currencyMode === "crore" ? "Crore" : "Full INR"}`}
          fileName="edp-earnings"
          data={edp}
          className="chart-panel-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={edp} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => formatINR(chartAmount(value, currencyMode), currencyMode)} />
              <Tooltip formatter={(value) => amountTooltip(value, currencyMode)} />
              <Legend />
              {universities.map((university) => {
                const shortName = university.institute.shortName;
                return (
                  <Bar
                    key={shortName}
                    dataKey={shortName}
                    name={shortName}
                    fill={getColor(universities, shortName)}
                    radius={[3, 3, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Patents published and granted"
          description="Calendar-year counts; SPPU patent rows were not present in the supplied PDF."
          fileName="patents"
          data={patents}
          className="chart-panel-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={patents} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : null)} />
              <Legend />
              {universities.flatMap((university) => {
                const shortName = university.institute.shortName;
                return [
                  <Bar
                    key={`${shortName}-granted`}
                    dataKey={`${shortName} · granted`}
                    name={`${shortName} · granted`}
                    fill={getColor(universities, shortName)}
                    radius={[3, 3, 0, 0]}
                  />,
                  <Bar
                    key={`${shortName}-published`}
                    dataKey={`${shortName} · published`}
                    name={`${shortName} · published`}
                    fill={getColor(universities, shortName)}
                    fillOpacity={0.45}
                    radius={[3, 3, 0, 0]}
                  />,
                ];
              })}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Reported project and participant counts</h2>
            <p>These are source counts, not derived metrics.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>University</th>
                <th>Financial year</th>
                <th>Sponsored projects</th>
                <th>Funding agencies</th>
                <th>Consultancy projects</th>
                <th>Consultancy clients</th>
                <th>EDP programs</th>
                <th>EDP participants</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((row, index) => (
                <tr key={`${row.university}-${row.year}-${index}`}>
                  <td>{row.university}</td>
                  <td>{row.year}</td>
                  <td>{formatNumber(row.sponsoredProjects)}</td>
                  <td>{formatNumber(row.fundingAgencies)}</td>
                  <td>{formatNumber(row.consultancyProjects)}</td>
                  <td>{formatNumber(row.consultancyClients)}</td>
                  <td>{formatNumber(row.edpPrograms)}</td>
                  <td>{formatNumber(row.edpParticipants)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function chartAmount(value: unknown, mode: CurrencyMode): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return mode === "crore" ? value * CRORE : value;
}

function amountTooltip(value: unknown, mode: CurrencyMode) {
  const amount = chartAmount(value, mode);
  return (
    <span title={formatINR(amount, "full")}>
      {formatINR(amount, mode)}
    </span>
  );
}
