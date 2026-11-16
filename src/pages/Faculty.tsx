import { useEffect, useMemo, useState } from "react";
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
import { CsvButton } from "../components/CsvButton";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import type { UniversityData } from "../types";
import {
  facultyAgeDistribution,
  facultyAssociationRows,
  facultyAverageAge,
  facultyAverageExperience,
  facultyCount,
  facultyDesignationRows,
  facultyGenderRows,
  facultyQualificationPercent,
  facultyStudentRatio,
  formatNumber,
  formatPercent,
  getColor,
} from "../utils/metrics";

interface FacultyProps {
  universities: UniversityData[];
}

const PAGE_SIZE = 20;

export function Faculty({ universities }: FacultyProps) {
  const [search, setSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState("All universities");
  const [designation, setDesignation] = useState("All designations");
  const [association, setAssociation] = useState("All associations");
  const [currentPage, setCurrentPage] = useState(1);

  const allRows = useMemo(
    () =>
      universities.flatMap((university) =>
        university.faculty.rows.map((row) => ({
          ...row,
          university: university.institute.shortName,
        })),
      ),
    [universities],
  );
  const designations = Array.from(
    new Set(allRows.map((row) => row.designation ?? "Not reported")),
  ).sort();
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.name,
          row.designation,
          row.qualification,
          row.gender,
          row.university,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesDesignation =
        designation === "All designations" || row.designation === designation;
      const type = associationGroup(row.associationType);
      const matchesAssociation =
        association === "All associations" || type === association;
      const matchesUniversity =
        universityFilter === "All universities" ||
        row.university === universityFilter;
      return (
        matchesSearch &&
        matchesDesignation &&
        matchesAssociation &&
        matchesUniversity
      );
    });
  }, [allRows, association, designation, search, universityFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, universityFilter, designation, association, universities]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const exportRows = filteredRows.map((row) => ({
    university: row.university,
    srNo: row.srNo,
    name: row.name,
    age: row.age,
    designation: row.designation,
    gender: row.gender,
    qualification: row.qualification,
    experienceMonths: row.experienceMonths,
    currentlyWorking: row.currentlyWorking,
    joiningDate: row.joiningDate,
    leavingDate: row.leavingDate,
    associationType: row.associationType,
  }));
  const designationRows = facultyDesignationRows(universities);
  const associationRows = facultyAssociationRows(universities);
  const genderRows = facultyGenderRows(universities);
  const ageRows = facultyAgeDistribution(universities);

  return (
    <div className="page-stack">
      <PageHeader
        title="Faculty"
        description="Composition, qualification, experience, and source-level faculty records."
      />
      <div className="metric-grid">
        {universities.map((university) => (
          <section className="university-summary-card" key={university.institute.shortName}>
            <strong>{university.institute.shortName}</strong>
            <MetricCard
              label="Faculty count"
              value={formatNumber(facultyCount(university))}
              hint={university.faculty.rows.length === 0 ? "PDF-reported count; detail rows unavailable" : "Individual rows extracted"}
            />
            <MetricCard
              label="Ph.D. qualification"
              value={formatPercent(facultyQualificationPercent(university))}
            />
            <MetricCard
              label="Average experience"
              value={formatNumber(facultyAverageExperience(university), 1)}
              hint="Months · available rows only"
            />
            <MetricCard
              label="Average age"
              value={formatNumber(facultyAverageAge(university), 1)}
              hint="Years · available rows only"
            />
            <MetricCard
              label="Student : faculty"
              value={facultyStudentRatio(university) ?? "Not reported"}
            />
          </section>
        ))}
      </div>
      <div className="chart-grid">
        <ChartPanel
          title="Faculty by designation"
          description="Normalized designation groups, colored consistently by university."
          fileName="faculty-designation"
          data={designationRows}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={designationRows} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="designation" />
              <YAxis />
              <Tooltip />
              <Legend />
              {universities.map((university) => (
                <Bar
                  key={university.institute.shortName}
                  dataKey={university.institute.shortName}
                  name={university.institute.shortName}
                  fill={getColor(universities, university.institute.shortName)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Regular and contractual faculty"
          description="Association type is kept from the PDF; non-regular/non-contract rows appear under Other."
          fileName="faculty-association"
          data={associationRows}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={associationRows} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="association" />
              <YAxis />
              <Tooltip />
              <Legend />
              {universities.map((university) => (
                <Bar
                  key={university.institute.shortName}
                  dataKey={university.institute.shortName}
                  name={university.institute.shortName}
                  fill={getColor(universities, university.institute.shortName)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Faculty gender"
          description="Extracted faculty rows only; unavailable row sets remain blank."
          fileName="faculty-gender"
          data={genderRows}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genderRows} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="university" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="male" name="Male" fill="#16283f" />
              <Bar dataKey="female" name="Female" fill="#db5a22" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Faculty age distribution"
          description="Age bands from individual faculty rows."
          fileName="faculty-age-distribution"
          data={ageRows}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageRows} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ageBand" />
              <YAxis />
              <Tooltip />
              <Legend />
              {universities.map((university) => (
                <Bar
                  key={university.institute.shortName}
                  dataKey={university.institute.shortName}
                  name={university.institute.shortName}
                  fill={getColor(universities, university.institute.shortName)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading faculty-table-heading">
          <div>
            <h2>Faculty records</h2>
            <p>{filteredRows.length.toLocaleString("en-IN")} matching rows · page {currentPage} of {pageCount}</p>
          </div>
          <CsvButton rows={exportRows} fileName="nirf-faculty-filtered" />
        </div>
        <div className="faculty-filters">
          <label className="search-field">
            Search faculty
            <input
              type="search"
              placeholder="Name, designation, degree, university…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="select-field">
            University
            <select
              value={universityFilter}
              onChange={(event) => setUniversityFilter(event.target.value)}
            >
              <option>All universities</option>
              {universities.map((item) => (
                <option key={item.institute.shortName} value={item.institute.shortName}>
                  {item.institute.shortName} – {item.institute.name}
                </option>
              ))}
            </select>
          </label>
          <label className="select-field">
            Designation
            <select value={designation} onChange={(event) => setDesignation(event.target.value)}>
              <option>All designations</option>
              {designations.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="select-field">
            Association
            <select value={association} onChange={(event) => setAssociation(event.target.value)}>
              <option>All associations</option>
              <option>Regular</option>
              <option>Adhoc-Contractual</option>
              <option>Other</option>
            </select>
          </label>
        </div>
        {filteredRows.length === 0 ? (
          <div className="empty-state table-empty">
            {universities.some((university) => university.faculty.reportedCount)
              ? "No individual faculty rows are available for the selected universities."
              : "No faculty records match these filters."}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>University</th>
                  <th>SrNo</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Designation</th>
                  <th>Gender</th>
                  <th>Qualification</th>
                  <th>Experience (months)</th>
                  <th>Working</th>
                  <th>Joining</th>
                  <th>Leaving</th>
                  <th>Association</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.university}-${row.srNo}`}>
                    <td>{row.university}</td>
                    <td>{row.srNo}</td>
                    <td>{row.name ?? "Not reported"}</td>
                    <td>{formatNumber(row.age)}</td>
                    <td>{row.designation ?? "Not reported"}</td>
                    <td>{row.gender ?? "Not reported"}</td>
                    <td>{row.qualification ?? "Not reported"}</td>
                    <td>{formatNumber(row.experienceMonths)}</td>
                    <td>{row.currentlyWorking == null ? "Not reported" : row.currentlyWorking ? "Yes" : "No"}</td>
                    <td>{row.joiningDate ?? "Not reported"}</td>
                    <td>{row.leavingDate ?? "Not reported"}</td>
                    <td>{row.associationType ?? "Not reported"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredRows.length > 0 && (
          <div className="pagination">
            <button
              className="button button-muted"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Previous
            </button>
            <span>Page {currentPage} / {pageCount}</span>
            <button
              className="button button-muted"
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function associationGroup(value: string | null): string {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("regular")) return "Regular";
  if (normalized.includes("adhoc") || normalized.includes("contract")) {
    return "Adhoc-Contractual";
  }
  return "Other";
}
