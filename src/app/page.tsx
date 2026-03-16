"use client";

import { motion, AnimatePresence, useAnimation, useMotionValue, useAnimationFrame, useTransform, animate as animateEl } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { CHANNELS } from "./data";
import SpaceBackground from "./components/SpaceBackground";
import StageScene from "./components/StageScene";

// ═══════════════════════════════════════════════════════════════
// DONNÉES LOCALES
// ═══════════════════════════════════════════════════════════════

const WIP_PROJECTS = [
  {
    id: "cyber",
    category: "Cybersecurity",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <rect x="9" y="11" width="6" height="5" rx="1" />
        <path d="M12 11V9a2 2 0 0 1 2-2" />
      </svg>
    ),
    description: "CTF, pentest & security projects — soon.",
    tags: ["CTF", "Pentest", "Kali Linux", "OSCP"],
    colClass: "col-span-12 md:col-span-4",
  },
  {
    id: "ai",
    category: "Artificial Intelligence",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <path d="M12 2a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0V4a2 2 0 0 1 2-2z" />
        <path d="M12 19a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0v-1a2 2 0 0 1 2-2z" />
        <path d="M4.22 4.22a2 2 0 0 1 2.83 0l.7.7a2 2 0 0 1-2.83 2.83l-.7-.7a2 2 0 0 1 0-2.83z" />
        <path d="M16.24 16.24a2 2 0 0 1 2.83 0l.7.7a2 2 0 0 1-2.83 2.83l-.7-.7a2 2 0 0 1 0-2.83z" />
        <path d="M2 12a2 2 0 0 1 2-2h1a2 2 0 0 1 0 4H4a2 2 0 0 1-2-2z" />
        <path d="M19 12a2 2 0 0 1 2-2h1a2 2 0 0 1 0 4h-1a2 2 0 0 1-2-2z" />
        <path d="M4.22 19.78a2 2 0 0 1 0-2.83l.7-.7a2 2 0 0 1 2.83 2.83l-.7.7a2 2 0 0 1-2.83 0z" />
        <path d="M16.24 7.76a2 2 0 0 1 0-2.83l.7-.7a2 2 0 0 1 2.83 2.83l-.7.7a2 2 0 0 1-2.83 0z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    description: "Automation, LLMs & AI Projects — soon.",
    tags: ["Python", "LLMs", "Claude API", "Automation"],
    colClass: "col-span-12 md:col-span-4",
  },
];

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const card = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

// ═══════════════════════════════════════════════════════════════
// COMPOSANTS UI
// ═══════════════════════════════════════════════════════════════

function BentoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const boxShadow = useMotionValue("none");

  const handleHoverStart = async () => {
    animateEl(x, [0, 1.2, 0], { duration: 0.3, ease: "easeOut" });
    await animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0.25), 0 0 24px rgba(255,255,255,0.06)", { duration: 0.15 });
    animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)", { duration: 1 });
  };

  return (
    <motion.div
      variants={card}
      whileHover={{ scale: 1.012, transition: { duration: 0.25, ease: "easeOut" } }}
      className={`bento-card rounded-2xl p-5 relative ${className}`}
      style={{ x, boxShadow }}
      onHoverStart={handleHoverStart}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-medium">
      {text}
    </p>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
      {label}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════
// PIXEL SCENES — 8-bit animated SVG backgrounds per card
// ═══════════════════════════════════════════════════════════════

function PineTree({ x, by, h = 55 }: { x: number; by: number; h?: number }) {
  const y1 = by - h, y2 = by - h * 0.67, y3 = by - h * 0.34;
  return (
    <>
      <polygon points={`${x},${y1} ${x - 6},${y1 + h * 0.34} ${x + 6},${y1 + h * 0.34}`} fill="#2a6a2a" />
      <polygon points={`${x},${y2} ${x - 10},${y2 + h * 0.34} ${x + 10},${y2 + h * 0.34}`} fill="#1a4a1a" />
      <polygon points={`${x},${y3} ${x - 14},${y3 + h * 0.34} ${x + 14},${y3 + h * 0.34}`} fill="#2a6a2a" />
      <rect x={x - 3} y={by - 12} width={6} height={12} fill="#4a2800" />
    </>
  );
}

function HeroScene() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 24), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 360 240" width="100%" height="100%" style={{ imageRendering: "pixelated" }} shapeRendering="crispEdges" aria-hidden>
      {/* Deep space background */}
      <rect width="360" height="240" fill="#02020e" />
      {/* Stars */}
      {[[12,8,1],[45,15,1],[88,5,2],[130,20,1],[175,9,1],[220,14,2],[268,7,1],[305,18,1],[340,11,1],[25,30,1],[65,40,1],[112,28,1],[155,38,1],[200,25,1],[245,35,1],[290,22,1],[335,32,2],[8,50,1],[50,55,1],[95,48,1],[140,58,1],[185,45,1],[230,52,1],[275,42,1],[320,58,1],[350,48,1],[15,70,1],[75,65,1],[160,68,1],[235,62,1],[310,72,1]].map(([x,y,s],i) => (
        <motion.rect key={i} x={x} y={y} width={s} height={s} fill={i%3===0?"#cce0ff":i%3===1?"#ffffff":"#aabbdd"}
          animate={{ opacity: [0.2,0.9,0.2] }} transition={{ duration: 2.2+i*0.18, repeat: Infinity, delay: i*0.12 }} />
      ))}
      {/* Ceiling with lights */}
      <rect x="0" y="0" width="360" height="16" fill="#07091a" />
      <rect x="0" y="15" width="360" height="2" fill="#0e1228" />
      {[50,130,220,310].map((x,i) => (
        <g key={i}>
          <rect x={x-8} y={12} width={16} height={4} fill="#0d1124" />
          <rect x={x-5} y={13} width={10} height={2} fill={frame%8<4 ? "#ffffcc" : "#cccc88"} opacity={0.85} />
          <rect x={x-10} y={16} width={20} height={8} fill={`rgba(255,255,160,${frame%8<4?0.04:0.02})`} />
        </g>
      ))}
      {/* Left wall + porthole window */}
      <rect x="0" y="16" width="14" height="194" fill="#060816" />
      <rect x="13" y="16" width="2" height="194" fill="#0d1124" />
      {/* Porthole frame */}
      <rect x="16" y="22" width="72" height="72" fill="#07091e" />
      <rect x="16" y="22" width="72" height="3" fill="#141832" />
      <rect x="16" y="91" width="72" height="3" fill="#0c1020" />
      <rect x="16" y="22" width="3" height="72" fill="#141832" />
      <rect x="85" y="22" width="3" height="72" fill="#0c1020" />
      <rect x="16" y="55" width="72" height="2" fill="#0f1328" />
      <rect x="50" y="22" width="2" height="72" fill="#0f1328" />
      {/* Planet in window */}
      {[[36,30,20],[34,34,24],[32,38,24],[32,42,24],[34,46,22],[36,50,18],[39,54,12]].map(([x,w,_],row) => (
        <rect key={row} x={x} y={30+row*4} width={w} height={4} fill={["#1a3870","#1e4080","#1a3870","#162e60","#122850","#0e2040","#0a1830"][row]} />
      ))}
      <rect x="22" y="44" width="44" height="2" fill="#2a4888" opacity={0.4} />
      {[[20,26],[78,32],[22,72],[80,68],[24,42],[76,58]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill="#99bbdd" opacity={0.6} />
      ))}
      {/* Right wall */}
      <rect x="346" y="16" width="14" height="194" fill="#060816" />
      <rect x="345" y="16" width="2" height="194" fill="#0d1124" />
      {/* Floor with perspective grid */}
      <rect x="0" y="208" width="360" height="32" fill="#050810" />
      {[210,216,222,228].map((y,i) => <rect key={i} x="0" y={y} width="360" height="1" fill="#0b0e1e" />)}
      {[0,45,90,135,180,225,270,315,360].map((x,i) => (
        <line key={i} x1={x} y1="240" x2={180+(x-180)*0.12} y2="208" stroke="#0b0e1e" strokeWidth="1" />
      ))}
      {/* Main large monitor - center */}
      <rect x="96" y="20" width="210" height="130" fill="#0e1226" />
      <rect x="100" y="24" width="202" height="122" fill="#020408" />
      <rect x="96" y="20" width="210" height="4" fill="#181c34" />
      <rect x="96" y="150" width="210" height="4" fill="#0a0c18" />
      {/* Monitor content - code lines */}
      {[0,1,2,3,4,5,6,7,8,9].map(row => {
        const widths=[130,85,150,65,120,95,140,75,110,60];
        const cols=["#00ff88","#44aaff","#00ff88","#aa88ff","#44aaff","#00ff88","#aa88ff","#44aaff","#00ff88","#44aaff"];
        return <rect key={row} x={104} y={28+row*11} width={widths[row]} height={3} fill={cols[row]} opacity={frame%10===row?0.15:0.72} />;
      })}
      {/* Cursor */}
      <rect x={104} y={138} width={5} height={3} fill="#00ff88" opacity={frame%6<3?1:0} />
      {/* Scanline */}
      <rect x="100" y={24+(frame*6)%122} width="202" height="2" fill="rgba(0,255,136,0.03)" />
      {/* Screen glow */}
      <rect x="96" y="20" width="210" height="134" fill="rgba(0,80,255,0.025)" />
      {/* Mini chart - monitor right zone */}
      <rect x="240" y="28" width="56" height="36" fill="#030608" />
      {[14,22,10,28,18,32,16,24,20,8,30,12].map((h,i) => (
        <rect key={i} x={242+i*4} y={64-h} width={3} height={h} fill="#44aaff" opacity={0.65} />
      ))}
      <rect x="240" y="64" width="56" height="1" fill="#1a2244" />
      {/* Waveform mini - monitor top right */}
      {Array.from({length:22},(_,i)=>{const hs=[4,8,12,6,3,10,15,9,5,2,7,13,11,6,4,9,14,8,3,6,10,5];return<rect key={i} x={242+i*2} y={30} width={1} height={hs[i%22]} fill="#aa88ff" opacity={0.7}/>;}) }
      {/* Monitor stand */}
      <rect x="193" y="154" width="24" height="10" fill="#0c0e1c" />
      <rect x="180" y="163" width="50" height="4" fill="#0a0c18" />
      {/* Side monitor - right */}
      <rect x="264" y="110" width="78" height="58" fill="#0e1226" />
      <rect x="267" y="113" width="72" height="52" fill="#020408" />
      {[0,1,2,3].map(r => (
        <rect key={r} x={270} y={116+r*12} width={[58,38,65,42][r]} height={3} fill={["#ffcc44","#44aaff","#ffcc44","#aa88ff"][r]} opacity={0.7} />
      ))}
      <motion.rect x={270+(frame*5)%62} y={155} width={3} height={3} fill="#44aaff"
        animate={{opacity:[0.4,1,0.4]}} transition={{duration:0.6,repeat:Infinity}} />
      {/* Side monitor - right small */}
      <rect x="282" y="46" width="58" height="50" fill="#0e1226" />
      <rect x="285" y="49" width="52" height="44" fill="#020408" />
      {Array.from({length:26},(_,i)=>{const hs=[3,7,11,8,4,2,6,13,10,5,1,4,9,14,8,3,6,12,9,4,2,5,10,7,3,1];return<rect key={i} x={287+i*2} y={85-hs[i%26]} width={1} height={hs[i%26]} fill="#aa88ff" opacity={0.75}/>;}) }
      {/* Desk / control surface */}
      <rect x="56" y="168" width="288" height="16" fill="#0a0c1e" />
      <rect x="56" y="166" width="288" height="4" fill="#10142a" />
      <rect x="58" y="170" width="284" height="1" fill="#161a30" />
      {/* Left control panel - buttons grid */}
      <rect x="62" y="148" width="78" height="18" fill="#080a1c" />
      {Array.from({length:16},(_,i)=>{
        const bx=65+(i%8)*8, by=150+Math.floor(i/8)*7;
        const litCols=["#44aaff","#44aaff","#aa44ff","#44ff88","#44aaff","#ff6644","#44aaff","#44aaff","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)","rgba(255,255,255,0.08)"];
        return <rect key={i} x={bx} y={by} width={5} height={4} fill={i===frame%16?litCols[0]:litCols[i]} opacity={i===frame%16?1:0.75} />;
      })}
      {/* Right control panel - vertical sliders */}
      <rect x="218" y="148" width="116" height="18" fill="#080a1c" />
      {[222,232,242,252,262,272,282,292,302,312,322].map((sx,i)=>(
        <g key={i}>
          <rect x={sx} y={150} width={6} height={14} fill="#060810" />
          <rect x={sx+1} y={150+((frame+i*3)%10)} width={4} height={4} fill={["#44aaff","#aa88ff","#44ff88","#ffcc44","#ff6644","#44aaff","#aa88ff","#44ff88","#ffcc44","#44aaff","#aa88ff"][i]} opacity={0.9} />
        </g>
      ))}
      {/* Status bar LEDs */}
      {[[68,165,"#44ff88"],[82,165,"#44aaff"],[96,165,"#ffcc44"],[110,165,"#ff4444"]].map(([x,y,c],i)=>(
        <motion.rect key={i} x={x as number} y={y as number} width={8} height={2} fill={c as string}
          animate={{opacity:i===3?[1,0.1,1]:[1,0.5,1]}} transition={{duration:1.2+i*0.4,repeat:Infinity,delay:i*0.3}} />
      ))}
      {/* Character at desk */}
      <rect x="162" y="146" width="10" height="10" fill="#cc9966" />
      <rect x="162" y="143" width="10" height="4" fill="#221100" />
      <rect x="160" y="146" width="3" height="6" fill="#221100" />
      <rect x="158" y="156" width="16" height="12" fill="#1a2a4a" />
      <rect x="148" y="162" width="10" height="5" fill="#1a2a4a" />
      <rect x="186" y="162" width="10" height="5" fill="#1a2a4a" />
      <rect x="148" y="166" width={6} height={3} fill="#cc9966" />
      <rect x="190" y="166" width={6} height={3} fill="#cc9966" />
      {/* Headset */}
      <rect x="160" y="143" width="12" height="2" fill="#2a2a4a" />
      <rect x="158" y="147" width="3" height="4" fill="#2a2a4a" />
      <rect x="171" y="147" width="3" height="4" fill="#2a2a4a" />
      <rect x="156" y="149" width="4" height="3" fill="#383858" />
      {/* Keyboard */}
      <rect x="147" y="174" width="48" height="7" fill="#0c0e1c" />
      {Array.from({length:10},(_,i)=>(
        <rect key={i} x={149+i*4} y={175} width={3} height={2} fill="#14182e" />
      ))}
      {Array.from({length:10},(_,i)=>(
        <rect key={i} x={149+i*4} y={178} width={3} height={2} fill="#14182e" />
      ))}
      {/* Mug */}
      <rect x="204" y="170" width="8" height="10" fill="#181826" />
      <rect x="203" y="169" width="10" height="2" fill="#222238" />
      <rect x="212" y="171" width="3" height="6" fill="#181826" />
      <motion.rect x={207} y={166} width={1} height={3} fill="#aaaacc"
        animate={{opacity:[0,0.45,0],y:[166,160,154]}} transition={{duration:2.2,repeat:Infinity}} />
      <motion.rect x={210} y={166} width={1} height={3} fill="#aaaacc"
        animate={{opacity:[0,0.35,0],y:[166,162,158]}} transition={{duration:2.2,repeat:Infinity,delay:0.9}} />
      {/* Alert indicators - top right */}
      <motion.rect x={336} y={22} width={6} height={4} fill="#ff4444"
        animate={{opacity:[1,0.1,1]}} transition={{duration:0.85,repeat:Infinity}} />
      <motion.rect x={326} y={22} width={6} height={4} fill="#ffcc44"
        animate={{opacity:[0.1,1,0.1]}} transition={{duration:1.25,repeat:Infinity,delay:0.4}} />
      <motion.rect x={316} y={22} width={6} height={4} fill="#44ff88"
        animate={{opacity:[1,0.2,1]}} transition={{duration:1.65,repeat:Infinity,delay:0.9}} />
      {/* Satellite dish - left side */}
      <rect x="16" y="108" width="2" height="32" fill="#141832" />
      <rect x="12" y="106" width="10" height="2" fill="#141832" />
      <rect x="8" y="104" width="18" height="4" fill="#1c2040" />
      <rect x="12" y="100" width="10" height="4" fill="#1c2040" />
      <motion.rect x={10} y={103} width={5} height={2} fill="#44aaff"
        animate={{opacity:[0.3,1,0.3]}} transition={{duration:1.8,repeat:Infinity}} />
      {/* Global scan line */}
      <rect x="0" y={16+((frame*9)%192)} width="360" height="1" fill="rgba(80,120,255,0.02)" />
    </svg>
  );
}

