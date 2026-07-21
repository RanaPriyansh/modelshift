import { generateScenarioSeries } from "@/src/domain/physics";

const mysteryTrajectory = generateScenarioSeries("mystery_force_cutoff").trajectories[0];
const cutoffSample = mysteryTrajectory.samples.find((sample) => sample.timeS === 1);
const cutoffVelocityMps = cutoffSample?.velocityMps ?? 0;
const cutoffForceN = cutoffSample?.forceN ?? 0;

export function MysteryWorld() {
  return (
    <figure className="world world--mystery" aria-labelledby="mystery-world-caption">
      <svg viewBox="0 0 900 370" role="img" aria-label={`A cargo craft moving right at ${cutoffVelocityMps} metres per second. The engine has just switched off. Net horizontal force is ${cutoffForceN} newtons.`}>
        <defs>
          <linearGradient id="space-backdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#08101b" />
            <stop offset="1" stopColor="#111a2c" />
          </linearGradient>
          <linearGradient id="craft-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7f8b9b" />
            <stop offset="0.45" stopColor="#e1e6eb" />
            <stop offset="1" stopColor="#8290a1" />
          </linearGradient>
          <filter id="craft-shadow" x="-20%" width="140%" y="-30%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#000" floodOpacity="0.42" />
          </filter>
        </defs>
        <rect width="900" height="370" rx="24" fill="url(#space-backdrop)" />
        <g className="stars" fill="#8092aa" aria-hidden="true">
          <circle cx="75" cy="65" r="2" /><circle cx="168" cy="118" r="1.5" /><circle cx="278" cy="54" r="1" />
          <circle cx="392" cy="94" r="2" /><circle cx="525" cy="50" r="1.5" /><circle cx="680" cy="108" r="1" />
          <circle cx="808" cy="61" r="2" /><circle cx="742" cy="176" r="1.5" /><circle cx="115" cy="205" r="1" />
        </g>
        <line x1="80" x2="820" y1="292" y2="292" stroke="#516071" strokeWidth="3" />
        <line x1="470" x2="470" y1="50" y2="318" stroke="#77869a" strokeDasharray="7 8" opacity="0.65" />
        <g transform="translate(333 172)" filter="url(#craft-shadow)">
          <path d="M0 35 L30 10 H155 L205 38 L155 67 H30 Z" fill="url(#craft-body)" stroke="#ecf0f4" strokeWidth="2" />
          <rect x="42" y="22" width="40" height="33" rx="7" fill="#19283c" stroke="#8393a6" />
          <path d="M18 28 L-13 18 L-13 58 L18 48 Z" fill="#677587" stroke="#a9b4c1" />
          <circle cx="155" cy="38" r="5" fill="#233246" />
        </g>
        <g className="vector vector--velocity" aria-label={`Velocity vector points right at ${cutoffVelocityMps} metres per second`}>
          <line x1="548" x2="730" y1="170" y2="170" />
          <path d="M730 170 L710 158 L710 182 Z" />
          <text x="570" y="150">velocity = {cutoffVelocityMps} m/s</text>
        </g>
        <g className="zero-force" aria-label={`Net force equals ${cutoffForceN} newtons`}>
          <circle cx="625" cy="236" r="9" />
          <text x="650" y="243">net force = {cutoffForceN} N</text>
        </g>
        <g className="cutoff-label" aria-hidden="true">
          <rect x="422" y="64" width="96" height="34" rx="8" />
          <text x="442" y="87">t = 1.0 s</text>
        </g>
        <text className="world-note" x="357" y="333">Engine just switched off</text>
      </svg>
      <figcaption id="mystery-world-caption" className="world-caption">
        The craft is already moving right. At the frozen moment the engine is off, no resistance is present, and the net horizontal force is zero.
      </figcaption>
    </figure>
  );
}
