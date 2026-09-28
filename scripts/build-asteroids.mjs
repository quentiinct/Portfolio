// ═══════════════════════════════════════════════════════════════
// BUILD ASTEROIDS — turns Poly Haven's Moon Rock scans (seven
// photogrammetry rocks dusted with regolith, CC0) into the GLBs used
// by the asteroid field.
//
// Source (CC0, credit below): https://polyhaven.com/a/moon_rock_01 … _07
//   The meshes and the 8K maps (~330 MB) are downloaded into <cache-dir>
//   on the first run; nothing from the cache is committed.
//
// Usage: node scripts/build-asteroids.mjs <cache-dir>
// Writes public/asteroids/{2048,1024,512}/moon_rock_0N.glb
//
// Each GLB holds one material and two meshes sharing one vertex buffer:
//   - base colour: the 8K diffuse with the 8K ambient occlusion
//     multiplied in (linear light), downsampled; roughness is a
//     constant (the scans read 0.94–0.98 everywhere) and metal is 0;
//   - normal map: the 8K OpenGL normals, downsampled and renormalised;
//   - "lod0": the full scan, centred on its centre of mass and scaled
//     to a volume-equivalent radius of RADIUS;
//   - "lod1": about 8% of its triangles, for the far field.
//
// Credit: Poly Haven. Photography: Greg Zaal, Rico Cilliers.
// Processing: Jenelle van Heerden, Dario Barresi.
// ═══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Document, NodeIO } from "@gltf-transform/core";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

// Texture sizes per rock. The first four are the big hero rocks (high
// quality: 2048, low: 1024); the others only fill the field.
const ROCKS = {
  moon_rock_02: [2048, 1024],
  moon_rock_04: [2048, 1024],
  moon_rock_06: [2048, 1024],
  moon_rock_03: [2048, 1024],
  moon_rock_01: [1024, 512],
  moon_rock_05: [1024, 512],
  moon_rock_07: [1024, 512],
};
const RADIUS = 0.8;
const LOD1_RATIO = 0.08;
const API = "https://api.polyhaven.com/files/";
const OUT = path.resolve("public/asteroids");

const [cacheDir] = process.argv.slice(2);
if (!cacheDir) throw new Error("usage: node scripts/build-asteroids.mjs <cache-dir>");
fs.mkdirSync(cacheDir, { recursive: true });

async function download(url, file) {
  if (fs.existsSync(file)) return file;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`  downloaded ${path.basename(file)}`);
  return file;
}

async function fetchSources(name) {
  const files = await (await fetch(API + name)).json();
  const gltf = files.gltf["1k"].gltf;
  const src = (key) => path.join(cacheDir, key);
  return {
    gltf: await download(gltf.url, src(`${name}.gltf`)),
    bin: await download(gltf.include[`${name}.bin`].url, src(`${name}.bin`)),
    diff: await download(files.Diffuse["8k"].jpg.url, src(`${name}_diff_8k.jpg`)),
    nor: await download(files.nor_gl["8k"].jpg.url, src(`${name}_nor_gl_8k.jpg`)),
    arm: await download(files.arm["8k"].jpg.url, src(`${name}_arm_8k.jpg`)),
  };
}

// ─── Mesh ──────────────────────────────────────────────────────

function readMesh(name, gltfFile, binFile) {
  const gltf = JSON.parse(fs.readFileSync(gltfFile, "utf8"));
  const bin = fs.readFileSync(binFile);
  const node = gltf.nodes.find((n) => n.name === `${name}_LOD0`) ?? gltf.nodes.find((n) => n.mesh !== undefined);
  const prim = gltf.meshes[node.mesh].primitives[0];
  const read = (index) => {
    const acc = gltf.accessors[index];
    const view = gltf.bufferViews[acc.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
    const Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[acc.componentType];
    if (view.byteStride && view.byteStride !== size * Type.BYTES_PER_ELEMENT) throw new Error("interleaved accessor");
    const offset = bin.byteOffset + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    return new Type(bin.buffer.slice(offset, offset + acc.count * size * Type.BYTES_PER_ELEMENT));
  };
  return {
    position: read(prim.attributes.POSITION),
    normal: read(prim.attributes.NORMAL),
    uv: read(prim.attributes.TEXCOORD_0),
    index: Uint32Array.from(read(prim.indices)),
  };
}

/** Centre on the centre of mass, scale to a volume-equivalent radius of RADIUS. */
function normalise(mesh) {
  const p = mesh.position;
  const ix = mesh.index;
  let volume = 0;
  const c = [0, 0, 0];
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, d = ix[t + 2] * 3;
    // Signed volume of the tetrahedron (origin, a, b, d).
    const v =
      (p[a] * (p[b + 1] * p[d + 2] - p[b + 2] * p[d + 1]) -
        p[a + 1] * (p[b] * p[d + 2] - p[b + 2] * p[d]) +
        p[a + 2] * (p[b] * p[d + 1] - p[b + 1] * p[d])) /
      6;
    volume += v;
    for (let k = 0; k < 3; k++) c[k] += (v * (p[a + k] + p[b + k] + p[d + k])) / 4;
  }
  for (let k = 0; k < 3; k++) c[k] /= volume;
  const scale = RADIUS / Math.cbrt((3 * Math.abs(volume)) / (4 * Math.PI));
  let maxR = 0;
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k++) p[i + k] = (p[i + k] - c[k]) * scale;
    maxR = Math.max(maxR, Math.hypot(p[i], p[i + 1], p[i + 2]));
  }
  return maxR;
}

