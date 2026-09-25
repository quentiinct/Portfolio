import * as THREE from "three";
import { mulberry32 } from "./config";

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL CANVAS TEXTURES — panels, floors, labels, decals.
// Generated once at startup (no image downloads), cached by key.
// ═══════════════════════════════════════════════════════════════

const cache = new Map<string, THREE.Texture>();

/** The page fonts (next/font variables): IBM Plex Mono for text, Unbounded for names and signs. */
export function fontFamily(kind: "mono" | "display") {
  if (typeof window === "undefined") return "monospace";
  // The next/font variables are set on <html> (see layout.tsx).
  const v = getComputedStyle(document.documentElement).getPropertyValue(kind === "mono" ? "--font-plex-mono" : "--font-unbounded").trim();
  return v || (kind === "mono" ? "ui-monospace, Consolas, monospace" : "system-ui, sans-serif");
}

let fontsPromise: Promise<void> | null = null;
/** Resolves once the page fonts used on canvases are available. */
export function fontsReady() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      try {
        const mono = fontFamily("mono");
        const display = fontFamily("display");
        await Promise.all([
          document.fonts.load(`700 40px ${mono}`),
          document.fonts.load(`400 40px ${mono}`),
          document.fonts.load(`600 40px ${display}`),
          document.fonts.load(`800 40px ${display}`),
        ]);
      } catch {
        /* fall back to system fonts */
      }
    })();
  }
  return fontsPromise;
}

export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

export function toTexture(canvas: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: boolean; anisotropy?: number } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = opts.anisotropy ?? 8;
  tex.needsUpdate = true;
  return tex;
}

function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const tex = make();
  cache.set(key, tex);
  return tex;
}

function noiseFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount: number, seed: number) {
  const rng = mulberry32(seed);
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, x, y);
}

function screw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, bump: boolean) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = bump ? "#c8c8c8" : "#8a8e94";
  ctx.fill();
  ctx.strokeStyle = bump ? "#404040" : "#50545a";
  ctx.lineWidth = r * 0.35;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y);
  ctx.lineTo(x + r * 0.6, y);
  ctx.stroke();
}

function insetPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bump: boolean, fill: string) {
  const r = 10;
  ctx.fillStyle = bump ? "#303030" : "rgba(40,44,50,0.9)";
  roundRect(ctx, x - 4, y - 4, w + 8, h + 8, r + 3);
  ctx.fill();
  ctx.fillStyle = bump ? "#8a8a8a" : fill;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  if (!bump) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(0.08, "rgba(255,255,255,0)");
    g.addColorStop(0.92, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.14)");
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }
  const s = 14;
  screw(ctx, x + s, y + s, 5, bump);
  screw(ctx, x + w - s, y + s, 5, bump);
  screw(ctx, x + s, y + h - s, 5, bump);
  screw(ctx, x + w - s, y + h - s, 5, bump);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWallVariant(ctx: CanvasRenderingContext2D, ox: number, variant: number, bump: boolean, seed: number) {
  const W = 512;
  const H = 1536;
  const rng = mulberry32(seed);
  const mono = fontFamily("mono");
  // Base
  ctx.fillStyle = bump ? "#7a7a7a" : "#b4b8bd";
  ctx.fillRect(ox, 0, W, H);
  // Ceiling band with vent slots
  ctx.fillStyle = bump ? "#555" : "#4d5259";
  ctx.fillRect(ox, 0, W, 190);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = bump ? "#222" : "#1d2024";
    roundRect(ctx, ox + 70, 42 + i * 13, W - 140, 6, 3);
    ctx.fill();
  }
  // Kick plate
  ctx.fillStyle = bump ? "#606060" : "#555a61";
  ctx.fillRect(ox, H - 160, W, 160);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = bump ? "#6a6a6a" : "rgba(255,255,255,0.05)";
    ctx.fillRect(ox + 20 + i * 40, H - 140, 18, 120);
  }
  // Panel seams at edges
  ctx.fillStyle = bump ? "#202020" : "#2b2f35";
  ctx.fillRect(ox, 0, 6, H);
  ctx.fillRect(ox + W - 6, 0, 6, H);

  if (variant === 0) {
    insetPanel(ctx, ox + 34, 230, W - 68, 520, bump, "#c3c6cb");
    insetPanel(ctx, ox + 34, 790, W - 68, 540, bump, "#bfc2c7");
    // Handhold recess
    ctx.fillStyle = bump ? "#303030" : "#3a3e44";
    roundRect(ctx, ox + W / 2 - 60, 1020, 120, 34, 17);
    ctx.fill();
  } else {
    // Stowage rack with soft cargo bags
    insetPanel(ctx, ox + 30, 220, W - 60, 1130, bump, "#a9adb3");
    for (let r = 0; r < 3; r++) {
      const y = 260 + r * 360;
      const bw = W - 120;
      ctx.fillStyle = bump ? "#9c9c9c" : ["#e6e1d6", "#dcd8cf", "#e9e6de"][r];
      roundRect(ctx, ox + 60, y, bw, 320, 26);
      ctx.fill();
      if (!bump) {
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 3;
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.moveTo(ox + 70, y + 40 + k * 60 + rng() * 10);
          ctx.bezierCurveTo(ox + 150, y + 50 + k * 60, ox + 300, y + 30 + k * 60, ox + 60 + bw - 10, y + 44 + k * 60);
          ctx.stroke();
        }
      }
      // Straps
      ctx.fillStyle = bump ? "#b0b0b0" : "#2f4f7a";
      ctx.fillRect(ox + 130, y - 6, 26, 332);
      ctx.fillRect(ox + W - 156, y - 6, 26, 332);
      ctx.fillStyle = bump ? "#ccc" : "#9aa0a8";
      ctx.fillRect(ox + 124, y + 150, 38, 26);
      ctx.fillRect(ox + W - 162, y + 150, 38, 26);
      if (!bump) {
        ctx.fillStyle = "#1c1f24";
        ctx.font = `600 22px ${mono}`;
        ctx.fillText(`CTB-${String(10 + Math.floor(rng() * 80)).padStart(3, "0")}`, ox + 190, y + 70);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ox + 190, y + 88, 120, 40);
        ctx.fillStyle = "#1c1f24";
        for (let b = 0; b < 26; b++) ctx.fillRect(ox + 196 + b * 4.3, y + 94, rng() < 0.5 ? 2 : 3, 28);
      }
    }
  }

  // Accent line + labels
  ctx.fillStyle = bump ? "#6c6c6c" : "#262a30";
  ctx.fillRect(ox, 1370, W, 10);
  if (!bump) {
    ctx.fillStyle = "#23272d";
    ctx.font = `700 24px ${mono}`;
    ctx.fillText(`PNL ${String.fromCharCode(65 + variant)}-${Math.floor(10 + rng() * 80)}`, ox + 40, 1418);
    ctx.font = `400 18px ${mono}`;
    ctx.fillStyle = "#3a3f47";
    ctx.fillText("DO NOT OBSTRUCT", ox + 40, 1446);
    // Warning triangle
    ctx.beginPath();
    ctx.moveTo(ox + W - 70, 1400);
    ctx.lineTo(ox + W - 40, 1450);
    ctx.lineTo(ox + W - 100, 1450);
    ctx.closePath();
    ctx.fillStyle = "#e8b100";
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `700 26px ${mono}`;
    ctx.fillText("!", ox + W - 76, 1444);
  }
}

