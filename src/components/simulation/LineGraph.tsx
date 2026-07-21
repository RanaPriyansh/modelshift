import type { CSSProperties } from "react";

export interface GraphPoint {
  t: number;
  value: number;
}

export interface GraphSeries {
  label: string;
  color: "gold" | "teal" | "violet" | "muted";
  points: GraphPoint[];
  dashed?: boolean;
}

interface LineGraphProps {
  title: string;
  description: string;
  series: GraphSeries[];
  xLabel?: string;
  yLabel?: string;
  className?: string;
}

const COLORS: Record<GraphSeries["color"], string> = {
  gold: "var(--gold)",
  teal: "var(--teal)",
  violet: "var(--violet)",
  muted: "var(--muted)",
};

function toPolyline(points: GraphPoint[], minTime: number, maxTime: number, minValue: number, maxValue: number) {
  const timeSpan = Math.max(maxTime - minTime, 1);
  const valueSpan = Math.max(maxValue - minValue, 1);
  return points
    .map(({ t, value }) => {
      const x = 42 + ((t - minTime) / timeSpan) * 244;
      const y = 112 - ((value - minValue) / valueSpan) * 82;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function LineGraph({ title, description, series, xLabel = "time", yLabel = "velocity", className }: LineGraphProps) {
  const points = series.flatMap((item) => item.points);
  const minTime = Math.min(...points.map((point) => point.t), 0);
  const maxTime = Math.max(...points.map((point) => point.t), 1);
  const rawMin = Math.min(...points.map((point) => point.value), 0);
  const rawMax = Math.max(...points.map((point) => point.value), 1);
  const valuePadding = Math.max((rawMax - rawMin) * 0.12, 0.5);
  const minValue = rawMin - valuePadding;
  const maxValue = rawMax + valuePadding;

  return (
    <figure className={["line-graph", className].filter(Boolean).join(" ")} aria-label={description}>
      <div className="line-graph__header">
        <strong>{title}</strong>
        <span>{yLabel} vs. {xLabel}</span>
      </div>
      <svg viewBox="0 0 310 138" role="img" aria-label={description}>
        <g className="graph-grid" aria-hidden="true">
          {[30, 50.5, 71, 91.5, 112].map((y) => <line key={y} x1="42" x2="286" y1={y} y2={y} />)}
          {[42, 103, 164, 225, 286].map((x) => <line key={x} x1={x} x2={x} y1="30" y2="112" />)}
        </g>
        <line className="graph-axis" x1="42" x2="286" y1="112" y2="112" />
        <line className="graph-axis" x1="42" x2="42" y1="26" y2="112" />
        {series.map((item) => (
          <polyline
            key={item.label}
            className="graph-line"
            fill="none"
            points={toPolyline(item.points, minTime, maxTime, minValue, maxValue)}
            stroke={COLORS[item.color]}
            strokeDasharray={item.dashed ? "7 5" : undefined}
            style={{ "--graph-color": COLORS[item.color] } as CSSProperties}
          />
        ))}
        <text x="42" y="129">0</text>
        <text x="276" y="129">{maxTime}s</text>
        <text x="5" y="34">{Math.round(rawMax)}</text>
        <text x="15" y="115">0</text>
      </svg>
      {series.length > 1 ? (
        <figcaption className="graph-legend">
          {series.map((item) => (
            <span key={item.label}><i style={{ background: COLORS[item.color] }} />{item.label}</span>
          ))}
        </figcaption>
      ) : null}
      <span className="sr-only">{description}</span>
    </figure>
  );
}
