import { useEffect, useMemo, useState } from "react";
import { UniversitySelector } from "./components/UniversitySelector";
import { Compare } from "./pages/Compare";
import { Faculty } from "./pages/Faculty";
import { Infrastructure } from "./pages/Infrastructure";
import { Overview } from "./pages/Overview";
import { Placement } from "./pages/Placement";
import { ResearchFinance } from "./pages/ResearchFinance";
import { Students } from "./pages/Students";
import type { CombinedData, UniversityData } from "./types";
import { availableYears } from "./utils/metrics";

type PageId =
  | "overview"
  | "students"
  | "placement"
  | "research"
  | "faculty"
  | "compare"
  | "infrastructure";

const PAGES: Array<{ id: PageId; label: string; number: string }> = [
  { id: "overview", label: "Overview", number: "01" },
  { id: "students", label: "Students", number: "02" },
  { id: "placement", label: "Placement", number: "03" },
  { id: "research", label: "Research & Finance", number: "04" },
  { id: "faculty", label: "Faculty", number: "05" },
  { id: "compare", label: "Compare", number: "06" },
  { id: "infrastructure", label: "Infrastructure", number: "07" },
];

export default function App() {
  const [data, setData] = useState<CombinedData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState("All years");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("nirf-theme") === "dark",
  );

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}data/all.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load university data (${response.status}).`);
        }
        return response.json() as Promise<CombinedData>;
      })
      .then((result) => {
        if (!Array.isArray(result.universities) || result.universities.length === 0) {
          throw new Error("The combined data file contains no university records.");
        }
        if (active) {
          setData(result);
          setSelectedNames(
            result.universities.map((university) => university.institute.shortName),
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load dashboard data.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("nirf-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const universities = data?.universities ?? [];
  const years = useMemo(() => availableYears(universities), [universities]);
  const selectedUniversities = useMemo(
    () =>
      universities.filter((university) =>
        selectedNames.includes(university.institute.shortName),
      ),
    [selectedNames, universities],
  );

  if (loadError) {
    return (
      <main className="app-shell error-shell">
        <section className="panel error-panel" role="alert">
          <p className="eyebrow">NIRF 2025</p>
          <h1>Dashboard data could not be loaded</h1>
          <p>{loadError}</p>
          <p>Run <code>python scripts\extract.py</code> to generate public/data/all.json.</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell loading-shell" aria-live="polite">
        <div className="loading-mark">NIRF <span>2025</span></div>
        <p>Loading institute-submitted data…</p>
      </main>
    );
  }

  const pageContent = renderPage(activePage, selectedUniversities, selectedYear);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Institute comparison</p>
            <strong>NIRF 2025</strong>
          </div>
        </div>
        <div className="topbar-controls">
          <UniversitySelector
            universities={universities}
            selected={selectedNames}
            onChange={setSelectedNames}
          />
          <label className="select-field year-selector">
            Reporting year
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              <option>All years</option>
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <button
            className="button button-muted theme-toggle"
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          >
            {darkMode ? "☼ Light" : "◐ Dark"}
          </button>
        </div>
      </header>

      <nav className="page-nav" aria-label="Dashboard pages">
        {PAGES.map((page) => (
          <button
            key={page.id}
            className={`nav-link ${activePage === page.id ? "nav-link-active" : ""}`}
            type="button"
            aria-current={activePage === page.id ? "page" : undefined}
            onClick={() => setActivePage(page.id)}
          >
            <span>{page.number}</span>
            {page.label}
          </button>
        ))}
      </nav>

      <main className="main-content">{pageContent}</main>

      <footer className="about-footer">
        <div>
          <strong>About data</strong>
          <p>
            Source: NIRF 2025 submitted institute data. Figures are institute-reported
            and are not independently audited.
          </p>
        </div>
        <span>{selectedUniversities.length} of {universities.length} universities selected</span>
      </footer>
    </div>
  );
}

function renderPage(
  page: PageId,
  universities: UniversityData[],
  selectedYear: string,
) {
  switch (page) {
    case "overview":
      return <Overview universities={universities} />;
    case "students":
      return <Students universities={universities} />;
    case "placement":
      return <Placement universities={universities} selectedYear={selectedYear} />;
    case "research":
      return <ResearchFinance universities={universities} selectedYear={selectedYear} />;
    case "faculty":
      return <Faculty universities={universities} />;
    case "compare":
      return <Compare universities={universities} />;
    case "infrastructure":
      return <Infrastructure universities={universities} />;
  }
}