/** Interior wall panel atlas (2 variants side by side) + matching bump map. */
export function wallTextures() {
  return cached("wall", () => {
    const { canvas, ctx } = makeCanvas(1024, 1536);
    drawWallVariant(ctx, 0, 0, false, 11);
    drawWallVariant(ctx, 512, 1, false, 12);
    noiseFill(ctx, 0, 0, 1024, 1536, 10, 3);
    const tex = toTexture(canvas);
    const bumpCanvas = makeCanvas(1024, 1536);
    drawWallVariant(bumpCanvas.ctx, 0, 0, true, 11);
    drawWallVariant(bumpCanvas.ctx, 512, 1, true, 12);
    const bump = toTexture(bumpCanvas.canvas, { srgb: false });
    tex.userData.bump = bump;
    return tex;
  });
}

/** Diamond tread plate floor (2 m × 2 m tile). */
export function floorTextures() {
  return cached("floor", () => {
    const S = 1024;
    const draw = (bump: boolean) => {
      const { canvas, ctx } = makeCanvas(S, S);
      ctx.fillStyle = bump ? "#6a6a6a" : "#3c4046";
      ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 32) {
        for (let x = 0; x < S; x += 32) {
          const flip = ((x + y) / 32) % 2 === 0;
          ctx.save();
          ctx.translate(x + 16, y + 16);
          ctx.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
          ctx.fillStyle = bump ? "#9a9a9a" : "#50555c";
          roundRect(ctx, -12, -3, 24, 6, 3);
          ctx.fill();
          if (!bump) {
            ctx.fillStyle = "rgba(255,255,255,0.07)";
            ctx.fillRect(-10, -3, 20, 1.5);
          }
          ctx.restore();
        }
      }
      // Plate seams every metre + bolts
      ctx.fillStyle = bump ? "#202020" : "#1f2226";
      ctx.fillRect(0, 0, S, 5);
      ctx.fillRect(0, S / 2 - 2, S, 5);
      ctx.fillRect(0, 0, 5, S);
      ctx.fillRect(S / 2 - 2, 0, 5, S);
      for (const [bx, by] of [[20, 20], [S / 2 - 20, 20], [20, S / 2 - 20], [S / 2 + 20, S / 2 + 20], [S - 20, S / 2 + 20], [S / 2 + 20, S - 20]]) {
        screw(ctx, bx, by, 7, bump);
      }
      if (!bump) noiseFill(ctx, 0, 0, S, S, 14, 9);
      return canvas;
    };
    const tex = toTexture(draw(false), { repeat: true });
    const bump = toTexture(draw(true), { srgb: false, repeat: true });
    tex.userData.bump = bump;
    return tex;
  });
}

