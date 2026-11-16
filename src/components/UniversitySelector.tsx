import type { UniversityData } from "../types";
import { FIXED_UNIVERSITY_ORDER, sortUniversities } from "../utils/metrics";
import { UniversityLogo } from "./UniversityLogo";

interface UniversitySelectorProps {
  universities: UniversityData[];
  selected: string[];
  onChange: (value: string[]) => void;
}

export function UniversitySelector({
  universities: rawUniversities,
  selected,
  onChange,
}: UniversitySelectorProps) {
  const universities = sortUniversities(rawUniversities);

  function toggle(shortName: string) {
    const rawNext = selected.includes(shortName)
      ? selected.filter((item) => item !== shortName)
      : [...selected, shortName];
    const next = rawNext.sort(
      (a, b) =>
        (FIXED_UNIVERSITY_ORDER as readonly string[]).indexOf(a) -
        (FIXED_UNIVERSITY_ORDER as readonly string[]).indexOf(b),
    );
    onChange(next);
  }

  return (
    <details className="selector-menu">
      <summary className="button button-muted">
        Universities <span className="selection-count">{selected.length}/7</span>
      </summary>
      <div className="selector-popover">
        <div className="selector-controls">
          <button type="button" onClick={() => onChange(universities.map((item) => item.institute.shortName))}>
            Select all
          </button>
          <button type="button" onClick={() => onChange([])}>
            Clear
          </button>
        </div>
        {universities.map((university) => {
          const shortName = university.institute.shortName;
          return (
            <label key={shortName} className="selector-option">
              <input
                type="checkbox"
                checked={selected.includes(shortName)}
                onChange={() => toggle(shortName)}
              />
              <UniversityLogo shortName={shortName} size="small" />
              <span>{university.institute.name}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
