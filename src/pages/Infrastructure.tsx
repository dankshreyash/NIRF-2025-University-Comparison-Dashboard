import { PageHeader } from "../components/PageHeader";
import type { UniversityData } from "../types";

interface InfrastructureProps {
  universities: UniversityData[];
}

const POLICY_LABELS: Record<string, string> = {
  multipleEntryExit: "Multiple entry / exit",
  indianLanguages: "Courses in Indian languages",
  indianKnowledgeSystem: "Indian Knowledge System",
  grievanceCell: "Grievance redressal cell",
  nationalStateEntranceExams: "National/state entrance exams",
};

export function Infrastructure({ universities }: InfrastructureProps) {
  const practices = Array.from(
    new Set(
      universities.flatMap((university) =>
        university.sustainability.map((item) => item.practice),
      ),
    ),
  );
  const policyKeys = Array.from(
    new Set(universities.flatMap((university) => Object.keys(university.policies))),
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Infrastructure & sustainability"
        description="NAAC accreditation, accessibility responses, institutional policies, and selected sustainability options."
      />
      {universities.length === 0 ? (
        <div className="panel empty-state">Select at least one university to compare.</div>
      ) : (
        <>
          <div className="infrastructure-grid">
            {universities.map((university) => (
              <section className="panel infrastructure-card" key={university.institute.shortName}>
                <div className="infrastructure-card-title">
                  <h2>{university.institute.shortName}</h2>
                  <span className={`status-pill ${university.naac.valid === true ? "status-good" : university.naac.valid === false ? "status-bad" : "status-neutral"}`}>
                    {university.naac.valid == null ? "Not reported" : university.naac.valid ? "NAAC valid" : "NAAC not valid"}
                  </span>
                </div>
                <dl className="detail-list">
                  <div><dt>Institute</dt><dd>{university.institute.name}</dd></div>
                  <div><dt>NAAC CGPA</dt><dd>{university.naac.cgpa ?? "Not reported"}</dd></div>
                  <div><dt>Valid from</dt><dd>{university.naac.validFrom ?? "Not reported"}</dd></div>
                  <div><dt>Valid upto</dt><dd>{university.naac.validUpto ?? "Not reported"}</dd></div>
                  <div><dt>Lifts / ramps</dt><dd>{university.accessibility.liftsRamps ?? "Not reported"}</dd></div>
                  <div><dt>Walking aids</dt><dd>{university.accessibility.walkingAids ?? "Not reported"}</dd></div>
                  <div><dt>Accessible toilets</dt><dd>{university.accessibility.accessibleToilets ?? "Not reported"}</dd></div>
                </dl>
              </section>
            ))}
          </div>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Policies and institutional practices</h2>
                <p>Checkmarks indicate a source answer of “Yes.” A dash means not reported; “No” is shown explicitly.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Policy</th>
                    {universities.map((university) => (
                      <th key={university.institute.shortName}>{university.institute.shortName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policyKeys.map((key) => (
                    <tr key={key}>
                      <td>{POLICY_LABELS[key] ?? key}</td>
                      {universities.map((university) => {
                        const value = university.policies[key];
                        return (
                          <td className={value === true ? "matrix-yes" : ""} key={university.institute.shortName}>
                            {value == null ? "—" : value ? "✓ Yes" : "No"}
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
                <h2>Sustainable living practices</h2>
                <p>Each cell lists the options selected in the submitted PDF.</p>
              </div>
            </div>
            <div className="table-scroll sustainability-scroll">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Practice / question</th>
                    {universities.map((university) => (
                      <th key={university.institute.shortName}>{university.institute.shortName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {practices.map((practice) => (
                    <tr key={practice}>
                      <td>{practice}</td>
                      {universities.map((university) => {
                        const selection = university.sustainability.find(
                          (item) => item.practice === practice,
                        );
                        return (
                          <td key={university.institute.shortName}>
                            {selection && selection.selectedOptions.length > 0 ? (
                              <span className="sustainability-options">
                                <span className="matrix-yes">✓</span>
                                {selection.selectedOptions.join(", ")}
                              </span>
                            ) : (
                              <span className="muted-text">Not reported</span>
                            )}
                          </td>
                        );
                      })}
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
