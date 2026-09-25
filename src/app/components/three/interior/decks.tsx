"use client";

import { useMemo, type ReactNode } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Floating, Screen, type DrawFn } from "./common";
import { AlertBeacon, Console, GitGraph, HoloShield, MemojiHologram, Monitor, ServerRack, Transmitter } from "./centerpieces";
import {
  CircuitBoard,
  CodeCube,
  Envelope,
  Gear,
  Headphones,
  HexNut,
  Keycard,
  Laptop,
  LiquidBlob,
  Microphone,
  Mug,
  Notebook,
  PaperPlane,
  Padlock,
  Pen,
  Polaroid,
  SatelliteDish,
  Tablet,
  UsbKey,
  Wrench,
} from "./props";
import { ROOM_H, WALL_A, deg, polar } from "../config";
import { fontFamily, roundRect } from "../textures";
import { cameraState } from "../CameraRig";
import { getRepos, LANGUAGE_COLORS } from "../../github";
import { CONTACT, MISSIONS, PROFILE, SECURITY } from "../../../data";

// ═══════════════════════════════════════════════════════════════
// THEMED DECKS — deck-local coordinates (y = 0 on the floor).
// Props are placed on the right half of each deck's camera view,
// the left half being covered by the HTML panel.
// ═══════════════════════════════════════════════════════════════

// Served through Next's image optimizer (WebP, 640 px) instead of the 1.6 MB PNG.
export const MEMOJI_URL = "/_next/image?url=%2Fmemoji%2Fframe-01.png&w=640&q=75";

/** Mount on a wall panel: local +Z faces the room centre. */
function OnWall({ angle, inset = 0, y = 0, children }: { angle: number; inset?: number; y?: number; children: ReactNode }) {
  return (
    <group position={polar(angle, WALL_A - inset, y)} rotation={[0, angle + Math.PI, 0]}>
      {children}
    </group>
  );
}

/** Camera reading positions (deck-local), used to turn screens and photos toward the viewer. */
const STATION: [number, number, number][] = [
  [-1.22, 1.7, -0.45],
  [-0.8, 1.7, 0.96],
  [-0.45, 1.7, -1.22],
  [-1.13, 1.7, -0.65],
];

const deckActive = (index: number) => () => {
  const t = cameraState.t;
  return t > index + 1.3 && t < index + 3.1;
};

// ─── Screen drawings ──────────────────────────────────────────

function terminalDraw(lines: { cmd: string; out: string }[]): DrawFn {
  return (ctx, w, h, time) => {
    ctx.fillStyle = "#04070b";
    ctx.fillRect(0, 0, w, h);
    const mono = fontFamily("mono");
    ctx.font = `600 17px ${mono}`;
    ctx.fillStyle = "#6b7684";
    ctx.fillText("quentin@qc-01 — zsh", 16, 26);
    ctx.fillStyle = "#1a212b";
    ctx.fillRect(0, 36, w, 1);
    const cycle = 16;
    const local = time % cycle;
    let chars = Math.floor(local * 26);
    let y = 64;
    ctx.font = `500 17px ${mono}`;
    for (const l of lines) {
      if (chars <= 0) break;
      const cmd = `$ ${l.cmd}`;
      const shown = cmd.slice(0, chars);
      ctx.fillStyle = "#e8edf3";
      ctx.fillText(shown, 16, y);
      chars -= cmd.length;
      y += 24;
      if (chars > 0) {
        ctx.fillStyle = "#39e58c";
        ctx.fillText(l.out, 16, y);
        chars -= 10;
        y += 32;
      }
    }
    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = "#39e58c";
      ctx.fillRect(16, y - 14, 10, 18);
    }
  };
}

