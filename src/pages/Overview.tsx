import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { UniversityLogo } from "../components/UniversityLogo";
import type { UniversityData } from "../types";
import { formatCrore, formatINR, type CurrencyMode } from "../utils/format";
import {
  facultyCount,
  facultyStudentRatio,
  formatNumber,
  formatPercent,
  getColor,
  getNaacGrade,
  numericStudentFacultyRatio,
  phdSharePercent,
  phdStudentCount,
  totalPatentsGranted,
  totalSponsoredResearch,
  totalStudents,
} from "../utils/metrics";

type SortKey =
  | "order"
  | "students"
  | "faculty"
  | "phd"
  | "cgpa"
  | "research"
  | "patents";

interface OverviewProps {
  universities: UniversityData[];
  currencyMode: CurrencyMode;
}

export function Overview({ universities, currencyMode: _currencyMode }: OverviewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>("order");
  const [descending, setDescending] = useState(false);

  // 1. Summary Strip Headline Stats
  const summaryStats = useMemo(() => {
    if (universities.length === 0) return null;

    // Total students across all
    const totalStudentsAll = universities.reduce(
      (sum, u) => sum + (totalStudents(u) ?? 0),
      0,
    );

    // Highest sponsored research
    let topResearchUni: UniversityData | null = null;
    let topResearchVal = -1;
    for (const u of universities) {
      const res = totalSponsoredResearch(u) ?? 0;
      if (res > topResearchVal) {
        topResearchVal = res;
        topResearchUni = u;
      }
    }

    // Top NAAC CGPA
    let topCgpaUni: UniversityData | null = null;
    let topCgpaVal = -1;
    for (const u of universities) {
      const cgpa = u.naac.cgpa ?? 0;
      if (cgpa > topCgpaVal) {
        topCgpaVal = cgpa;
        topCgpaUni = u;
      }
    }

    // Best student-to-faculty ratio (lowest positive ratio)
    let bestRatioUni: UniversityData | null = null;
    let bestRatioVal = Number.POSITIVE_INFINITY;
    for (const u of universities) {
      const ratio = numericStudentFacultyRatio(u);
      if (ratio != null && ratio > 0 && ratio < bestRatioVal) {
        bestRatioVal = ratio;
        bestRatioUni = u;
      }
    }

    return {
      totalStudentsAll,
      topResearch: {
        value: topResearchVal > 0 ? formatCrore(topResearchVal) : "Not reported",
        uni: topResearchUni ? `${topResearchUni.institute.shortName} · ${topResearchUni.institute.name}` : "",
      },
      topCgpa: {
        value: topCgpaVal > 0 ? topCgpaVal.toFixed(2) : "Not reported",
        uni: topCgpaUni ? `${topCgpaUni.institute.shortName} · ${topCgpaUni.institute.name}` : "",
      },
      bestRatio: {
        value: Number.isFinite(bestRatioVal) ? `${bestRatioVal.toFixed(1)}:1` : "Not reported",
        uni: bestRatioUni ? `${bestRatioUni.institute.shortName} · ${bestRatioUni.institute.name}` : "",
      },
    };
  }, [universities]);

  // 2. Key Takeaways Insights (8th card in grid)
  const takeaways = useMemo(() => {
    if (universities.length === 0) return [];

    const insights: Array<{ title: string; text: string; tag: string }> = [];

    // Insight A: Research funding per faculty
    let bestResFacultyUni: UniversityData | null = null;
    let bestResFacultyVal = -1;
    for (const u of universities) {
      const res = totalSponsoredResearch(u);
      const fac = facultyCount(u);
      if (res != null && fac != null && fac > 0) {
        const perFac = res / fac;
        if (perFac > bestResFacultyVal) {
          bestResFacultyVal = perFac;
          bestResFacultyUni = u;
        }
      }
    }
    if (bestResFacultyUni && bestResFacultyVal > 0) {
      const inLakhs = (bestResFacultyVal / 100_000).toFixed(1);
      insights.push({
        title: "Research Intensity Leader",
        text: `${bestResFacultyUni.institute.shortName} generates ₹${inLakhs} L in sponsored research per faculty member over 3 years.`,
        tag: "Research",
      });
    }

    // Insight B: Best Mentorship / Ratio
    let bestMentorshipUni: UniversityData | null = null;
    let minRatio = Number.POSITIVE_INFINITY;
    for (const u of universities) {
      const r = numericStudentFacultyRatio(u);
      if (r != null && r > 0 && r < minRatio) {
        minRatio = r;
        bestMentorshipUni = u;
      }
    }
    if (bestMentorshipUni && Number.isFinite(minRatio)) {
      insights.push({
        title: "Closest Mentorship",
        text: `${bestMentorshipUni.institute.shortName} maintains the best student-faculty ratio at ${minRatio.toFixed(1)}:1.`,
        tag: "Mentorship",
      });
    }

    // Insight C: Doctoral scholar share
    let topPhdUni: UniversityData | null = null;
    let maxPhdShare = -1;
    for (const u of universities) {
      const share = phdSharePercent(u);
      if (share != null && share > maxPhdShare) {
        maxPhdShare = share;
        topPhdUni = u;
      }
    }
    if (topPhdUni && maxPhdShare > 0) {
      insights.push({
        title: "Highest Ph.D. Density",
        text: `${topPhdUni.institute.shortName} leads doctoral enrollment with ${maxPhdShare.toFixed(1)}% of students pursuing Ph.D. degrees.`,
        tag: "Postgraduate",
      });
    }

    return insights;
  }, [universities]);

  // 3. Computed Rows & Column Extrema for Inline Bars and Top Badges
  const { rows, columnExtrema } = useMemo(() => {
    const list = universities.map((university, index) => {
      const students = totalStudents(university);
      const faculty = facultyCount(university);
      const phd = phdStudentCount(university);
      const cgpa = university.naac.cgpa;
      const research = totalSponsoredResearch(university);
      const patents = totalPatentsGranted(university);
      const ratio = facultyStudentRatio(university);
      const phdShare = phdSharePercent(university);

      return {
        university,
        order: index + 1,
        students,
        faculty,
        phd,
        cgpa,
        research,
        patents,
        ratio,
        phdShare,
      };
    });

    // Column max and min for data bars and top highlights
    const getExtrema = (fn: (item: (typeof list)[number]) => number | null) => {
      const valid = list
        .map(fn)
        .filter((val): val is number => typeof val === "number" && Number.isFinite(val));
      if (valid.length === 0) return { max: 0, min: 0 };
      return { max: Math.max(...valid), min: Math.min(...valid) };
    };

    const extrema = {
      students: getExtrema((i) => i.students),
      faculty: getExtrema((i) => i.faculty),
      phd: getExtrema((i) => i.phd),
      cgpa: getExtrema((i) => i.cgpa),
      research: getExtrema((i) => i.research),
      patents: getExtrema((i) => i.patents),
    };

    let sorted = list;
    if (!sortKey || sortKey === "order") {
      sorted = descending ? [...list].reverse() : list;
    } else {
      sorted = [...list].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        // Missing values always sort to the bottom
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        const diff = (valA as number) - (valB as number);
        return descending ? -diff : diff;
      });
    }

    return { rows: sorted, columnExtrema: extrema };
  }, [descending, sortKey, universities]);

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      setDescending((val) => !val);
    } else {
      setSortKey(key);
      setDescending(key === "order" ? false : true);
    }
  }

  function sortHeader(label: string, key: SortKey, alignRight = true) {
    const active = sortKey === key;
    return (
      <th className={alignRight ? "text-right" : ""}>
        <button
          className={`sort-button ${active ? "sort-button-active" : ""}`}
          type="button"
          onClick={() => sortBy(key)}
          aria-label={`Sort by ${label} (${active ? (descending ? "descending" : "ascending") : "inactive"})`}
        >
          <span>{label}</span>
          <span className="sort-arrow" aria-hidden="true">
            {active ? (descending ? " ↓" : " ↑") : " ↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Overview"
        description="Comprehensive analysis of submitted NIRF 2025 institute records, academic indicators, and key operational benchmarks."
      />

      {universities.length === 0 ? (
        <div className="panel empty-state">No university data found.</div>
      ) : (
        <>
          {/* 1. Summary Strip (Headline Stat Cards) */}
          {summaryStats && (
            <section className="summary-strip" aria-label="Key Performance Indicators across universities">
              <div className="summary-card">
                <div className="summary-card-icon summary-icon-students" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="summary-card-body">
                  <span className="summary-label">Total Enrolled Students</span>
                  <strong className="summary-value">{formatNumber(summaryStats.totalStudentsAll)}</strong>
                  <span className="summary-subtext">Across 7 state universities</span>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon summary-icon-research" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="summary-card-body">
                  <span className="summary-label">Highest Research Funding</span>
                  <strong className="summary-value">{summaryStats.topResearch.value}</strong>
                  <span className="summary-subtext" title={summaryStats.topResearch.uni}>
                    {summaryStats.topResearch.uni}
                  </span>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon summary-icon-cgpa" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                </div>
                <div className="summary-card-body">
                  <span className="summary-label">Top NAAC CGPA</span>
                  <strong className="summary-value">
                    {summaryStats.topCgpa.value} <span className="summary-unit">/ 4.0</span>
                  </strong>
                  <span className="summary-subtext" title={summaryStats.topCgpa.uni}>
                    {summaryStats.topCgpa.uni}
                  </span>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon summary-icon-ratio" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
                    <path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4" />
                    <circle cx="8" cy="12" r="2" />
                    <circle cx="20" cy="12" r="1" />
                  </svg>
                </div>
                <div className="summary-card-body">
                  <span className="summary-label">Best Student-Faculty Ratio</span>
                  <strong className="summary-value">{summaryStats.bestRatio.value}</strong>
                  <span className="summary-subtext" title={summaryStats.bestRatio.uni}>
                    {summaryStats.bestRatio.uni}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 2. University Cards Grid (7 Universities + 1 Key Takeaways Card) */}
          <section className="university-kpis" aria-label="University profile cards">
            {universities.map((university, index) => {
              const shortName = university.institute.shortName;
              const accentColor = getColor(universities, shortName);
              const students = totalStudents(university);
              const faculty = facultyCount(university);
              const phd = phdStudentCount(university);
              const cgpa = university.naac.cgpa;
              const research = totalSponsoredResearch(university);
              const patents = totalPatentsGranted(university);
              const ratio = facultyStudentRatio(university);
              const phdShare = phdSharePercent(university);
              const naacGradeVal = getNaacGrade(university);

              return (
                <article
                  className="university-kpi-card"
                  key={shortName}
                  style={
                    {
                      borderTopColor: accentColor,
                      animationDelay: `${index * 60}ms`,
                    } as React.CSSProperties
                  }
                >
                  {/* Card Title & Header */}
                  <div className="university-kpi-title">
                    <UniversityLogo shortName={shortName} />
                    <div className="university-name-box">
                      <div className="university-short-wrapper">
                        <strong>{shortName}</strong>
                        <span className="color-dot" style={{ backgroundColor: accentColor }} />
                      </div>
                      <span className="university-full-name" title={university.institute.name}>
                        {university.institute.name}
                      </span>
                    </div>
                  </div>

                  {/* Hero Metrics (Students & NAAC CGPA) */}
                  <div className="hero-metrics-row">
                    <div className="hero-metric-tile">
                      <span className="hero-metric-label">TOTAL STUDENTS</span>
                      <strong className="hero-metric-value">{formatNumber(students)}</strong>
                      <span className="hero-metric-subtext">Current enrollment</span>
                    </div>

                    <div className="hero-metric-tile hero-cgpa-tile">
                      <div className="hero-cgpa-top">
                        <span className="hero-metric-label">NAAC CGPA</span>
                        {naacGradeVal && <span className="hero-grade-badge">Grade {naacGradeVal}</span>}
                      </div>
                      <div className="hero-cgpa-content">
                        <CgpaProgressRing cgpa={cgpa} color={accentColor} />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Metrics Grid */}
                  <div className="secondary-metrics-grid">
                    <div className="sec-metric-tile">
                      <span className="sec-metric-label">Faculty</span>
                      <strong className="sec-metric-value">
                        {faculty != null ? formatNumber(faculty) : <span className="metric-not-reported">Not reported</span>}
                      </strong>
                    </div>

                    <div className="sec-metric-tile">
                      <span className="sec-metric-label">Ph.D. Scholars</span>
                      <strong className="sec-metric-value">
                        {phd != null ? formatNumber(phd) : <span className="metric-not-reported">Not reported</span>}
                      </strong>
                    </div>

                    <div className="sec-metric-tile">
                      <span className="sec-metric-label" title="Sponsored research · 3 yrs">
                        Research (3 yrs)
                      </span>
                      <strong className="sec-metric-value" title={formatINR(research, "full")}>
                        {research != null ? formatCrore(research) : <span className="metric-not-reported">Not reported</span>}
                      </strong>
                    </div>

                    <div className="sec-metric-tile">
                      <span className="sec-metric-label" title="Patents granted · 3 yrs">
                        Patents (3 yrs)
                      </span>
                      <strong className="sec-metric-value">
                        {patents != null ? formatNumber(patents) : <span className="metric-not-reported">Not reported</span>}
                      </strong>
                    </div>

                    <div className="sec-metric-tile">
                      <span className="sec-metric-label" title="Student-to-faculty ratio">
                        Student : Faculty
                      </span>
                      <strong className="sec-metric-value">
                        {ratio != null ? ratio : <span className="metric-not-reported">Not reported</span>}
                      </strong>
                    </div>

                    <div className="sec-metric-tile">
                      <span className="sec-metric-label" title="Doctoral share of enrolled students">
                        Ph.D. Share
                      </span>
                      <strong className="sec-metric-value">
                        {phdShare != null ? formatPercent(phdShare, 1) : <span className="metric-not-reported">Not reported</span>}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* 8th Card: Key Takeaways Card */}
            <article
              className="university-kpi-card takeaways-card"
              style={{ animationDelay: `${universities.length * 60}ms` }}
            >
              <div className="takeaways-header">
                <div className="takeaways-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <strong>Key Takeaways</strong>
                  <span className="takeaways-sub">Auto-generated insights from 2025 submissions</span>
                </div>
              </div>

              <div className="takeaways-list">
                {takeaways.map((item, idx) => (
                  <div className="takeaway-item" key={idx}>
                    <div className="takeaway-badge-row">
                      <span className="takeaway-badge">{item.tag}</span>
                      <span className="takeaway-title">{item.title}</span>
                    </div>
                    <p className="takeaway-text">{item.text}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* 3. Comparison Table with Inline Horizontal Data Bars & Top Badges */}
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>University Benchmark Matrix</h2>
                <p>Click any column heading to sort. Note: Order is based on selected metric, not an official NIRF rank.</p>
              </div>
            </div>

            <div className="table-scroll">
              <table aria-label="University benchmark comparison matrix">
                <thead>
                  <tr>
                    <th className="th-index">#</th>
                    <th>University</th>
                    {sortHeader("Students", "students")}
                    {sortHeader("Faculty", "faculty")}
                    {sortHeader("Ph.D.", "phd")}
                    {sortHeader("NAAC CGPA", "cgpa")}
                    {sortHeader("Research · 3 yrs", "research")}
                    {sortHeader("Patents · 3 yrs", "patents")}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const shortName = row.university.institute.shortName;
                    const accentColor = getColor(universities, shortName);

                    return (
                      <tr key={shortName}>
                        <td className="td-index">{row.order}</td>
                        <td>
                          <span className="table-university">
                            <span className="color-dot" style={{ backgroundColor: accentColor }} />
                            <UniversityLogo shortName={shortName} size="small" />
                            <span className="table-uni-info">
                              <strong>{shortName}</strong>
                              <span className="table-uni-full">{row.university.institute.name}</span>
                            </span>
                          </span>
                        </td>

                        {/* Students Column */}
                        <TableDataBarCell
                          val={row.students}
                          max={columnExtrema.students.max}
                          min={columnExtrema.students.min}
                          color={accentColor}
                          format={(v) => formatNumber(v)}
                        />

                        {/* Faculty Column */}
                        <TableDataBarCell
                          val={row.faculty}
                          max={columnExtrema.faculty.max}
                          min={columnExtrema.faculty.min}
                          color={accentColor}
                          format={(v) => formatNumber(v)}
                        />

                        {/* Ph.D. Column */}
                        <TableDataBarCell
                          val={row.phd}
                          max={columnExtrema.phd.max}
                          min={columnExtrema.phd.min}
                          color={accentColor}
                          format={(v) => formatNumber(v)}
                        />

                        {/* NAAC CGPA Column */}
                        <TableDataBarCell
                          val={row.cgpa}
                          max={columnExtrema.cgpa.max}
                          min={columnExtrema.cgpa.min}
                          color={accentColor}
                          format={(v) => v.toFixed(2)}
                        />

                        {/* Research Funding Column (Normalized to ₹ Cr) */}
                        <TableDataBarCell
                          val={row.research}
                          max={columnExtrema.research.max}
                          min={columnExtrema.research.min}
                          color={accentColor}
                          format={(v) => formatCrore(v)}
                          titleText={formatINR(row.research, "full")}
                        />

                        {/* Patents Column */}
                        <TableDataBarCell
                          val={row.patents}
                          max={columnExtrema.patents.max}
                          min={columnExtrema.patents.min}
                          color={accentColor}
                          format={(v) => formatNumber(v)}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// Circular progress ring for NAAC CGPA out of 4.0
function CgpaProgressRing({ cgpa, color }: { cgpa: number | null; color: string }) {
  if (cgpa == null || !Number.isFinite(cgpa)) {
    return <span className="metric-not-reported">Not reported</span>;
  }

  const radius = 20;
  const stroke = 3.5;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(Math.max(cgpa / 4.0, 0), 1);
  const strokeDashoffset = circumference * (1 - normalized);

  return (
    <div className="cgpa-ring-wrapper" role="img" aria-label={`NAAC CGPA ${cgpa.toFixed(2)} out of 4.0`}>
      <svg className="cgpa-ring-svg" width="54" height="54" viewBox="0 0 54 54">
        <circle
          className="cgpa-ring-track"
          cx="27"
          cy="27"
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="cgpa-ring-fill"
          cx="27"
          cy="27"
          r={radius}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90 27 27)"
        />
      </svg>
      <div className="cgpa-ring-value-box">
        <strong className="cgpa-ring-val">{cgpa.toFixed(2)}</strong>
        <span className="cgpa-ring-scale">/ 4.0</span>
      </div>
    </div>
  );
}

// Table cell with inline data bar, Top badge, and right-aligned tabular formatting
function TableDataBarCell({
  val,
  max,
  min,
  color,
  format,
  titleText,
}: {
  val: number | null;
  max: number;
  min: number;
  color: string;
  format: (n: number) => string;
  titleText?: string;
}) {
  if (val == null || !Number.isFinite(val)) {
    return (
      <td className="text-right">
        <span className="metric-not-reported">Not reported</span>
      </td>
    );
  }

  const isBest = max > 0 && val === max;
  const isLowest = min !== max && val === min;
  const percentage = max > 0 ? Math.min(Math.max((val / max) * 100, 4), 100) : 0;

  return (
    <td className={`text-right ${isBest ? "td-best-val" : ""}`} title={titleText}>
      <div className="table-bar-cell">
        <div className="table-bar-header">
          {isBest && <span className="top-badge">Top</span>}
          <span className={`table-number ${isLowest ? "table-number-muted" : ""}`}>
            {format(val)}
          </span>
        </div>
        <div
          className="table-bar-track"
          role="progressbar"
          aria-valuenow={val}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={format(val)}
        >
          <div
            className="table-bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: isBest ? "var(--positive)" : color,
            }}
          />
        </div>
      </div>
    </td>
  );
}
