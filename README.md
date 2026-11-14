# NIRF 2025 University Comparison

A static React + Vite + TypeScript dashboard for seven Maharashtra universities. The figures come from institute-submitted NIRF 2025 PDFs and are institute-reported, not independently audited.

## Data extraction and validation

The supplied PDFs are currently in `docs/`. New PDFs can be dropped into `data/pdfs/`; the extractor scans both directories and writes one JSON file per institute plus `public/data/all.json`.

```powershell
python -m pip install -r requirements.txt
python scripts\extract.py
python scripts\validate.py
```

The validator writes `validation_report.md`. Review every warning before using the data. Missing source values remain `null`; the scripts do not infer or repair them. PDFs without an individual faculty table retain the source-reported faculty count while leaving the row list empty.

### Adding an eighth university

1. Add its NIRF 2025 submitted PDF to `data/pdfs/`, named `NIRF_Ranking_2025_<SHORT_NAME>.pdf`.
2. Run `python scripts\extract.py` and `python scripts\validate.py`.
3. Review the generated JSON and validation warnings. Add an institute-ID mapping in `KNOWN_SHORT_NAMES` in `scripts\extract.py` if the filename cannot supply the desired short name.
4. Run `npm run dev`; the dashboard reads the regenerated `public/data/all.json` automatically.

The initial seven source PDFs remain in `docs/` and are included automatically.

## Run locally

```powershell
npm install
npm run dev
```

## Build and deploy

```powershell
npm run build
npm run preview
```

The production files are written to `dist/`.

- **Vercel / Netlify:** import the project, use `npm run build` as the build command, and `dist` as the output directory.
- **GitHub Pages:** build with `npm run build` and publish `dist` using a Pages workflow or a static-site publishing action. The Vite base is relative so the assets and JSON also work from a project subpath.

## Dashboard features

- Overview, students, placements, research and finance, faculty, compare, and infrastructure/sustainability pages.
- University selection, an applicable-year filter, and light/dark mode.
- Self-hosted Inter and Plus Jakarta Sans variable fonts; the global currency toggle switches between Crore and Full INR.
- CSV/PNG export on charts and CSV export for filtered faculty records.
- Derived ratios and rates are centralized in `src/utils/metrics.ts`.

All currency values in JSON are plain INR numbers. Crore display uses INR divided by 10,000,000, with sub-crore amounts shown in lakhs; hover monetary values to see the full INR figure. The dashboard displays unavailable values as “Not reported.”
