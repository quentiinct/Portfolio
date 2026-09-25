"use client";

import { motion, AnimatePresence, MotionConfig, useAnimation, useMotionValue, useReducedMotion, animate as animateEl } from "framer-motion";
import { createContext, useContext, useState, useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { CONTACT, GITHUB_USER, MISSIONS, PROFILE } from "../../data";
import { LANGUAGE_COLORS, loadRepos, useRepos } from "../github";

// ═══════════════════════════════════════════════════════════════
// BENTO CARDS — the cards from the live bento-grid site (hero,
// GitHub, contact), ported as-is with their 8-bit pixel scenes so
// they can be shown on the ship's decks.
// ═══════════════════════════════════════════════════════════════

/** False while the card's deck is off screen: its pixel scene stops ticking. */
export const SceneActiveContext = createContext(true);

/**
 * Looping opacity a → b → a for a pixel-scene sprite (.px-twinkle in globals.css).
 * CSS rather than JS: it pauses with the card ([data-idle]) and stops with
 * reduced motion, where the sprite rests at the midpoint.
 */
const tw = (a: number, b: number, duration: number, delay = 0) =>
  ({ "--a": a, "--b": b, "--d": `${duration}s`, "--delay": `${delay}s`, opacity: (a + b) / 2 }) as CSSProperties;

const GITHUB_PATH =
  "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z";

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

  // Reduced motion: framer drops the hover scale/wobble and keeps the border flash.
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        whileHover={{ scale: 1.012, transition: { duration: 0.25, ease: "easeOut" } }}
        className={`bento-card rounded-2xl p-5 relative ${className}`}
        style={{ x, boxShadow }}
        onHoverStart={handleHoverStart}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-faint font-medium">
      {text}
    </p>
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
  const active = useContext(SceneActiveContext);
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active || reduceMotion) return;
    const id = setInterval(() => setFrame(f => (f + 1) % 24), 120);
    return () => clearInterval(id);
  }, [active, reduceMotion]);
  return (
    <svg viewBox="0 0 360 240" width="100%" height="100%" style={{ imageRendering: "pixelated" }} shapeRendering="crispEdges" aria-hidden>
      {/* Deep space background */}
      <rect width="360" height="240" fill="#02020e" />
      {/* Stars */}
      {[[12,8,1],[45,15,1],[88,5,2],[130,20,1],[175,9,1],[220,14,2],[268,7,1],[305,18,1],[340,11,1],[25,30,1],[65,40,1],[112,28,1],[155,38,1],[200,25,1],[245,35,1],[290,22,1],[335,32,2],[8,50,1],[50,55,1],[95,48,1],[140,58,1],[185,45,1],[230,52,1],[275,42,1],[320,58,1],[350,48,1],[15,70,1],[75,65,1],[160,68,1],[235,62,1],[310,72,1]].map(([x,y,s],i) => (
        <rect key={i} x={x} y={y} width={s} height={s} fill={i%3===0?"#cce0ff":i%3===1?"#ffffff":"#aabbdd"}
          className="px-twinkle" style={tw(0.2, 0.9, 2.2+i*0.18, i*0.12)} />
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
      {[[36,30,20],[34,34,24],[32,38,24],[32,42,24],[34,46,22],[36,50,18],[39,54,12]].map(([x,w],row) => (
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
      <rect x={270+(frame*5)%62} y={155} width={3} height={3} fill="#44aaff"
        className="px-twinkle" style={tw(0.4, 1, 0.6)} />
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
        <rect key={i} x={x as number} y={y as number} width={8} height={2} fill={c as string}
          className="px-twinkle" style={tw(1, i===3?0.1:0.5, 1.2+i*0.4, i*0.3)} />
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
      <rect x={207} y={166} width={1} height={3} fill="#aaaacc"
        className="px-rise" style={{ "--b": 0.45, "--rise": "12px", "--d": "2.2s", opacity: 0.2 } as CSSProperties} />
      <rect x={210} y={166} width={1} height={3} fill="#aaaacc"
        className="px-rise" style={{ "--b": 0.35, "--rise": "8px", "--d": "2.2s", "--delay": "0.9s", opacity: 0.15 } as CSSProperties} />
      {/* Alert indicators - top right */}
      <rect x={336} y={22} width={6} height={4} fill="#ff4444" className="px-twinkle" style={tw(1, 0.1, 0.85)} />
      <rect x={326} y={22} width={6} height={4} fill="#ffcc44" className="px-twinkle" style={tw(0.1, 1, 1.25, 0.4)} />
      <rect x={316} y={22} width={6} height={4} fill="#44ff88" className="px-twinkle" style={tw(1, 0.2, 1.65, 0.9)} />
      {/* Satellite dish - left side */}
      <rect x="16" y="108" width="2" height="32" fill="#141832" />
      <rect x="12" y="106" width="10" height="2" fill="#141832" />
      <rect x="8" y="104" width="18" height="4" fill="#1c2040" />
      <rect x="12" y="100" width="10" height="4" fill="#1c2040" />
      <rect x={10} y={103} width={5} height={2} fill="#44aaff" className="px-twinkle" style={tw(0.3, 1, 1.8)} />
      {/* Global scan line */}
      <rect x="0" y={16+((frame*9)%192)} width="360" height="1" fill="rgba(80,120,255,0.02)" />
    </svg>
  );
}

function ForestScene({ fill = false }: { fill?: boolean }) {
  const fireflies: [number, number, number][] = [[105,130,0],[165,112,0.6],[228,145,1.2],[272,125,0.3],[142,155,0.9],[308,138,1.5]];
  return (
    <svg viewBox="0 0 360 240" width="100%" height="100%" preserveAspectRatio={fill ? "xMidYMax slice" : undefined} style={{ imageRendering: "pixelated" }} shapeRendering="crispEdges" aria-hidden>
      <rect width="360" height="240" fill="#050f05" />
      {[[30,10],[70,22],[120,8],[170,16],[220,5],[265,20],[300,12],[340,25],[50,30],[315,35]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={2} height={2} fill="#aaccaa" className="px-twinkle" style={tw(0.1, 0.9, 2.5 + i * 0.3, i * 0.25)} />
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
        <rect key={i} x={x} y={y} width={2} height={2} fill="#aaff44" className="px-twinkle" style={tw(0, 1, 1.8, delay)} />
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
        <rect key={i} x={x} y={y} width={2} height={2} fill="#ccbbee" className="px-twinkle" style={tw(0.15, 0.9, 2 + i * 0.3, i * 0.2)} />
      ))}
      {[[8,8,12],[4,6,20],[2,5,24],[2,8,24],[4,14,20],[6,20,16],[8,24,10]].map(([x,y,w],i) => (
        <rect key={i} x={x} y={y} width={w} height={3} fill="#d4c8e8" />
      ))}
      {buildings.map(([x,y,w,h,col],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={col} />
      ))}
      {windows.map(([x,y,col,anim],i) => anim ? (
        <rect key={i} x={x} y={y} width={3} height={4} fill={col} className="px-twinkle" style={tw(1, 0.15, 2.5 + i * 0.35, i * 0.4)} />
      ) : (
        <rect key={i} x={x} y={y} width={3} height={4} fill={col} />
      ))}
      <rect x="177" y="38" width="6" height="153" fill="#1e0e30" />
      {[52,72,92,112].map((y,i) => (
        <rect key={i} x={177 - 8 - i * 2} y={y} width={22 + i * 4} height={2} fill="#1e0e30" />
      ))}
      <rect x="179" y="34" width="4" height="4" fill="#ff2200" className="px-twinkle" style={tw(1, 0, 1)} />
      {/* Radio pulse: r 4 → 36 as a scale, with a stroke that doesn't scale. */}
      {[0, 0.5, 1.0].map((delay, i) => (
        <circle key={i} cx={180} cy={36} r={4} fill="none" stroke="#cc44ff" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
          className="px-ping" style={{ "--delay": `${delay}s`, opacity: 0.5 } as CSSProperties} />
      ))}
    </svg>
  );
}


// ─── HERO ─────────────────────────────────────────────────────
export function HeroCard({ onKill }: { onKill?: () => void }) {
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

  return (
    <BentoCard className="h-full flex flex-col">
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
        <HeroScene />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(to top, rgba(2,2,14,0.98) 35%, rgba(2,2,14,0.85) 60%, rgba(2,2,14,0.45) 80%, transparent 100%)" }} />

      <div className="relative flex flex-col flex-1" style={{ zIndex: 2 }}>

        {/* ── Header */}
        <div className="flex items-center justify-between">
          <SectionLabel text="AI · CYBERSECURITY" />
          {PROFILE.available && (
            <div className="mb-3 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-good opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-good" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-good">Available</span>
            </div>
          )}
        </div>

        {/* ── Identity */}
        <div className="mt-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-faint">{PROFILE.lastName}</p>
          <h2 className="font-mono text-[38px] font-black uppercase leading-none tracking-tight text-white">
            {PROFILE.firstName}
            <span className="text-white/30 px-twinkle" style={tw(0.3, 0.8, 2.5)} aria-hidden>_</span>
          </h2>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">{PROFILE.roles.join(" · ")}</p>
          <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-faint">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {PROFILE.location}
          </div>
        </div>

        {/* ── Description */}
        <p className="mt-5 text-[15px] leading-relaxed text-soft">
          {PROFILE.tagline}
        </p>
        <p className="mt-1 text-sm text-soft">
          {PROFILE.motto}
        </p>

        {/* ── Active Missions + easter egg pinned to bottom */}
        <div className="mt-auto">
        {/* ── Divider */}
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-faint">Active Missions</h3>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* ── Missions */}
        <ul className="flex flex-col gap-2 mb-3">
          {MISSIONS.map(m => (
            <li key={m.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span style={{ color: "rgba(255,255,255,0.25)" }} aria-hidden>▸</span>
                <span className="text-soft">{m.name}</span>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wider px-1.5 py-0.5" style={{
                backgroundColor: m.live ? "rgba(61,220,132,0.10)" : "rgba(239,68,68,0.10)",
                color: m.live ? "var(--good)" : "#ef4444",
                border: `1px solid ${m.live ? "rgba(61,220,132,0.20)" : "rgba(239,68,68,0.25)"}`,
              }}>{m.status}</span>
            </li>
          ))}
        </ul>

        {/* ── Hidden /kill easter egg at bottom */}
        <div className="border-t border-white/5 pt-3">
          {killLine && (
            <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white" role="status">! system terminated</p>
          )}
          <div
            ref={cmdRef} tabIndex={0} role="textbox" aria-label="Command prompt"
            className="flex cursor-text items-center gap-1.5 rounded-sm font-mono text-[11px]"
            onClick={() => cmdRef.current?.focus()}
            onKeyDown={handleCmdKey}
            onFocus={() => setCmdFocused(true)}
            onBlur={() => setCmdFocused(false)}
          >
            <span className="text-faint" aria-hidden>›</span>
            <span className="text-muted">{cmdInput}</span>
            <span className={cmdFocused ? "animate-pulse text-muted" : "opacity-0"} aria-hidden>▍</span>
          </div>
        </div>
        </div>{/* end mt-auto */}

      </div>
    </BentoCard>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────
export function ContactCard() {
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
    <BentoCard className="relative flex flex-col gap-4 overflow-hidden">
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
        <h2 className="text-xl font-semibold leading-snug text-white">
          Open to the right<br />opportunity<span style={{ color: "#ffffff" }}>.</span>
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {CONTACT.text}
        </p>
      </div>
      {/* Hover or keyboard focus reveals the address; the accessible name always carries it. */}
      <motion.a
        href={`mailto:${CONTACT.email}`}
        aria-label={`Let's talk: email ${CONTACT.email}`}
        className="relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-4 py-3.5 text-sm font-medium"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "#ffffff",
        }}
        animate={borderControls}
        onHoverStart={handleHoverStart}
        onHoverEnd={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
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
                {CONTACT.email}
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

// ─── GITHUB CARD ──────────────────────────────────────────────
// Public repos from the GitHub API (no key, 60 req/h per IP), as a list:
// each row links to the repo with its stars, description and language.

export function GitHubCard() {
  // Same repos as the 3D screens of the engineering deck (shared store, one API call, 5 min cache).
  const { status, repos, error } = useRepos();
  const loading = repos.length === 0 && (status === "idle" || status === "loading");
  const failed = status === "error" && repos.length === 0;
  const list = repos.slice(0, 6);

  useEffect(() => {
    loadRepos();
  }, []);

  return (
    <BentoCard className="flex flex-col gap-4">
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
        <ForestScene fill />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(to top, rgba(5,15,5,0.9) 12%, rgba(5,15,5,0.72) 45%, rgba(5,15,5,0.6) 100%)" }} />
      <div className="relative flex flex-col flex-1 gap-4" style={{ zIndex: 2 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-muted" aria-hidden>
            <path d={GITHUB_PATH} />
          </svg>
          <h2 className="text-sm font-semibold text-white">GitHub Projects</h2>
        </div>
        {repos.length > 0 && (
          <span className="font-mono text-[11px] uppercase tracking-widest text-faint">
            {repos.length} {repos.length === 1 ? "repo" : "repos"}
          </span>
        )}
      </div>

      {/* Project list */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <span className="sr-only">Loading repositories…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl bg-white/3 px-3.5 py-3" aria-hidden>
                <div className="h-4 w-1/2 rounded bg-white/5" />
                <div className="h-3 w-4/5 rounded bg-white/5" />
                <div className="h-4 w-16 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted">
              {error === "rate"
                ? "GitHub's hourly limit for anonymous visits is reached. Try again in a few minutes."
                : "Couldn't load the repositories from GitHub."}
            </p>
            <button
              type="button"
              onClick={() => loadRepos(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/8 px-3.5 text-xs text-muted transition-colors hover:border-white/20 hover:text-foreground"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Retry
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-xs text-muted">No public repositories yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((repo, i) => (
              <motion.li
                key={repo.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
              >
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1.5 rounded-xl border border-white/8 bg-black/45 px-3.5 py-3 transition-colors duration-200 hover:border-white/20 hover:bg-black/30"
                >
                  {/* Name + stars */}
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{repo.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                      {repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1" aria-hidden>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {repo.stargazers_count}
                          <span className="sr-only">{repo.stargazers_count === 1 ? " star" : " stars"}</span>
                        </span>
                      )}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-faint transition-colors group-hover:text-soft" aria-hidden>
                        <path d="M7 17 17 7M8 7h9v9" />
                      </svg>
                      <span className="sr-only">(opens GitHub in a new tab)</span>
                    </span>
                  </span>

                  {/* Description */}
                  <span className="line-clamp-1 text-xs leading-relaxed text-muted">
                    {repo.description ?? "No description yet."}
                  </span>

                  {/* Language + topics */}
                  {(repo.language || repo.topics.length > 0) && (
                    <span className="flex flex-wrap gap-1.5">
                      {repo.language && (
                        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-muted">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[repo.language] ?? "#8b949e" }} aria-hidden />
                          {repo.language}
                        </span>
                      )}
                      {repo.topics.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-full border border-white/8 px-2.5 py-0.5 text-[11px] text-faint">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </a>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Profile link */}
      <a
        href={`https://github.com/${GITHUB_USER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="-my-3 flex self-start items-center gap-1.5 py-3 text-xs text-faint hover:text-soft transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d={GITHUB_PATH} />
        </svg>
        github.com/{GITHUB_USER}
      </a>
      </div>
    </BentoCard>
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


// ─── /KILL ────────────────────────────────────────────────────
// Typing /kill in the hero card's hidden prompt terminates the whole
// ship: dust burst, then the scene and the UI fade out.

let killed = false;
const killListeners = new Set<() => void>();

export function killSystem() {
  if (killed) return;
  killed = true;
  document.body.classList.add("system-killed");
  killListeners.forEach((l) => l());
}

const subscribeKill = (l: () => void) => {
  killListeners.add(l);
  return () => {
    killListeners.delete(l);
  };
};

export function KillOverlay() {
  const isKilled = useSyncExternalStore(subscribeKill, () => killed, () => false);
  if (!isKilled) return null;
  return (
    <>
      <DustEffect />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.6 }}
        className="fixed inset-0 z-9999 flex items-center justify-center font-mono text-[11px] tracking-[0.25em]"
        style={{ color: "#ffffff" }}
      >
        SYSTEM TERMINATED — refresh to restore
      </motion.p>
    </>
  );
}
