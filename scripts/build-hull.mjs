// ═══════════════════════════════════════════════════════════════
// BUILD HULL — packs ambientCG's scanned stainless steel (CC0) into the
// detail map tiled over the hull and the flaps.
//
// Sources (CC0, 4K): https://ambientcg.com/view?id=Metal009 (brushed stainless, scratches)
//                    https://ambientcg.com/view?id=Metal012 (polished steel, smudges)
//   The zips (~125 MB) are downloaded into <cache-dir> and unpacked with
//   `unzip`; nothing from the cache is committed.
//
// Usage: node scripts/build-hull.mjs <cache-dir>
// Writes public/hull/{4096,2048}/steel.jpg, one channel per map:
//   R: brushed roughness (Metal009) · G: smudge roughness (Metal012) · B: height (Metal009)
// One tile covers 4 × 4 m of hull, so 4096px is about 1 mm per texel: the
// finest the camera resolves, at the airlock, 4 m from the hull.
//
// Credit: ambientCG (Lennart Demes), CC0.
// ═══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import sharp from "sharp";

const SIZES = [4096, 2048];
const OUT = path.resolve("public/hull");
const SOURCES = ["Metal009", "Metal012"];

const [cacheDir] = process.argv.slice(2);
if (!cacheDir) throw new Error("usage: node scripts/build-hull.mjs <cache-dir>");
fs.mkdirSync(cacheDir, { recursive: true });

async function fetchSource(id) {
  const dir = path.join(cacheDir, id);
  const zip = path.join(cacheDir, `${id}_4K-JPG.zip`);
  if (!fs.existsSync(zip)) {
    // ambientCG refuses requests without a browser user agent.
    const res = await fetch(`https://ambientcg.com/get?file=${id}_4K-JPG.zip`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`${res.status} ${id}`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    console.log(`  downloaded ${path.basename(zip)}`);
  }
  if (!fs.existsSync(dir)) execFileSync("unzip", ["-q", "-o", zip, "-d", dir]);
  return (map) => path.join(dir, `${id}_4K-JPG_${map}.jpg`);
}

const [brushed, smudged] = await Promise.all(SOURCES.map(fetchSource));
const channels = [brushed("Roughness"), smudged("Roughness"), brushed("Displacement")];

for (const size of SIZES) {
  const planes = await Promise.all(
    channels.map((file) => sharp(file).greyscale().resize(size, size, { kernel: "lanczos3" }).extractChannel(0).raw().toBuffer())
  );
  const packed = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    packed[i * 3] = planes[0][i];
    packed[i * 3 + 1] = planes[1][i];
    packed[i * 3 + 2] = planes[2][i];
  }
  const file = path.join(OUT, String(size), "steel.jpg");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 4:4:4: each channel is a separate map, chroma subsampling would blur two of them.
  await sharp(packed, { raw: { width: size, height: size, channels: 3 } })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(file);
  console.log(`${size}: ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