function simplifyLod(mesh) {
  const target = Math.floor((mesh.index.length / 3) * LOD1_RATIO) * 3;
  const [index] = MeshoptSimplifier.simplify(mesh.index, mesh.position, 3, target, 0.05);
  return index;
}

// ─── Textures ──────────────────────────────────────────────────

const resize = (size) => ({ width: size, height: size, kernel: "lanczos3", fastShrinkOnLoad: false });
const toLinear = new Float32Array(256).map((_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const toSrgb = (l) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055));

async function bakeColor(src, size) {
  // Diffuse resized in linear light; the occlusion is data, resized as is.
  const diff = await sharp(src.diff, { limitInputPixels: false }).gamma(2.2).resize(resize(size)).removeAlpha().raw().toBuffer();
  const ao = await sharp(src.arm, { limitInputPixels: false }).extractChannel(0).resize(resize(size)).raw().toBuffer();
  const out = Buffer.alloc(diff.length);
  for (let i = 0; i < ao.length; i++) {
    const occlusion = ao[i] / 255;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = toSrgb(toLinear[diff[i * 3 + k]] * occlusion);
  }
  return sharp(out, { raw: { width: size, height: size, channels: 3 } }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

async function bakeNormal(src, size) {
  const raw = await sharp(src.nor, { limitInputPixels: false }).resize(resize(size)).removeAlpha().raw().toBuffer();
  for (let i = 0; i < raw.length; i += 3) {
    const x = raw[i] / 127.5 - 1, y = raw[i + 1] / 127.5 - 1, z = raw[i + 2] / 127.5 - 1;
    const l = Math.hypot(x, y, z) || 1;
    raw[i] = Math.round((x / l + 1) * 127.5);
    raw[i + 1] = Math.round((y / l + 1) * 127.5);
    raw[i + 2] = Math.round((z / l + 1) * 127.5);
  }
  // 4:4:4: chroma subsampling would smear the X/Y slopes the map is made of.
  return sharp(raw, { raw: { width: size, height: size, channels: 3 } })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
}

// ─── GLB ───────────────────────────────────────────────────────

async function writeGlb(name, mesh, lod1, color, normal, file) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (array, type) => doc.createAccessor().setArray(array).setType(type).setBuffer(buffer);
  const indices = (ix) => accessor(mesh.position.length / 3 <= 65535 ? Uint16Array.from(ix) : ix, "SCALAR");
  const position = accessor(mesh.position, "VEC3");
  const normals = accessor(mesh.normal, "VEC3");
  const uv = accessor(mesh.uv, "VEC2");

  const material = doc
    .createMaterial(name)
    .setBaseColorTexture(doc.createTexture("color").setImage(color).setMimeType("image/jpeg"))
    .setNormalTexture(doc.createTexture("normal").setImage(normal).setMimeType("image/jpeg"))
    .setRoughnessFactor(0.96)
    .setMetallicFactor(0);

  const scene = doc.createScene();
  for (const [lod, ix] of [["lod0", mesh.index], ["lod1", lod1]]) {
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", position)
      .setAttribute("NORMAL", normals)
      .setAttribute("TEXCOORD_0", uv)
      .setIndices(indices(ix))
      .setMaterial(material);
    scene.addChild(doc.createNode(lod).setMesh(doc.createMesh(lod).addPrimitive(prim)));
  }
  await new NodeIO().write(file, doc);
}

await MeshoptSimplifier.ready;
for (const [name, sizes] of Object.entries(ROCKS)) {
  console.log(name);
  const src = await fetchSources(name);
  const mesh = readMesh(name, src.gltf, src.bin);
  const maxR = normalise(mesh);
  const lod1 = simplifyLod(mesh);
  console.log(`  ${mesh.index.length / 3} triangles (lod1 ${lod1.length / 3}), max radius ${maxR.toFixed(2)}`);
  for (const size of sizes) {
    const [color, normal] = await Promise.all([bakeColor(src, size), bakeNormal(src, size)]);
    const file = path.join(OUT, String(size), `${name}.glb`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await writeGlb(name, mesh, lod1, color, normal, file);
    console.log(`  ${size}: ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
  }
}
