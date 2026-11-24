export type Role = "employed" | "onlooker" | "scout";

export const ROLE_COLOR: Record<Role, string> = {
  employed: "#d97706",
  onlooker: "#0284c7",
  scout: "#e11d48",
};

export const ROLE_LABEL: Record<Role, string> = {
  employed: "Employed bee",
  onlooker: "Onlooker bee",
  scout: "Scout bee",
};

/** A small bee centred on (0,0). The coloured halo encodes its role. */
export function BeeGlyph({ role, scale = 1, waggle = false }: { role: Role; scale?: number; waggle?: boolean }) {
  return (
    <g transform={`scale(${scale})`}>
      <circle r="13" fill={ROLE_COLOR[role]} opacity="0.15" />
      <circle r="13" fill="none" stroke={ROLE_COLOR[role]} strokeWidth="2" />
      <g className={waggle ? "waggle" : undefined}>
        <ellipse cx="-3" cy="-6" rx="5" ry="3.4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" opacity="0.95" transform="rotate(-25 -3 -6)" />
        <ellipse cx="3" cy="-6" rx="5" ry="3.4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" opacity="0.95" transform="rotate(25 3 -6)" />
        <ellipse cx="0" cy="1" rx="5.2" ry="7.2" fill="#fbbf24" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="-5" y="-0.8" width="10" height="2" fill="#1c1917" />
        <rect x="-4.4" y="3" width="8.8" height="1.8" fill="#1c1917" />
        <circle cx="0" cy="-6.4" r="2.6" fill="#1c1917" />
      </g>
    </g>
  );
}

/** Food source as a flower. `size` ~ nectar (fitness rank). */
export function FlowerGlyph({ size, dim = false, color = "#fbbf24" }: { size: number; dim?: boolean; color?: string }) {
  const petals = 6;
  const pr = size * 0.55;
  return (
    <g opacity={dim ? 0.35 : 1}>
      {Array.from({ length: petals }, (_, i) => {
        const a = (i / petals) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={+(Math.cos(a) * size * 0.62).toFixed(2)}
            cy={+(Math.sin(a) * size * 0.62).toFixed(2)}
            r={pr}
            fill={color}
            fillOpacity={0.9}
            stroke="#1c1917"
            strokeWidth="1"
          />
        );
      })}
      <circle r={size * 0.5} fill="#7c2d12" stroke="#1c1917" strokeWidth="1" />
    </g>
  );
}

export function HiveGlyph({ size = 18 }: { size?: number }) {
  const s = size;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return `${(Math.cos(a) * s).toFixed(1)},${(Math.sin(a) * s).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <polygon points={pts} fill="#fff7ed" fillOpacity="0.85" stroke="#fbbf24" strokeWidth="1.5" />
      <path d={`M ${-s * 0.5} ${-s * 0.2} H ${s * 0.5} M ${-s * 0.6} ${s * 0.15} H ${s * 0.6} M ${-s * 0.45} ${s * 0.5} H ${s * 0.45}`} stroke="#fbbf24" strokeWidth="1.4" opacity="0.8" />
      <circle cy={s * 0.15} r={s * 0.16} fill="#92400e" />
    </g>
  );
}

export function StarGlyph({ r = 9, fill = "#fde047" }: { r?: number; fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} stroke="#1c1917" strokeWidth="1.2" />;
}
