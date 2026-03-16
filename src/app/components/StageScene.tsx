"use client";

import { motion } from "framer-motion";

export default function StageScene() {
  return (
    <svg viewBox="0 0 360 240" width="100%" height="100%" style={{ imageRendering: "pixelated" }} shapeRendering="crispEdges" aria-hidden>
      <rect width="360" height="240" fill="#100500" />
      {/* Film strip */}
      <rect x="0" y="0" width="360" height="16" fill="#111" />
      {Array.from({ length: 19 }, (_, i) => (
        <rect key={i} x={i * 19 + 3} y={2} width={11} height={12} fill={i % 2 === 0 ? "#000" : "#c8b890"} rx="1" />
      ))}
      {/* Spotlights */}
      {[80, 180, 280].map((cx, si) =>
        Array.from({ length: 20 }, (_, row) => (
          <rect key={`${si}-${row}`} x={cx - row * 2.5} y={16 + row * 8} width={row * 5} height={8}
            fill={`rgba(255,175,50,${(0.10 - row * 0.004).toFixed(3)})`} />
        ))
      )}
      {/* Curtains */}
      <rect x="0" y="16" width="48" height="165" fill="#7a0000" />
      {[12, 24, 36].map(x => <rect key={x} x={x} y="16" width="3" height="165" fill="#5a0000" />)}
      <rect x="312" y="16" width="48" height="165" fill="#7a0000" />
      {[322, 334, 346].map(x => <rect key={x} x={x} y="16" width="3" height="165" fill="#5a0000" />)}
      {/* Floor */}
      <rect x="0" y="185" width="360" height="55" fill="#180800" />
      {[192, 202, 215].map((y, i) => <rect key={i} x="0" y={y} width="360" height="2" fill="#251200" />)}
      <rect x="60" y="178" width="240" height="12" fill="#201000" />
      {/* Camera */}
      <rect x="158" y="133" width="40" height="24" fill="#252525" />
      <rect x="168" y="138" width="20" height="14" fill="#0d0d0d" rx="1" />
      <rect x="173" y="141" width="10" height="8" fill="#1a1a2a" rx="1" />
      <rect x="175" y="157" width="6" height="28" fill="#1a1a1a" />
      <motion.rect x="192" y="135" width="4" height="4" fill="#ff2200"
        animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
      {/* Audience */}
      {[18, 48, 80, 112, 145, 215, 248, 280, 312, 342].map((x, i) => (
        <g key={i}>
          <ellipse cx={x + 7} cy={222} rx={7} ry={5} fill="#0a0300" />
          <rect x={x + 2} y={227} width={10} height={10} fill="#0a0300" />
        </g>
      ))}
    </svg>
  );
}
