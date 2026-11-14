import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  consultancyRows,
  formatCurrency,
  formatNumber,
  getColor,
  patentSeriesRows,
  totalPatentsGranted,
  totalSponsoredResearch,
  totalConsultancyAmount,
  totalEdpEarnings,
  sponsoredResearchRows,
  edpEarningsRows,
  financeRows,
} from "../utils/metrics";

interface ResearchFinanceProps {
  universities: UniversityData[];
  selectedYear: string;
}

type CurrencyUnit = "INR" | "Crore";

export function ResearchFinance({
  universities,
  selectedYear,
}: ResearchFinanceProps) {
  const [unit, setUnit] = useState<CurrencyUnit>("Crore");
  const sponsored = sponsoredResearchRows(universities, selectedYear, unit);
  const consultancy = consultancyRows(universities, selectedYear, unit);
  const edp = edpEarningsRows(universities, selectedYear, unit);
  const patents = patentSeriesRows(universities, selectedYear);
  const finance = financeRows(universities, selectedYear, unit);
  const unitButton = (
    <div className="button-group" aria-label="Currency display unit">
      {(["Crore", "INR"] as const).map((value) => (
        <button
          className={`button ${unit === value ? "button-primary" : "button-muted"}`}
          key={value}
          type="button"
          onClick={() => setUnit(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
  const researchSummary = universities.map((university) => ({
    university: university.institute.shortName,
    research: formatCurrency(totalSponsoredResearch(university), unit),
    consultancy: formatCurrency(totalConsultancyAmount(university), unit),
    edp: formatCurrency(totalEdpEarnings(university), unit),
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
        actions={unitButton}
      />
      <div className="metric-grid">
        {researchSummary.map((row) => {
          const university = universities.find(
            (item) => item.institute.shortName === row.university,
          );
          return (
            <section className="university-summary-card" key={row.university}>
              <strong>{row.university}</strong>
              <MetricCard label="Sponsored research · 3 yrs" value={row.research} />
              <MetricCard label="Consultancy · 3 yrs" value={row.consultancy} />
              <MetricCard label="EDP earnings · 3 yrs" value={row.edp} />
              <MetricCard label="Patents granted · 3 yrs" value={row.patents} />
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
          description={`Reported total received · ${unit}`}
          fileName="sponsored-research"
          data={sponsored}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sponsored} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => unit === "Crore" ? `${value} Cr` : `₹${Number(value).toLocaleString("en-IN")}`} />
              <Tooltip formatter={(value) => amountLabel(value, unit)} />
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
          title="Consultancy amount"
          description={`Reported total received · ${unit}`}
          fileName="consultancy-amount"
          data={consultancy}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={consultancy} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => unit === "Crore" ? `${value} Cr` : `₹${Number(value).toLocaleString("en-IN")}`} />
              <Tooltip formatter={(value) => amountLabel(value, unit)} />
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
          title="Executive development earnings"
          description={`Reported annual earnings · ${unit}`}
          fileName="edp-earnings"
          data={edp}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={edp} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => unit === "Crore" ? `${value} Cr` : `₹${Number(value).toLocaleString("en-IN")}`} />
              <Tooltip formatter={(value) => amountLabel(value, unit)} />
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
          title="Patents published and granted"
          description="Calendar-year counts; SPPU patent rows were not present in the supplied PDF."
          fileName="patents"
          data={patents}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={patents} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : null)} />
              <Legend />
              {universities.flatMap((university) => {
                const shortName = university.institute.shortName;
                return (
                  [
                    <Line
                      key={`${shortName}-granted`}
                      type="monotone"
                      dataKey={`${shortName} · granted`}
                      name={`${shortName} · granted`}
                      stroke={getColor(universities, shortName)}
                      strokeWidth={2}
                    />,
                    <Line
                      key={`${shortName}-published`}
                      type="monotone"
                      dataKey={`${shortName} · published`}
                      name={`${shortName} · published`}
                      stroke={getColor(universities, shortName)}
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                    />,
                  ]
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Capex vs opex"
          description={`Total by category · ${unit}`}
          fileName="capex-opex"
          data={finance}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={finance} margin={{ top: 16, right: 24, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => unit === "Crore" ? `${value} Cr` : `₹${Number(value).toLocaleString("en-IN")}`} />
              <Tooltip formatter={(value) => amountLabel(value, unit)} />
              <Legend />
              {universities.flatMap((university) => {
                const shortName = university.institute.shortName;
                return (
                  [
                    <Bar
                      key={`${shortName}-capex`}
                      dataKey={`${shortName} capex`}
                      name={`${shortName} capex`}
                      fill={getColor(universities, shortName)}
                    />,
                    <Bar
                      key={`${shortName}-opex`}
                      dataKey={`${shortName} opex`}
                      name={`${shortName} opex`}
                      fill={getColor(universities, shortName)}
                      fillOpacity={0.52}
                    />,
                  ]
                );
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

function amountLabel(value: unknown, unit: CurrencyUnit): string {
  if (typeof value !== "number") return "Not reported";
  return unit === "Crore"
    ? `₹${formatNumber(value, 2)} Cr`
    : formatCurrency(value, unit);
}
