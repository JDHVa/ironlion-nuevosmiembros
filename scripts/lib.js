// Utilidades compartidas: lectura del CSV y slugs.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CSV_PATH = path.join(ROOT, "horarios_grupos.csv");
const BASE_URL = process.env.BASE_URL || "https://ironlion-miembros-nuevos.vercel.app";

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readCsv() {
  const raw = fs.readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split(",").map((h) => h.trim());
  const roundCols = header.filter((h) => /^Ronda_\d+$/i.test(h));
  const people = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const name = cells[0];
    const rounds = roundCols.map((c) => Number(cells[header.indexOf(c)]));
    return { name, slug: slugify(name), rounds };
  });
  // Detectar slugs duplicados: los QRs serían ambiguos.
  const seen = new Map();
  for (const p of people) {
    if (seen.has(p.slug)) throw new Error(`Slug duplicado: ${p.slug} (${seen.get(p.slug)} / ${p.name})`);
    seen.set(p.slug, p.name);
  }
  return { people, roundCount: roundCols.length };
}

module.exports = { ROOT, BASE_URL, slugify, readCsv };
