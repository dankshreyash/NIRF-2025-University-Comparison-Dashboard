import { useMemo, useState } from "react";
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
  totalPatentsPublished,
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
  const [patentView, setPatentView] = useState<"byUniversity" | "byYear">("byUniversity");

  const patentsByUniversity = useMemo(() => {
    return universities.map((u) => {
      const shortName = u.institute.shortName;
      const pub = totalPatentsPublished(u);
      const gr = totalPatentsGranted(u);
      return {
        university: shortName,
        "Patents Published": pub,
        "Patents Granted": gr,
      };
    });
  }, [universities]);

  const researchSummary = universities.map((university) => ({
    university: university.institute.shortName,
    research: totalSponsoredResearch(university),
    consultancy: totalConsultancyAmount(university),
    edp: totalEdpEarnings(university),
    patentsGranted: totalPatentsGranted(university),
    patentsPublished: totalPatentsPublished(university),
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
                labelTitle="Total patents published and granted · 3 yrs"
                value={
                  row.patentsPublished != null || row.patentsGranted != null
                    ? `${row.patentsPublished ?? 0} pub · ${row.patentsGranted ?? 0} gr`
                    : "Not reported"
                }
                valueTitle={`3-Year Totals: ${row.patentsPublished ?? "Not reported"} Published | ${row.patentsGranted ?? "Not reported"} Granted`}
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
          description="Calendar-year counts and 3-year totals; SPPU patent rows were not present in the supplied PDF."
          fileName="patents"
          data={patentView === "byUniversity" ? patentsByUniversity : patents}
          className="chart-panel-full chart-panel-tall"
          actions={
            <div className="button-group">
              <button
                type="button"
                className={`button button-muted ${patentView === "byUniversity" ? "button-active" : ""}`}
                onClick={() => setPatentView("byUniversity")}
              >
                By University (Total)
              </button>
              <button
                type="button"
                className={`button button-muted ${patentView === "byYear" ? "button-active" : ""}`}
                onClick={() => setPatentView("byYear")}
              >
                By Calendar Year
              </button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {patentView === "byUniversity" ? (
              <BarChart data={patentsByUniversity} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="university" />
                <YAxis />
                <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : null)} />
                <Legend />
                <Bar
                  dataKey="Patents Published"
                  name="Patents Published"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Patents Granted"
                  name="Patents Granted"
                  fill="#db5a22"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
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
            )}
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Dedicated Patents Breakdown Table */}
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Patents published and granted breakdown</h2>
            <p>Annual breakdown and 3-year cumulative patent counts for all universities.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>University</th>
                <th className="text-right">2021 Pub.</th>
                <th className="text-right">2021 Gr.</th>
                <th className="text-right">2022 Pub.</th>
                <th className="text-right">2022 Gr.</th>
                <th className="text-right">2023 Pub.</th>
                <th className="text-right">2023 Gr.</th>
                <th className="text-right">Total Published</th>
                <th className="text-right">Total Granted</th>
              </tr>
            </thead>
            <tbody>
              {universities.map((u) => {
                const shortName = u.institute.shortName;
                const row2021 = u.ipR.find((r) => r.calendarYear === "2021");
                const row2022 = u.ipR.find((r) => r.calendarYear === "2022");
                const row2023 = u.ipR.find((r) => r.calendarYear === "2023");
                const totPub = totalPatentsPublished(u);
                const totGr = totalPatentsGranted(u);

                return (
                  <tr key={shortName}>
                    <td>
                      <div className="table-university">
                        <span className="color-dot" style={{ backgroundColor: getColor(universities, shortName) }} />
                        <span className="table-uni-info">
                          <strong>{shortName}</strong>
                          <span className="table-uni-full">{u.institute.name}</span>
                        </span>
                      </div>
                    </td>
                    <td className="text-right">{formatNumber(row2021?.published ?? null)}</td>
                    <td className="text-right">{formatNumber(row2021?.granted ?? null)}</td>
                    <td className="text-right">{formatNumber(row2022?.published ?? null)}</td>
                    <td className="text-right">{formatNumber(row2022?.granted ?? null)}</td>
                    <td className="text-right">{formatNumber(row2023?.published ?? null)}</td>
                    <td className="text-right">{formatNumber(row2023?.granted ?? null)}</td>
                    <td className="text-right">
                      {totPub != null ? <strong>{formatNumber(totPub)}</strong> : <span className="metric-not-reported">Not reported</span>}
                    </td>
                    <td className="text-right">
                      {totGr != null ? <strong>{formatNumber(totGr)}</strong> : <span className="metric-not-reported">Not reported</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
