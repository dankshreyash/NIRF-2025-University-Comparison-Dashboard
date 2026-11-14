import type { UniversityData } from "../types";

interface UniversitySelectorProps {
  universities: UniversityData[];
  selected: string[];
  onChange: (value: string[]) => void;
}

export function UniversitySelector({
  universities,
  selected,
  onChange,
}: UniversitySelectorProps) {
  function toggle(shortName: string) {
    const next = selected.includes(shortName)
      ? selected.filter((item) => item !== shortName)
      : [...selected, shortName];
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
              <span>{university.institute.name}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