/** Ceiling panels: dark grid with perforated tiles. */
export function ceilingTexture() {
  return cached("ceiling", () => {
    const S = 512;
    const { canvas, ctx } = makeCanvas(S, S);
    ctx.fillStyle = "#2c3036";
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const x = i * 256 + 8;
        const y = j * 256 + 8;
        ctx.fillStyle = "#3a3f46";
        ctx.fillRect(x, y, 240, 240);
        ctx.fillStyle = "#23262b";
        for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
          ctx.beginPath();
          ctx.arc(x + 20 + a * 18.5, y + 20 + b * 18.5, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    noiseFill(ctx, 0, 0, S, S, 10, 4);
    return toTexture(canvas, { repeat: true });
  });
}

/** Yellow / black safety stripes. */
export function hazardTexture() {
  return cached("hazard", () => {
    const { canvas, ctx } = makeCanvas(256, 64);
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#f0b400";
    for (let x = -64; x < 320; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 32, 64);
      ctx.lineTo(x + 64, 0);
      ctx.lineTo(x + 32, 0);
      ctx.closePath();
      ctx.fill();
    }
    noiseFill(ctx, 0, 0, 256, 64, 18, 5);
    return toTexture(canvas, { repeat: true });
  });
}

/** Transparent text decal. */
export function labelTexture(
  key: string,
  lines: { text: string; size: number; weight?: number; color?: string; font?: "mono" | "display"; spacing?: number }[],
  w: number,
  h: number,
  opts: { align?: CanvasTextAlign; bg?: string; stencil?: boolean } = {}
) {
  return cached(`label:${key}`, () => {
    const { canvas, ctx } = makeCanvas(w, h);
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.fillRect(0, 0, w, h);
    }
    const totalH = lines.reduce((s, l) => s + l.size * 1.2, 0);
    let y = (h - totalH) / 2;
    for (const l of lines) {
      ctx.font = `${l.weight ?? 700} ${l.size}px ${fontFamily(l.font ?? "mono")}`;
      ctx.fillStyle = l.color ?? "#1a1d22";
      ctx.textAlign = opts.align ?? "center";
      ctx.textBaseline = "top";
      const x = opts.align === "left" ? 16 : opts.align === "right" ? w - 16 : w / 2;
      if (l.spacing) {
        try {
          ctx.letterSpacing = `${l.spacing}px`;
        } catch {
          /* older browsers */
        }
      }
      ctx.fillText(l.text, x, y + l.size * 0.1);
      y += l.size * 1.2;
    }
    if (opts.stencil) {
      // Paint wear: erase random specks.
      const rng = mulberry32(key.length * 77);
      ctx.globalCompositeOperation = "destination-out";
      for (let i = 0; i < (w * h) / 900; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.2 + rng() * 0.6})`;
        ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 3);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    return toTexture(canvas);
  });
}

/** Exterior airlock door leaf. */
export function doorTexture() {
  return cached("door", () => {
    const W = 512;
    const H = 1152;
    const { canvas, ctx } = makeCanvas(W, H);
    const mono = fontFamily("mono");
    ctx.fillStyle = "#a9adb2";
    ctx.fillRect(0, 0, W, H);
    // Hazard border
    const hz = 26;
    for (let i = -H; i < W + H; i += 52) {
      ctx.fillStyle = "#f0b400";
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 26, 0);
      ctx.lineTo(i + 26 - H, H);
      ctx.lineTo(i - H, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#111";
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#b2b6bb";
    roundRect(ctx, hz, hz, W - hz * 2, H - hz * 2, 18);
    ctx.fill();
    insetPanel(ctx, hz + 30, hz + 40, W - hz * 2 - 60, 430, false, "#bdc1c6");
    insetPanel(ctx, hz + 30, hz + 520, W - hz * 2 - 60, 520, false, "#b9bdc2");
    // Handle recess
    ctx.fillStyle = "#2a2e33";
    roundRect(ctx, W - 150, 560, 70, 190, 30);
    ctx.fill();
    ctx.fillStyle = "#e0a100";
    roundRect(ctx, W - 136, 580, 42, 150, 20);
    ctx.fill();
    ctx.fillStyle = "#1a1d22";
    ctx.font = `800 54px ${mono}`;
    ctx.textAlign = "center";
    ctx.fillText("AIRLOCK", W / 2 - 20, 180);
    ctx.font = `800 110px ${mono}`;
    ctx.fillText("01", W / 2 - 20, 300);
    ctx.font = `600 24px ${mono}`;
    ctx.fillText("CREW ACCESS · DECK 01", W / 2 - 20, 360);
    ctx.font = `500 20px ${mono}`;
    ctx.fillStyle = "#3a3e45";
    ctx.fillText("EQUALIZE PRESSURE BEFORE OPENING", W / 2 - 20, 400);
    noiseFill(ctx, 0, 0, W, H, 12, 21);
    return toTexture(canvas);
  });
}