const telemetryDraw: DrawFn = (ctx, w, h, time) => {
  ctx.fillStyle = "#05080d";
  ctx.fillRect(0, 0, w, h);
  const mono = fontFamily("mono");
  ctx.font = `600 16px ${mono}`;
  ctx.fillStyle = "#6b7684";
  ctx.fillText("CREW TELEMETRY", 16, 26);
  ctx.fillStyle = "#1a212b";
  ctx.fillRect(0, 36, w, 1);
  const bars = PROFILE.skills;
  bars.forEach((label, i) => {
    const y = 66 + i * 34;
    ctx.fillStyle = "#9aa6b4";
    ctx.font = `500 14px ${mono}`;
    ctx.fillText(label.toUpperCase(), 16, y);
    ctx.fillStyle = "#141b24";
    ctx.fillRect(170, y - 12, w - 190, 12);
    const v = 0.72 + 0.2 * Math.sin(time * 0.8 + i * 1.3);
    const g = ctx.createLinearGradient(170, 0, w - 20, 0);
    g.addColorStop(0, "#ffb45e");
    g.addColorStop(1, "#ff6a3d");
    ctx.fillStyle = g;
    ctx.fillRect(170, y - 12, (w - 190) * v, 12);
  });
  ctx.strokeStyle = "#5fd4ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < w - 32; x += 4) {
    const y = h - 40 + Math.sin(x * 0.05 + time * 3) * 10 * Math.sin(x * 0.013 + time);
    if (x === 0) ctx.moveTo(16 + x, y);
    else ctx.lineTo(16 + x, y);
  }
  ctx.stroke();
};

const whoamiCard = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, w, h);
  const mono = fontFamily("mono");
  const display = fontFamily("display");
  ctx.fillStyle = "#ffb45e";
  ctx.font = `700 18px ${mono}`;
  ctx.fillText("CREW MANIFEST · QC-01", 24, 40);
  ctx.fillStyle = "#f4f6f8";
  ctx.font = `800 52px ${display}`;
  ctx.fillText(PROFILE.firstName, 24, 112);
  ctx.fillStyle = "#b9c2cd";
  ctx.font = `500 22px ${mono}`;
  ctx.fillText(PROFILE.roles.join(" · "), 24, 150);
  ctx.fillStyle = "#39e58c";
  ctx.fillText(`● ${PROFILE.available ? "available" : "busy"}`, 24, 196);
  ctx.fillStyle = "#6b7684";
  ctx.fillText(PROFILE.location, 24, 232);
  MISSIONS.forEach((m, i) => {
    ctx.fillStyle = m.live ? "#39e58c" : "#ff5a4a";
    ctx.fillText(`▸ ${m.name} [${m.status}]`, 24, 280 + i * 30);
  });
};

const securityTerminal: DrawFn = (ctx, w, h, time) => {
  ctx.fillStyle = "#040806";
  ctx.fillRect(0, 0, w, h);
  const mono = fontFamily("mono");
  ctx.font = `500 15px ${mono}`;
  const lines = [
    "$ ./security --status",
    `> module: ${SECURITY.modules.join(" / ")}`,
    `> state: ${SECURITY.status.toLowerCase()}`,
    "$ tail -f /var/log/ids.log",
    "[OK] perimeter scan … clean",
    "[OK] firewall rules … loaded",
    "[..] write-ups … compiling",
  ];
  const shown = Math.min(lines.length, Math.floor((time % 12) * 1.1));
  lines.slice(0, shown).forEach((l, i) => {
    ctx.fillStyle = l.startsWith("$") ? "#d9e2ea" : l.includes("..") ? "#ffb45e" : "#3dffb5";
    ctx.fillText(l, 14, 30 + i * 24);
  });
};