function ForestScene() {
  const fireflies: [number, number, number][] = [[105,130,0],[165,112,0.6],[228,145,1.2],[272,125,0.3],[142,155,0.9],[308,138,1.5]];
  return (
    <svg viewBox="0 0 360 240" width="100%" height="100%" style={{ imageRendering: "pixelated" }} shapeRendering="crispEdges" aria-hidden>
      <rect width="360" height="240" fill="#050f05" />
      {[[30,10],[70,22],[120,8],[170,16],[220,5],[265,20],[300,12],[340,25],[50,30],[315,35]].map(([x,y],i) => (
        <motion.rect key={i} x={x} y={y} width={2} height={2} fill="#aaccaa"
          animate={{ opacity: [0.1, 0.9, 0.1] }} transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.25 }} />
      ))}
      {[[328,6,12],[324,4,20],[322,3,24],[322,6,24],[324,12,20],[326,18,16],[328,22,10]].map(([x,y,w],i) => (
        <rect key={i} x={x} y={y} width={w} height={3} fill="#d4e8cc" />
      ))}
      <PineTree x={18} by={200} h={62} />
      <PineTree x={58} by={196} h={72} />
      <PineTree x={95} by={198} h={56} />
      <PineTree x={205} by={197} h={68} />
      <PineTree x={272} by={200} h={60} />
      <PineTree x={322} by={194} h={76} />
      <rect x="0" y="200" width="360" height="40" fill="#0a180a" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={i * 12 + 2} y={197} width={3} height={5} fill={i % 2 === 0 ? "#1a4a1a" : "#2a6a2a"} />
      ))}
      {fireflies.map(([x, y, delay], i) => (
        <motion.rect key={i} x={x} y={y} width={2} height={2} fill="#aaff44"
          animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay }} />
      ))}
      <rect x="96" y="128" width="30" height="3" fill="#4a2800" />
      <rect x="100" y="114" width="14" height="14" fill="#665533" />
      <rect x="99" y="106" width="16" height="10" fill="#886644" />
      <rect x="101" y="104" width="12" height="4" fill="#886644" />
      <rect x="101" y="108" width="4" height="4" fill="#ffcc00" />
      <rect x="108" y="108" width="4" height="4" fill="#ffcc00" />
      <rect x="103" y="109" width="2" height="2" fill="#111" />
      <rect x="110" y="109" width="2" height="2" fill="#111" />
      <rect x="105" y="113" width="4" height="2" fill="#cc8800" />
    </svg>
  );
}

