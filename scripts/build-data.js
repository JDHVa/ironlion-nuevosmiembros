// Genera public/data.json a partir del CSV.
const fs = require("fs");
const path = require("path");
const { ROOT, readCsv } = require("./lib");

const { people, roundCount } = readCsv();
const groups = [...new Set(people.flatMap((p) => p.rounds))].sort((a, b) => a - b);

const data = {
  generatedAt: new Date().toISOString(),
  roundCount,
  groups,
  people: people.map(({ name, slug, rounds }) => ({ name, slug, rounds })),
};

const out = path.join(ROOT, "public", "data.json");
fs.writeFileSync(out, JSON.stringify(data));
console.log(`✔ ${people.length} personas, ${roundCount} rondas, grupos ${groups.join(",")} → ${path.relative(ROOT, out)}`);
