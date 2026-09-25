// ═══════════════════════════════════════════════════════════════
// BUILD SKY — turns NASA's Deep Star Maps 2020 (galactic coordinates)
// into the six cube faces used as the scene background.
//
// Source (public, credit below): https://svs.gsfc.nasa.gov/4851
//   starmap_2020_8k_gal.exr → decode to raw planar floats first:
//   ffmpeg -i starmap_2020_8k_gal.exr -f rawvideo -pix_fmt gbrpf32le starmap.f32
//
// Usage: node scripts/build-sky.mjs <starmap.f32> [exposure]
// Writes public/sky/{2048,1024}/{px,nx,py,ny,pz,nz}.jpg
//
// Credit: NASA/Goddard Space Flight Center Scientific Visualization
// Studio. Gaia DR2: ESA/Gaia/DPAC.
// ═══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import sharp from "sharp";

const [input, exposureArg] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/build-sky.mjs <starmap.f32> [exposure]");
const EXPOSURE = Number(exposureArg ?? 5);
const W = 8192;
const H = 4096;
const FACE = 2048;
const OUT = path.resolve("public/sky");

// Orientation of the galaxy in the scene (same band as the previous procedural sky).
const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const Z = norm([0.615, 0.706, -0.353]); // north galactic pole
const c0 = [-0.72, -0.35, -0.6];
const X = norm(c0.map((x, i) => x - Z[i] * dot(c0, Z))); // galactic centre
const Y = cross(Z, X); // l = 90°

const buf = fs.readFileSync(input);
const px = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
if (px.length !== W * H * 3) throw new Error(`expected ${W}x${H} planar floats`);
const N = W * H; // planes: G, B, R

function sample(u, v, out) {
  // Bilinear, wrapping in longitude, clamped in latitude.
  const x = u * W - 0.5;
  const y = Math.min(H - 1, Math.max(0, v * H - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const xa = ((x0 % W) + W) % W;
  const xb = (xa + 1) % W;
  const ya = y0;
  const yb = Math.min(H - 1, y0 + 1);
  const i00 = ya * W + xa, i10 = ya * W + xb, i01 = yb * W + xa, i11 = yb * W + xb;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  out[0] = px[2 * N + i00] * w00 + px[2 * N + i10] * w10 + px[2 * N + i01] * w01 + px[2 * N + i11] * w11;
  out[1] = px[i00] * w00 + px[i10] * w10 + px[i01] * w01 + px[i11] * w11;
  out[2] = px[N + i00] * w00 + px[N + i10] * w10 + px[N + i01] * w01 + px[N + i11] * w11;
}

// three.js samples a CubeTexture at (-x, y, z) of the world direction (flipEnvMap).
// Faces follow the GL convention: [px, nx, py, ny, pz, nz]; row 0 is t = 0.
const FACES = [
  ["px", (sc, tc) => [1, -tc, -sc]],
  ["nx", (sc, tc) => [-1, -tc, sc]],
  ["py", (sc, tc) => [sc, 1, tc]],
  ["ny", (sc, tc) => [sc, -1, -tc]],
  ["pz", (sc, tc) => [sc, -tc, 1]],
  ["nz", (sc, tc) => [-sc, -tc, -1]],
];

// Soft exposure (1 - e^-kx) keeps star cores below 1, then sRGB with triangular dither.
const toSrgb = (l) => (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

fs.mkdirSync(path.join(OUT, "2048"), { recursive: true });
fs.mkdirSync(path.join(OUT, "1024"), { recursive: true });

const SS = [0.25, 0.75];
const c = [0, 0, 0];
for (const [name, dirOf] of FACES) {
  const img = Buffer.alloc(FACE * FACE * 3);
  for (let row = 0; row < FACE; row++) {
    for (let col = 0; col < FACE; col++) {
      let r = 0, g = 0, b = 0;
      for (const oy of SS) {
        for (const ox of SS) {
          const sc = ((col + ox) / FACE) * 2 - 1;
          const tc = ((row + oy) / FACE) * 2 - 1;
          const gl = dirOf(sc, tc);
          const d = norm([-gl[0], gl[1], gl[2]]);
          const lon = Math.atan2(dot(d, Y), dot(d, X));
          const lat = Math.asin(Math.max(-1, Math.min(1, dot(d, Z))));
          sample(0.5 - lon / (2 * Math.PI), 0.5 - lat / Math.PI, c);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const i = (row * FACE + col) * 3;
      const vals = [r / 4, g / 4, b / 4];
      for (let k = 0; k < 3; k++) {
        const lin = 1 - Math.exp(-EXPOSURE * Math.max(0, vals[k]));
        const dither = (rnd() - rnd()) * 0.5;
        img[i + k] = Math.max(0, Math.min(255, Math.round(toSrgb(lin) * 255 + dither)));
      }
    }
  }
  const raw = { raw: { width: FACE, height: FACE, channels: 3 } };
  const jpeg = { quality: 86, chromaSubsampling: "4:4:4", mozjpeg: true };
  await sharp(img, raw).jpeg(jpeg).toFile(path.join(OUT, "2048", `${name}.jpg`));
  await sharp(img, raw).resize(1024, 1024, { kernel: "lanczos3" }).jpeg(jpeg).toFile(path.join(OUT, "1024", `${name}.jpg`));
  console.log("face", name);
}