function CityScene() {
  const buildings: [number, number, number, number, string][] = [
    [0,155,50,85,"#120820"],[48,122,42,118,"#1a0a2e"],[88,138,36,102,"#120820"],
    [122,98,58,142,"#1a0a2e"],[178,128,48,112,"#120820"],[224,108,42,132,"#1a0a2e"],
    [264,142,52,98,"#120820"],[314,122,46,118,"#1a0a2e"],
  ];
  const windows: [number, number, string, boolean][] = [
    [8,168,"#ffaa44",false],[18,168,"#44ccff",false],[8,182,"#ffaa44",true],
    [55,132,"#ffaa44",false],[66,148,"#44ccff",true],[55,164,"#ffaa44",false],
    [92,152,"#44ccff",false],[128,112,"#ffaa44",true],[142,130,"#44ccff",false],
    [130,150,"#ffaa44",false],[165,145,"#ffaa44",true],[196,158,"#44ccff",false],
    [228,122,"#ffaa44",false],[232,145,"#44ccff",true],[268,156,"#ffaa44",false],
    [275,172,"#44ccff",false],[318,136,"#ffaa44",true],[328,155,"#44ccff",false],
  ];
  return (
    <svg viewBox="0 0 360 240" width="100%" height="100%" style={{ imageRendering: "pixelated" }} shapeRendering="crispEdges" aria-hidden>
      <rect width="360" height="240" fill="#07020e" />
      {[[40,12],[90,8],[150,18],[200,5],[240,15],[285,22],[320,9],[350,18],[60,30],[130,28],[220,32],[305,26]].map(([x,y],i) => (
        <motion.rect key={i} x={x} y={y} width={2} height={2} fill="#ccbbee"
          animate={{ opacity: [0.15, 0.9, 0.15] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }} />
      ))}
      {[[8,8,12],[4,6,20],[2,5,24],[2,8,24],[4,14,20],[6,20,16],[8,24,10]].map(([x,y,w],i) => (
        <rect key={i} x={x} y={y} width={w} height={3} fill="#d4c8e8" />
      ))}
      {buildings.map(([x,y,w,h,col],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={col} />
      ))}
      {windows.map(([x,y,col,anim],i) => anim ? (
        <motion.rect key={i} x={x} y={y} width={3} height={4} fill={col}
          animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 2.5 + i * 0.35, repeat: Infinity, delay: i * 0.4 }} />
      ) : (
        <rect key={i} x={x} y={y} width={3} height={4} fill={col} />
      ))}
      <rect x="177" y="38" width="6" height="153" fill="#1e0e30" />
      {[52,72,92,112].map((y,i) => (
        <rect key={i} x={177 - 8 - i * 2} y={y} width={22 + i * 4} height={2} fill="#1e0e30" />
      ))}
      <motion.rect x="179" y="34" width="4" height="4" fill="#ff2200"
        animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      {[0, 0.5, 1.0].map((delay, i) => (
        <motion.circle key={i} cx={180} cy={36} r={8} fill="none" stroke="#cc44ff" strokeWidth={1.5}
          animate={{ r: [4, 36], opacity: [0.9, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay, ease: "easeOut" }} />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════

// ─── TERMINAL WIDGET ──────────────────────────────────────────
// Fond : Matrix rain sur canvas (continu, ralenti en idle).
// Hover terminal : accélère la pluie + couleur rouge près du curseur.
// Hover ligne individuelle : translateX.

const TERMINAL_LINES = [
  { prompt: "$", text: "last deploy", dim: true },
  { prompt: ">", text: "portfolio v1", tag: "LIVE" },
  { prompt: "$", text: "currently building", dim: true },
  { prompt: ">", text: "image search", tag: "WIP" },
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function TerminalWidget({ onKill }: { onKill?: () => void }) {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number[]>(TERMINAL_LINES.map(() => 0));
  const [typingDone, setTypingDone] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [killLine, setKillLine] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await delay(400);
      for (let li = 0; li < TERMINAL_LINES.length; li++) {
        if (cancelled) return;
        const text = TERMINAL_LINES[li].text;
        const speed = TERMINAL_LINES[li].dim ? 28 : 50;
        for (let ci = 1; ci <= text.length; ci++) {
          if (cancelled) return;
          await delay(speed);
          setRevealed((prev) => {
            const next = [...prev];
            next[li] = ci;
            return next;
          });
        }
        await delay(130);
      }
      if (!cancelled) setTypingDone(true);
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const currentTypingLine = !typingDone
    ? TERMINAL_LINES.findIndex((l, i) => revealed[i] < l.text.length)
    : -1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!typingDone) return;
    if (e.key === "Backspace") {
      setCurrentInput((v) => v.slice(0, -1));
    } else if (e.key === "Enter") {
      if (currentInput === "/kill") {
        setKillLine(true);
        setTimeout(() => onKill?.(), 800);
      }
      setCurrentInput("");
    } else if (e.key.length === 1) {
      setCurrentInput((v) => v + e.key);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="overflow-hidden rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-xs outline-none"
      onClick={() => containerRef.current?.focus()}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseLeave={() => setActiveLine(null)}
    >
      <div>
        {/* Header macOS dots */}
        <div className="mb-3 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <span className="ml-2 text-[10px] text-zinc-500">quentin@portfolio ~ zsh</span>
        </div>

        {TERMINAL_LINES.map((line, i) => (
          <div
            key={i}
            className="flex cursor-default items-center gap-2 py-[3px]"
            style={{
              transform:  activeLine === i ? "translateX(6px)" : "translateX(0)",
              opacity:    line.dim ? (activeLine === i ? 0.7 : 0.35) : 1,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
            onMouseEnter={() => setActiveLine(i)}
            onMouseLeave={() => setActiveLine(null)}
          >
            <span style={{ color: activeLine === i ? "#ffffff" : "#52525b" }}>{line.prompt}</span>
            <span
              className="text-zinc-300"
              style={
                !line.dim && activeLine === i
                  ? { textShadow: "0 0 10px rgba(255,255,255,0.55)", color: "#ffffff" }
                  : undefined
              }
            >
              {line.text.slice(0, revealed[i])}
              {currentTypingLine === i && (
                <span className="animate-pulse opacity-60">▍</span>
              )}
            </span>
            {revealed[i] >= line.text.length && line.tag && (
              <span
                className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  backgroundColor: line.tag === "WIP" ? "rgba(255,255,255,0.08)" : "rgba(74,222,128,0.12)",
                  color:           line.tag === "WIP" ? "#ffffff"              : "#4ade80",
                }}
              >
                {line.tag}
              </span>
            )}
          </div>
        ))}

        {killLine && (
          <div className="mt-1 flex items-center gap-2 py-[3px]">
            <span style={{ color: "#ffffff" }}>!</span>
            <span className="text-xs font-semibold tracking-widest" style={{ color: "#ffffff" }}>SYSTEM TERMINATED</span>
          </div>
        )}

        <div
          className="mt-2 flex items-center gap-2"
          style={{ opacity: typingDone && !killLine ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          <span style={{ color: "#ffffff" }}>$</span>
          <span className="text-zinc-300">{currentInput}</span>
          <span
            className={focused ? "animate-pulse text-zinc-400" : "text-zinc-700"}
          >█</span>
        </div>
      </div>
    </div>
  );
}

// ─── STAT BAR ─────────────────────────────────────────────────
// ─── HERO ─────────────────────────────────────────────────────
function HeroCard({ onKill }: { onKill?: () => void }) {
  const [cmdInput, setCmdInput] = useState("");
  const [cmdFocused, setCmdFocused] = useState(false);
  const [killLine, setKillLine] = useState(false);
  const cmdRef = useRef<HTMLDivElement>(null);

  const handleCmdKey = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace") { setCmdInput(v => v.slice(0, -1)); return; }
    if (e.key === "Enter") {
      if (cmdInput === "/kill") { setKillLine(true); setTimeout(() => onKill?.(), 800); }
      setCmdInput("");
      return;
    }
    if (e.key.length === 1) setCmdInput(v => v + e.key);
  };

  const MISSIONS = [
    { name: "portfolio-v1",  status: "DEPLOYED", live: true  },
    { name: "image-search",  status: "WIP",       live: false },
  ];

  return (
    <BentoCard className="col-span-12 flex flex-col md:col-span-4 md:row-span-3 md:h-full">
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
        <HeroScene />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(to top, rgba(2,2,14,0.98) 35%, rgba(2,2,14,0.85) 60%, rgba(2,2,14,0.45) 80%, transparent 100%)" }} />

      <div className="relative flex flex-col flex-1" style={{ zIndex: 2 }}>

        {/* ── Header */}
        <div className="flex items-center justify-between">
          <SectionLabel text="AI · CYBERSECURITY" />
          <div className="mb-3 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-green-400">Available</span>
          </div>
        </div>

        {/* ── Identity */}
        <div className="mt-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500">Courtade</p>
          <h1 className="font-mono text-[38px] font-black uppercase leading-none tracking-tight text-white">
            Quentin<motion.span
              className="text-white/30"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >_</motion.span>
          </h1>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400">Full Stack · AI · Sec · Editing</p>
          <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Bordeaux · Remote
          </div>
        </div>

        {/* ── Description */}
        <p className="mt-5 text-[15px] leading-relaxed text-zinc-300">
          I build AI tools and secure systems for real-world use.
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Useful. Reliable. Built clean.
        </p>

        {/* ── Active Missions + easter egg pinned to bottom */}
        <div className="mt-auto">
        {/* ── Divider */}
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Active Missions</span>
          <div className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* ── Missions */}
        <div className="flex flex-col gap-2 mb-3">
          {MISSIONS.map(m => (
            <div key={m.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span style={{ color: "rgba(255,255,255,0.25)" }}>▸</span>
                <span className="text-zinc-300">{m.name}</span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5" style={{
                backgroundColor: m.live ? "rgba(74,222,128,0.10)" : "rgba(239,68,68,0.10)",
                color: m.live ? "#4ade80" : "#ef4444",
                border: `1px solid ${m.live ? "rgba(74,222,128,0.20)" : "rgba(239,68,68,0.25)"}`,
              }}>{m.status}</span>
            </div>
          ))}
        </div>

        {/* ── Hidden /kill easter egg at bottom */}
        <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {killLine && (
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white">! system terminated</p>
          )}
          <div
            ref={cmdRef} tabIndex={0}
            className="flex cursor-text items-center gap-1.5 font-mono text-[10px] outline-none"
            onClick={() => cmdRef.current?.focus()}
            onKeyDown={handleCmdKey}
            onFocus={() => setCmdFocused(true)}
            onBlur={() => setCmdFocused(false)}
          >
            <span className="text-zinc-700">›</span>
            <span className="text-zinc-500">{cmdInput}</span>
            <span className={cmdFocused ? "animate-pulse text-zinc-500" : "opacity-0"}>▍</span>
          </div>
        </div>
        </div>{/* end mt-auto */}

      </div>
    </BentoCard>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────
function ContactCard() {
  const [hovered, setHovered] = useState(false);
  const borderControls = useAnimation();

  const handleHoverStart = async () => {
    setHovered(true);
    await borderControls.start({
      boxShadow: "0 0 0 1.5px rgba(255,255,255,0.65), 0 0 24px rgba(255,255,255,0.10)",
      transition: { duration: 0.12 },
    });
    borderControls.start({
      boxShadow: "0 0 0 1px rgba(255,255,255,0.15), 0 0 0px rgba(255,255,255,0)",
      transition: { duration: 0.88 },
    });
  };

  return (
    <BentoCard className="col-span-12 relative flex flex-col gap-4 overflow-hidden md:col-span-4">
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
        <CityScene />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(to top, rgba(7,2,14,0.98) 40%, rgba(7,2,14,0.93) 65%, rgba(7,2,14,0.88) 85%, rgba(7,2,14,0.85) 100%)" }} />
      <div className="relative flex flex-col flex-1 gap-4" style={{ zIndex: 2 }}>
      {/* SVG de fond — enveloppe discrète, coin bas-droit */}
      <svg
        className="pointer-events-none absolute -bottom-6 -right-6 opacity-[0.04]"
        width="160" height="160" viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden
      >
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>

      <SectionLabel text="Contact" />
      <div>
        <p className="text-xl font-semibold leading-snug text-white">
          Open to the right<br />opportunity<span style={{ color: "#ffffff" }}>.</span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          Editing, dev, or something in between — if the project is interesting, I&apos;m in.
        </p>
      </div>
      <motion.a
        href="mailto:quentincourtade33@gmail.com"
        className="relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-4 py-3.5 text-sm font-medium"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "#ffffff",
        }}
        animate={borderControls}
        onHoverStart={handleHoverStart}
        onHoverEnd={() => setHovered(false)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <span className="relative flex-1 overflow-hidden" style={{ height: "1.25rem" }}>
          <AnimatePresence mode="wait" initial={false}>
            {hovered ? (
              <motion.span
                key="email"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 flex items-center whitespace-nowrap text-xs"
              >
                quentincourtade33@gmail.com
              </motion.span>
            ) : (
              <motion.span
                key="label"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 flex items-center"
              >
                Let&apos;s talk
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.a>
      </div>
    </BentoCard>
  );
}

// ─── YOUTUBE TEASER ───────────────────────────────────────────
const parseSubs = (s: string) => parseFloat(s) * (s.includes("M") ? 1_000_000 : s.includes("K") ? 1_000 : 1);

function FlashBorder({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const boxShadow = useMotionValue("none");

  const handleHoverStart = async () => {
    animateEl(x, [0, 1.5, 0], { duration: 0.35, ease: "easeOut" });
    await animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0.30), 0 0 18px rgba(255,255,255,0.06)", { duration: 0.15 });
    animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)", { duration: 0.85 });
  };

  return (
    <motion.div style={{ x, boxShadow }} className="bento-card rounded-2xl p-5 cursor-pointer relative" onHoverStart={handleHoverStart}>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
        <StageScene />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(to top, rgba(16,5,0,0.98) 35%, rgba(16,5,0,0.90) 60%, rgba(16,5,0,0.55) 85%, transparent 100%)" }} />
      <div className="relative" style={{ zIndex: 2 }}>
        {children}
      </div>
    </motion.div>
  );
}

function Sparkline({ start, current, id }: { start: number; current: number; id: string }) {
  const W = 100;
  const H = 32;
  const ratio = start / current;
  const startY = ratio * H;
  const path = `M 0,${startY} C ${W * 0.4},${startY} ${W * 0.6},0 ${W},0`;
  const area = `M 0,${startY} C ${W * 0.4},${startY} ${W * 0.6},0 ${W},0 L ${W},${H} L 0,${H} Z`;
  const gradId = `sg-${id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.7" strokeLinecap="round" />
      <circle cx={W} cy={0} r="2.5" fill="#4ade80" opacity="0.9" />
    </svg>
  );
}

function YoutubeTeaserCard() {
  const seeAllControls = useAnimation();

  const handleSeeAllHover = async () => {
    await seeAllControls.start({
      boxShadow: "0 0 0 1.5px rgba(255,255,255,0.65), 0 0 24px rgba(255,255,255,0.10)",
      transition: { duration: 0.12 },
    });
    seeAllControls.start({
      boxShadow: "0 0 0 1px rgba(255,255,255,0.15), 0 0 0px rgba(255,255,255,0)",
      transition: { duration: 0.88 },
    });
  };

  return (
    <motion.div
      variants={card}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className="col-span-12 md:col-span-8"
    >
      <Link href="/clients" className="block">
        <FlashBorder>
          <div className="flex items-center justify-between mb-5">
            <div>
              <SectionLabel text="YouTube Clients" />
              <p className="text-lg font-semibold text-white">YouTube Growth Editing</p>
              <p className="text-sm text-zinc-400 mt-1">
                3 channels supported across editing, growth and creative direction
              </p>
            </div>
            <motion.div
              className="group flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium"
              style={{
                borderColor: "rgba(255,255,255,0.15)",
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#ffffff",
              }}
              animate={seeAllControls}
              onHoverStart={handleSeeAllHover}
            >
              <span>See all</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {CHANNELS.map((channel) => {
              const start = parseSubs(channel.subsStart);
              const current = parseSubs(channel.subsCurrent);
              return (
                <div
                  key={channel.id}
                  className="flex flex-col gap-2 rounded-xl bg-white/3 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{channel.name}</p>
                      <p className="text-xs text-zinc-500">{channel.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{channel.subsCurrent}</p>
                      <p className="text-xs font-medium" style={{ color: "#4ade80" }}>
                        {channel.growth}
                      </p>
                    </div>
                  </div>
                  <Sparkline start={start} current={current} id={channel.id} />
                </div>
              );
            })}
          </div>
        </FlashBorder>
      </Link>
    </motion.div>
  );
}

// ─── GITHUB CARD ──────────────────────────────────────────────
// Fetch les repos publics via l'API GitHub (pas de clé API nécessaire,
// limite de 60 req/h par IP — largement suffisant pour un portfolio).
// Affiche un carousel : < > pour naviguer, dots pour la position.
// Chaque repo : nom cliquable, étoiles, description, langage.

type Repo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
};

function GitHubCard() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next

  useEffect(() => {
    const CACHE_KEY = "gh_repos_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) {
            setRepos(data);
            setLoading(false);
            return;
          }
        }
      } catch { /* localStorage indisponible ou JSON invalide */ }

      try {
        const r = await fetch("https://api.github.com/users/quentiinct/repos?sort=updated&per_page=20");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: Repo[] = await r.json();
        const filtered = data
          .filter((repo) => !("fork" in repo && (repo as unknown as { fork: boolean }).fork))
          .sort((a, b) => b.stargazers_count - a.stargazers_count);
        setRepos(filtered);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: filtered })); } catch { /* quota */ }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [retryKey]);

  const prev = () => {
    setDirection(-1);
    setIndex((i) => (i - 1 + repos.length) % repos.length);
  };
  const next = () => {
    setDirection(1);
    setIndex((i) => (i + 1) % repos.length);
  };

  const repo = repos[index];

  // Variants pour le slide du carousel
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2 } }),
  };

  return (
    <BentoCard className="col-span-12 flex flex-col gap-4 md:col-span-4">
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
        <ForestScene />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(to top, rgba(5,15,5,0.98) 35%, rgba(5,15,5,0.93) 60%, rgba(5,15,5,0.88) 80%, rgba(5,15,5,0.85) 100%)" }} />
      <div className="relative flex flex-col flex-1 gap-4" style={{ zIndex: 2 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Icône GitHub SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <p className="text-sm font-semibold text-white">GitHub Projects</p>
        </div>

        {/* Boutons navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            disabled={repos.length === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-30"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={next}
            disabled={repos.length === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-30"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-white/5" />
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-4/5 rounded bg-white/5" />
            <div className="mt-1 flex gap-1.5">
              <div className="h-5 w-14 rounded-full bg-white/5" />
              <div className="h-5 w-16 rounded-full bg-white/5" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-zinc-500">GitHub API unavailable.</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Retry
            </button>
          </div>
        ) : repos.length === 0 ? (
          <p className="text-xs text-zinc-600">No repos found.</p>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={repo.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-2"
            >
              {/* Nom + étoiles */}
              <div className="flex items-center justify-between gap-2">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white hover:underline truncate"
                >
                  {repo.name}
                </a>
                {repo.stargazers_count > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {repo.stargazers_count}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed text-zinc-400 line-clamp-2">
                {repo.description ?? "Pas de description."}
              </p>

              {/* Langage + topics */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {repo.language && (
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-zinc-400">
                    {repo.language}
                  </span>
                )}
                {repo.topics.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full border border-white/8 px-2.5 py-0.5 text-[11px] text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Dots de pagination */}
      {repos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {repos.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === index ? "20px" : "6px",
                backgroundColor: i === index ? "#ffffff" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      )}

      {/* Lien vers le profil */}
      <a
        href="https://github.com/quentiinct"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        github.com/quentiinct
      </a>
      </div>
    </BentoCard>
  );
}

// ─── WIP CARD ─────────────────────────────────────────────────

// Bande coulissante — backgroundPositionX animé en JS, sans reset CSS
// Gradient period = 14px (dernier stop), X-period = 14 / sin(110°) ≈ 14.90px
const STRIPE_PERIOD = 14 / Math.sin(110 * Math.PI / 180);

function AnimatedStripe({ dir, bg }: { dir: -1 | 1; bg: string }) {
  const pos = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    let v = pos.get() + dir * 40 * (delta / 1000);
    if (dir === -1) { if (v <= -STRIPE_PERIOD) v += STRIPE_PERIOD; }
    else            { if (v >=  STRIPE_PERIOD) v -= STRIPE_PERIOD; }
    pos.set(v);
  });
  const backgroundPositionX = useTransform(pos, v => `${v}px`);
  return <motion.div style={{ position: "absolute", inset: 0, backgroundImage: bg, backgroundPositionX }} />;
}

type WorkerVariant = { hat: string; vest: string; pants: string };

const WORKER_VARIANTS: WorkerVariant[] = [
  { hat: "#f59e0b", vest: "#f97316", pants: "#2563eb" },  // casque jaune, gilet orange, bleu
  { hat: "#e2e8f0", vest: "#eab308", pants: "#7c2d12" },  // casque blanc, gilet jaune, marron
  { hat: "#f97316", vest: "#16a34a", pants: "#171717" },  // casque orange, gilet vert, noir
  { hat: "#ef4444", vest: "#7c3aed", pants: "#1e3a5f" },  // casque rouge, gilet violet, marine
];

function PixelWorker({ variant, duration, delay }: { variant: WorkerVariant; duration: number; delay: number }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => 1 - f), 260);
    return () => clearInterval(id);
  }, []);

  const P = 2;
  const C: Record<string, string | null> = {
    H: variant.hat, S: "#fcd34d", e: "#292524",
    V: variant.vest, P: variant.pants, b: "#1c1917", ".": null,
  };

  const FRAMES = [
    ["..HH...", ".HHHH..", ".SSSS..", ".SeS...", ".VVVV..", "VVVVVVV", ".VVVV..", "..PP...", ".P..P..", ".P..P..", "bb..bb."],
    ["..HH...", ".HHHH..", ".SSSS..", ".SeS...", ".VVVV..", "VVVVVVV", ".VVVV..", "..PP...", "..PP...", ".P..P..", ".bb.bb."],
  ];

  const rects: React.ReactNode[] = [];
  FRAMES[frame].forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const color = C[ch];
      if (color) rects.push(<rect key={`${r}-${c}`} x={c * P} y={r * P} width={P} height={P} fill={color} />);
    })
  );

  return (
    <div style={{ position: "absolute", bottom: 8, left: 0, animation: `walk-worker ${duration}s linear ${delay}s infinite`, zIndex: 2 }}>
      <svg viewBox={`0 0 ${7 * P} ${11 * P}`} width={7 * P} height={11 * P} style={{ imageRendering: "pixelated", display: "block" }}>
        {rects}
      </svg>
    </div>
  );
}

function ConstructionScene() {
  const A = "#f59e0b";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Grue — coin droit */}
      <svg viewBox="0 0 60 82" width={54} height={74} aria-hidden
        style={{ position: "absolute", right: 6, bottom: 8, opacity: 0.18, imageRendering: "pixelated" }}>
        <rect x={27} y={14} width={4} height={60} fill={A} />
        <rect x={4} y={14} width={52} height={4} fill={A} />
        <line x1={29} y1={34} x2={46} y2={14} stroke={A} strokeWidth={2.5} />
        <rect x={0} y={18} width={10} height={6} fill={A} />
        <motion.g
          style={{ transformOrigin: "47px 18px" } as React.CSSProperties}
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity }}
        >
          <rect x={45} y={18} width={2} height={26} fill={A} />
          <rect x={41} y={44} width={8} height={3} fill={A} />
          <rect x={44} y={47} width={2} height={5} fill={A} />
        </motion.g>
        <rect x={22} y={74} width={14} height={4} fill={A} />
      </svg>

      {/* Tractopelle — coin gauche */}
      <svg viewBox="0 0 72 52" width={64} height={46} aria-hidden
        style={{ position: "absolute", left: 10, bottom: 8, opacity: 0.15, imageRendering: "pixelated" }}>
        <rect x={2} y={38} width={58} height={10} rx={3} fill={A} />
        <rect x={6} y={40} width={50} height={6} rx={2} fill="#1a1a1a" />
        <circle cx={14} cy={43} r={3} fill={A} />
        <circle cx={30} cy={43} r={3} fill={A} />
        <circle cx={46} cy={43} r={3} fill={A} />
        <rect x={6} y={22} width={48} height={18} rx={2} fill={A} />
        <rect x={12} y={10} width={26} height={14} rx={1} fill={A} />
        <rect x={16} y={13} width={10} height={8} fill="#1a1a1a" />
        <motion.g
          style={{ transformOrigin: "54px 22px" } as React.CSSProperties}
          animate={{ rotate: [-16, 2, -16] }}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        >
          <rect x={52} y={12} width={5} height={22} rx={1} fill={A} />
          <rect x={50} y={32} width={13} height={8} rx={1} fill={A} />
          <rect x={50} y={38} width={15} height={3} fill={A} />
        </motion.g>
      </svg>

      {/* Cônes */}
      <svg viewBox="0 0 14 18" width={11} height={14} aria-hidden
        style={{ position: "absolute", left: 88, bottom: 8, opacity: 0.22 }}>
        <polygon points="7,0 13,13 1,13" fill={A} />
        <rect x={0} y={13} width={14} height={4} rx={1} fill={A} />
      </svg>
      <svg viewBox="0 0 14 18" width={9} height={12} aria-hidden
        style={{ position: "absolute", right: 74, bottom: 8, opacity: 0.18 }}>
        <polygon points="7,0 13,13 1,13" fill={A} />
        <rect x={0} y={13} width={14} height={4} rx={1} fill={A} />
      </svg>

      {/* Ligne de sol */}
      <div style={{ position: "absolute", bottom: 7, left: 0, right: 0, height: 1, backgroundColor: A, opacity: 0.10 }} />
    </div>
  );
}

function WIPCard({ project }: { project: (typeof WIP_PROJECTS)[0] }) {
  const stripes = "repeating-linear-gradient(110deg, #f59e0b 0px, #f59e0b 6px, #1a1a1a 6px, #1a1a1a 14px)";
  const x = useMotionValue(0);
  const boxShadow = useMotionValue("none");

  const handleHoverStart = async () => {
    animateEl(x, [0, 1.5, 0], { duration: 0.35, ease: "easeOut" });
    await animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0.30), 0 0 18px rgba(255,255,255,0.06)", { duration: 0.15 });
    animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)", { duration: 0.85 });
  };

  return (
    <motion.div
      variants={card}
      className={`${project.colClass} bento-card overflow-hidden rounded-2xl flex flex-col`}
      style={{ x, boxShadow }}
      onHoverStart={handleHoverStart}
    >
      <div className="h-2.5 w-full shrink-0 overflow-hidden relative">
        <AnimatedStripe dir={-1} bg={stripes} />
      </div>

      <div
        className="relative flex flex-1 flex-col justify-between p-5 pb-10"
        style={{ backgroundColor: "rgba(245,158,11,0.025)" }}
      >
        <ConstructionScene />

        <PixelWorker variant={WORKER_VARIANTS[0]} duration={9}  delay={0}  />
        <PixelWorker variant={WORKER_VARIANTS[1]} duration={14} delay={-4} />
        <PixelWorker variant={WORKER_VARIANTS[2]} duration={11} delay={-8} />
        <PixelWorker variant={WORKER_VARIANTS[3]} duration={16} delay={-2} />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2">
            {project.icon}
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{project.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#f59e0b" }}>
              Under Construction
            </span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#f59e0b", animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {project.tags.map((tag) => <Tag key={tag} label={tag} />)}
        </div>
      </div>

      <div className="h-2.5 w-full shrink-0 overflow-hidden relative">
        <AnimatedStripe dir={1} bg={stripes} />
      </div>
    </motion.div>
  );
}

// ─── DUST EFFECT ──────────────────────────────────────────────
// Canvas de particules pixel — déclenché par /kill.
// 500 carrés colorés partent en vol depuis des positions aléatoires,
// montent puis retombent légèrement avant de s'estomper.

function DustEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string };
    const COLORS = ["#ffffff", "#ededed", "#a1a1aa", "#ffffff", "#71717a", "#52525b"];
    const particles: Particle[] = Array.from({ length: 500 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 5,
      vy: -(Math.random() * 4 + 0.5),
      size: [1, 1, 2, 2, 2, 3][Math.floor(Math.random() * 6)],
      opacity: Math.random() * 0.8 + 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.vx *= 0.98;
        p.opacity -= 0.006;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998 }} />;
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
//
// Grille 12 colonnes :
//   Col 1-4  (row 1-3) : HeroCard — colonne verticale gauche (row-span-3)
//   Col 5-12 (row 1)   : YoutubeTeaserCard (8 cols)
//   Col 5-8  (row 2)   : GitHubCard        (4 cols)
//   Col 9-12 (row 2)   : ContactCard       (4 cols)
//   Col 5-8  (row 3)   : Cyber WIP         (4 cols)
//   Col 9-12 (row 3)   : AI WIP            (4 cols)
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  const [killed, setKilled] = useState(false);
  const gridControls = useAnimation();

  useEffect(() => {
    gridControls.start("visible");
  }, [gridControls]);

  useEffect(() => {
    if (!killed) return;
    gridControls.start({
      opacity: 0,
      scale: 0.97,
      filter: "blur(12px)",
      y: -30,
      transition: { duration: 1.4, ease: [0.4, 0, 1, 1], delay: 0.5 },
    });
  }, [killed, gridControls]);

  return (
    <>
    <SpaceBackground />
    <div className="min-h-screen px-4 py-10 md:px-8 lg:px-12 lg:py-16">
      {killed && <DustEffect />}
      {killed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.6 }}
          className="fixed inset-0 z-9999 flex items-center justify-center font-mono text-[11px] tracking-[0.25em]"
          style={{ color: "#ffffff" }}
        >
          SYSTEM TERMINATED — refresh to restore
        </motion.p>
      )}
      <motion.div
        className="mx-auto grid max-w-6xl grid-cols-12 gap-4"
        variants={container}
        initial="hidden"
        animate={gridControls}
      >
        {/* Col gauche — s'étire sur 3 rangées */}
        <HeroCard onKill={() => setKilled(true)} />

        {/* Col droite — rangée 1 */}
        <YoutubeTeaserCard />

        {/* Col droite — rangée 2 */}
        <GitHubCard />
        <ContactCard />

        {/* Col droite — rangée 3 */}
        <WIPCard project={WIP_PROJECTS[0]} />
        <WIPCard project={WIP_PROJECTS[1]} />
      </motion.div>
    </div>
    </>
  );
}
