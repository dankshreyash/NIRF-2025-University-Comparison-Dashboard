interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  color?: string;
  labelTitle?: string;
  valueTitle?: string;
}

export function MetricCard({
  label,
  value,
  hint,
  color,
  labelTitle,
  valueTitle,
}: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label" title={labelTitle ?? label}>{label}</span>
        {color && <span className="color-dot" style={{ backgroundColor: color }} />}
      </div>
      <strong title={valueTitle ?? value}>{value}</strong>
      {hint && <span className="metric-hint">{hint}</span>}
    </div>
  );
}
