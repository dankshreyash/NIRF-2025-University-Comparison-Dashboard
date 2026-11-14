import { useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";

type ExportRow = Record<string, string | number | boolean | null | undefined>;

interface ChartPanelProps {
  title: string;
  description?: string;
  fileName: string;
  data: ExportRow[];
  children: ReactNode;
  emptyMessage?: string;
}

function csvEscape(value: ExportRow[string]): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(fileName: string, rows: ExportRow[]) {
  if (rows.length === 0) return;
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );
  const contents = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n");
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function hasReportedValues(rows: ExportRow[]): boolean {
  const labelKeys = new Set(["year", "label", "ageBand", "university"]);
  return rows.some((row) =>
    Object.entries(row).some(
      ([key, value]) => !labelKeys.has(key) && value !== null && value !== undefined,
    ),
  );
}

export function ChartPanel({
  title,
  description,
  fileName,
  data,
  children,
  emptyMessage = "Not reported for the current selection.",
}: ChartPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const hasData = hasReportedValues(data);

  async function exportPng() {
    if (!chartRef.current) return;
    setExportError(null);
    try {
      const url = await toPng(chartRef.current, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--panel")
          .trim(),
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.png`;
      link.click();
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "PNG export failed.",
      );
    }
  }

  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="export-actions">
          <button
            className="button button-muted"
            type="button"
            onClick={() => downloadCsv(fileName, data)}
            disabled={!hasData}
          >
            CSV
          </button>
          <button
            className="button button-muted"
            type="button"
            onClick={exportPng}
          >
            PNG
          </button>
        </div>
      </div>
      <div className="chart-area" ref={chartRef}>
        {!hasData ? (
          <div className="empty-chart">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
      {exportError && <p className="inline-error">PNG export failed: {exportError}</p>}
    </section>
  );
}
