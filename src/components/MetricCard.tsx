interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}

export function MetricCard({ label, value, hint, color }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        {color && <span className="color-dot" style={{ backgroundColor: color }} />}
      </div>
      <strong>{value}</strong>
      {hint && <span className="metric-hint">{hint}</span>}
    </div>
  );
}