function repoScreen(slot: number): DrawFn {
  return (ctx, w, h, time) => {
    const { repos, status } = getRepos();
    const repo = repos.length ? repos[(slot + Math.floor(time / 6)) % repos.length] : null;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8,16,30,0.78)";
    roundRect(ctx, 4, 4, w - 8, h - 8, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(77,157,255,0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
    const mono = fontFamily("mono");
    const display = fontFamily("display");
    ctx.fillStyle = "#4d9dff";
    ctx.font = `700 18px ${mono}`;
    ctx.fillText(`REPO ${String(slot + 1).padStart(2, "0")} · github.com/quentiinct`, 26, 44);
    if (!repo) {
      ctx.fillStyle = "#9fb3c8";
      ctx.font = `600 26px ${display}`;
      ctx.fillText(status === "error" ? "API offline" : "Fetching repositories…", 26, 110);
      return;
    }
    ctx.fillStyle = "#f4f7fb";
    ctx.font = `800 34px ${display}`;
    // Unbounded is wide: shorten by measure, not by character count.
    let name = repo.name;
    while (name.length > 4 && ctx.measureText(name).width > w - 60) name = name.slice(0, -1);
    ctx.fillText(name === repo.name ? name : `${name.slice(0, -1)}…`, 26, 104);
    ctx.fillStyle = "#a8b6c6";
    ctx.font = `400 20px ${mono}`;
    const desc = repo.description ?? "No description.";
    const words = desc.split(" ");
    let line = "";
    let y = 146;
    for (const word of words) {
      if (ctx.measureText(line + word).width > w - 60) {
        ctx.fillText(line, 26, y);
        line = "";
        y += 28;
        if (y > 206) break;
      }
      line += `${word} `;
    }
    if (y <= 206) ctx.fillText(line, 26, y);
    if (repo.language) {
      ctx.fillStyle = LANGUAGE_COLORS[repo.language] ?? "#8b949e";
      ctx.beginPath();
      ctx.arc(34, h - 38, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d4dde8";
      ctx.font = `600 20px ${mono}`;
      ctx.fillText(repo.language, 50, h - 31);
    }
    ctx.fillStyle = "#f1c24b";
    ctx.font = `600 20px ${mono}`;
    ctx.fillText(`★ ${repo.stargazers_count}`, w - 110, h - 31);
  };
}

const codeDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#0b1016";
  ctx.fillRect(0, 0, w, h);
  const mono = fontFamily("mono");
  ctx.font = `500 17px ${mono}`;
  const code: [string, string][] = [
    ["#c678dd", "export async function"],
    ["#61afef", "  launch(mission: Mission) {"],
    ["#abb2bf", "    const ship = await boot();"],
    ["#e5c07b", "    ship.deck('engineering')"],
    ["#98c379", "      .deploy('portfolio-v2');"],
    ["#abb2bf", "    return ship.status;"],
    ["#61afef", "  }"],
  ];
  code.forEach(([c, l], i) => {
    ctx.fillStyle = "#3b4452";
    ctx.fillText(String(i + 1).padStart(2, " "), 12, 40 + i * 30);
    ctx.fillStyle = c;
    ctx.fillText(l, 48, 40 + i * 30);
  });
};

const radarDraw: DrawFn = (ctx, w, h, time) => {
  ctx.fillStyle = "#020805";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.44;
  ctx.strokeStyle = "rgba(61,255,160,0.25)";
  ctx.lineWidth = 2;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx, cy - R);
  ctx.lineTo(cx, cy + R);
  ctx.stroke();
  const a = time * 1.6;
  const g = ctx.createConicGradient(a - 0.9, cx, cy);
  g.addColorStop(0, "rgba(61,255,160,0)");
  g.addColorStop(0.14, "rgba(61,255,160,0.45)");
  g.addColorStop(0.145, "rgba(61,255,160,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  const blips = [[0.4, 0.8], [-0.5, 0.3], [0.2, -0.6], [0.7, -0.2]];
  blips.forEach(([bx, by], i) => {
    const ang = Math.atan2(by, bx);
    const d = ((a - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    ctx.fillStyle = `rgba(120,255,190,${Math.max(0, 1 - d / 4)})`;
    ctx.beginPath();
    ctx.arc(cx + bx * R, cy + by * R, 7 - i, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#3dffa0";
  ctx.font = `600 16px ${fontFamily("mono")}`;
  ctx.fillText("UPLINK · READY", 14, 24);
};

const commsDraw: DrawFn = (ctx, w, h, time) => {
  ctx.fillStyle = "#0a0703";
  ctx.fillRect(0, 0, w, h);
  const mono = fontFamily("mono");
  ctx.font = `700 17px ${mono}`;
  ctx.fillStyle = "#ff8a3d";
  ctx.fillText("OPEN CHANNEL", 16, 30);
  ctx.font = `500 16px ${mono}`;
  ctx.fillStyle = "#e9dccd";
  ctx.fillText(`TO: ${CONTACT.email}`, 16, 62);
  ctx.fillStyle = "#9d8f80";
  ctx.fillText("FREQ 8.4 GHz · X-BAND", 16, 90);
  ctx.strokeStyle = "#ff8a3d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < w - 32; x += 3) {
    const y = h - 50 + Math.sin(x * 0.09 + time * 6) * 16 * Math.sin(x * 0.01 + time * 0.7);
    if (x === 0) ctx.moveTo(16 + x, y);
    else ctx.lineTo(16 + x, y);
  }
  ctx.stroke();
};

// ─── Deck 01 · about ──────────────────────────────────────────

export function AboutDeck() {
  const memoji = useTexture(MEMOJI_URL, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
  });
  const active = useMemo(() => deckActive(0), []);
  const term = useMemo(
    () =>
      terminalDraw([
        { cmd: "whoami", out: `${PROFILE.firstName.toLowerCase()} ${PROFILE.lastName.toLowerCase()} — ${PROFILE.roles.join(" · ").toLowerCase()}` },
        { cmd: "cat mission.txt", out: PROFILE.tagline.toLowerCase() },
        { cmd: "./status", out: `● available · ${PROFILE.location.toLowerCase()}` },
      ]),
    []
  );

  return (
    <group>
      <OnWall angle={deg(90)}>
        <Console>
          <group position={[-0.27, 1.42, 0.07]} rotation={[0, 0.14, 0]}>
            <Monitor>
              <Screen width={0.5} height={0.31} draw={term} fps={10} isActive={active} />
            </Monitor>
          </group>
          <group position={[0.27, 1.42, 0.07]} rotation={[0, -0.14, 0]}>
            <Monitor>
              <Screen width={0.5} height={0.31} draw={telemetryDraw} fps={6} isActive={active} />
            </Monitor>
          </group>
        </Console>
      </OnWall>

      <group position={[2.3, 0, 1.25]}>
        <MemojiHologram texture={memoji} />
      </group>

      <Floating position={[0.62, 1.8, 0.66]} seed={1} scale={2.3}>
        <Mug />
      </Floating>
      <Floating position={[0.8, 1.96, 0.46]} seed={2} amp={0.09} spin={0.1}>
        <LiquidBlob radius={0.034} />
      </Floating>
      <Floating position={[0.95, 2.05, 0.34]} seed={3} amp={0.11} spin={0.1}>
        <LiquidBlob radius={0.017} seed={3} />
      </Floating>
      <Floating position={[0.32, 1.42, 1.08]} seed={4} spin={0.5} scale={2.4}>
        <Pen />
      </Floating>
      <Floating position={[1.5, 2.32, 1.35]} seed={5} scale={2.1}>
        <Notebook />
      </Floating>
      <Floating position={[2.35, 1.15, 0.2]} seed={6} scale={2.2}>
        <Headphones />
      </Floating>
      <Floating position={[0.28, 2.08, 1.3]} seed={7} amp={0.07} spin={0.05}>
        <LiquidBlob radius={0.095} color="#cfe9ff" glassy seed={7} />
      </Floating>
      <Floating position={[1.3, 1.55, 1.95]} seed={8} scale={2.6} face={STATION[0]}>
        <Polaroid texture={memoji} />
      </Floating>
      <Floating position={[2.5, 2.3, 0.6]} seed={9} scale={1.9} face={STATION[0]}>
        <Tablet draw={whoamiCard} />
      </Floating>
    </group>
  );
}

// ─── Deck 02 · security ───────────────────────────────────────

export function SecurityDeck() {
  const active = useMemo(() => deckActive(1), []);
  return (
    <group>
      {[165, 180, 195, 210].map((a, i) => (
        <OnWall key={a} angle={deg(a)} inset={0.42}>
          <ServerRack seed={i + 3} />
        </OnWall>
      ))}
      <OnWall angle={deg(150)} inset={0.02} y={1.45}>
        <Monitor w={0.62} h={0.4}>
          <Screen width={0.62} height={0.4} draw={securityTerminal} fps={4} isActive={active} />
        </Monitor>
      </OnWall>

      <group position={[1.69, 0, -1.41]}>
        <HoloShield />
      </group>
      <group position={polar(deg(160), 2.2, ROOM_H)}>
        <AlertBeacon />
      </group>

      <Floating position={[0.68, 1.85, -0.4]} seed={11} scale={2.6}>
        <Padlock />
      </Floating>
      <Floating position={[0.55, 2.35, -1.74]} seed={12} scale={2.3}>
        <Padlock body="#aeb4bb" />
      </Floating>
      <Floating position={[0.72, 1.35, 0.04]} seed={13} scale={2.6}>
        <UsbKey />
      </Floating>
      <Floating position={[1.43, 2.3, -0.97]} seed={14} scale={2.6}>
        <UsbKey color="#1c1f24" />
      </Floating>
      <Floating position={[0.45, 1.55, -0.92]} seed={15} scale={2.6} face={STATION[1]}>
        <Keycard />
      </Floating>
      {[
        [1.0, 2.15, -0.35],
        [1.9, 1.05, -0.5],
        [1.2, 2.5, -2.3],
        [0.2, 1.25, -1.2],
      ].map((p, i) => (
        <Floating key={i} position={p as [number, number, number]} seed={20 + i} spin={0.6} scale={2.4}>
          <HexNut />
        </Floating>
      ))}
    </group>
  );
}

// ─── Deck 03 · projects ───────────────────────────────────────

export function ProjectsDeck() {
  const active = useMemo(() => deckActive(2), []);
  const screenA = useMemo(() => repoScreen(0), []);
  const screenB = useMemo(() => repoScreen(1), []);
  return (
    <group>
      <group position={[-0.21, 0, 2.25]}>
        <GitGraph />
      </group>

      <Floating position={polar(deg(10), 3.2, 1.95).toArray() as [number, number, number]} seed={31} amp={0.03} speed={0.3} face={STATION[2]}>
        <Screen width={1.25} height={0.72} draw={screenA} res={640} fps={2} intensity={1.2} isActive={active} />
      </Floating>
      <Floating position={polar(deg(338), 2.9, 1.5).toArray() as [number, number, number]} seed={32} amp={0.03} speed={0.3} face={STATION[2]}>
        <Screen width={1.05} height={0.6} draw={screenB} res={640} fps={2} intensity={1.2} isActive={active} />
      </Floating>

      <Floating position={[-0.52, 1.35, 1.05]} seed={33} scale={1.7} face={STATION[2]}>
        <Laptop draw={codeDraw} />
      </Floating>
      <Floating position={[-0.95, 2.0, 0.73]} seed={34} scale={2.3} spin={0.35}>
        <Gear />
      </Floating>
      <Floating position={[-1.06, 1.2, 1.91]} seed={35} scale={2.2} spin={0.4}>
        <Gear teeth={9} radius={0.04} color="#c49a4a" />
      </Floating>
      <Floating position={[0.48, 2.2, 0.99]} seed={36} scale={2.5} spin={0.3}>
        <Wrench />
      </Floating>
      <Floating position={[-0.3, 2.45, 2.3]} seed={37} scale={2.1}>
        <CodeCube label="</>" />
      </Floating>
      <Floating position={[-1.3, 1.55, 1.45]} seed={38} scale={2.0}>
        <CodeCube label="{ }" color="#b18cff" />
      </Floating>
      <Floating position={[0.9, 1.25, 2.0]} seed={39} scale={2.0}>
        <CodeCube label="TS" color="#3178c6" />
      </Floating>
      <Floating position={[-1.48, 2.25, 0.89]} seed={40} scale={2.4} spin={0.2}>
        <CircuitBoard />
      </Floating>
    </group>
  );
}

// ─── Deck 04 · contact ────────────────────────────────────────

export function ContactDeck() {
  const active = useMemo(() => deckActive(3), []);
  return (
    <group>
      <OnWall angle={deg(90)}>
        <Console>
          <group position={[-0.24, 1.44, 0.07]} rotation={[0, 0.12, 0]}>
            <Monitor w={0.42} h={0.36}>
              <Screen width={0.42} height={0.36} draw={radarDraw} fps={15} isActive={active} />
            </Monitor>
          </group>
          <group position={[0.26, 1.42, 0.07]} rotation={[0, -0.12, 0]}>
            <Monitor w={0.46} h={0.29}>
              <Screen width={0.46} height={0.29} draw={commsDraw} fps={12} isActive={active} />
            </Monitor>
          </group>
          <group position={[0.36, 0.95, 0.3]} rotation={[-0.5, -0.5, 0]}>
            <SatelliteDish radius={0.14} />
          </group>
        </Console>
      </OnWall>

      <group position={[1.41, 1.65, 1.69]} scale={1.5}>
        <Transmitter />
      </group>

      <Floating position={[-0.17, 1.8, 0.73]} seed={41} scale={1.8} spin={0.1}>
        <PaperPlane />
      </Floating>
      <Floating position={[0.52, 2.25, 2.18]} seed={42} scale={1.9} spin={0.12}>
        <PaperPlane />
      </Floating>
      <Floating position={[1.03, 1.25, 0.41]} seed={43} scale={1.7} spin={0.15}>
        <PaperPlane />
      </Floating>
      <Floating position={[-0.21, 2.15, 1.44]} seed={44} scale={2.2}>
        <Envelope />
      </Floating>
      <Floating position={[0.81, 1.35, 2.9]} seed={45} scale={2.3}>
        <Envelope />
      </Floating>
      <Floating position={[-0.47, 1.35, 1.07]} seed={46} scale={2.3}>
        <Microphone />
      </Floating>
      <Floating position={[2.0, 2.4, 0.75]} seed={47} scale={2.2} spin={0.4}>
        <Pen color="#8c2a1c" />
      </Floating>
    </group>
  );
}
