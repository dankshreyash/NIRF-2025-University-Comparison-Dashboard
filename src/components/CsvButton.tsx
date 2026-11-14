type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

interface CsvButtonProps {
  rows: CsvRow[];
  fileName: string;
  label?: string;
}

function escapeCell(value: CsvValue): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function CsvButton({
  rows,
  fileName,
  label = "Export CSV",
}: CsvButtonProps) {
  function exportRows() {
    if (rows.length === 0) return;
    const headers = Array.from(
      rows.reduce((keys, row) => {
        Object.keys(row).forEach((key) => keys.add(key));
        return keys;
      }, new Set<string>()),
    );
    const body = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => headers.map((key) => escapeCell(row[key])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([body], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="button button-primary"
      type="button"
      onClick={exportRows}
      disabled={rows.length === 0}
    >
      {label}
    </button>
  );
}
