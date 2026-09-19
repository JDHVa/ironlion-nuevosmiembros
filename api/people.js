// Lista de personas editable desde /control.
// GET  /api/people → { roundCount, groups, people[], persistent, customized }
// POST /api/people { action: "add", name }
//                  { action: "update", slug, name?, rounds? }
//                  { action: "remove", slug }
//                  { action: "reset" }   → vuelve al CSV original
// La base es public/data.json (generado del CSV); los cambios se guardan en Redis encima.

const base = require("../public/data.json");
const store = require("./_store");

const KEY = "ironlion:people";

function slugify(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function loadPeople() {
  const saved = await store.get(KEY);
  return { people: saved ? saved : base.people.map((p) => ({ ...p })), customized: !!saved };
}

function payload(people, customized) {
  return { roundCount: base.roundCount, groups: base.groups, people, persistent: store.persistent, customized };
}

function cleanName(v) {
  const name = String(v || "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 80) throw new Error("Nombre inválido");
  return name;
}

function cleanRounds(v) {
  if (!Array.isArray(v) || v.length !== base.roundCount) throw new Error(`Se esperan ${base.roundCount} rondas`);
  return v.map((g) => {
    const n = +g;
    if (!base.groups.includes(n)) throw new Error(`Grupo inválido: ${g}`);
    return n;
  });
}

module.exports = async (req, res) => {
  store.cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    let { people, customized } = await loadPeople();
    if (req.method === "GET") return res.status(200).json(payload(people, customized));
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

    const body = store.parseBody(req);
    switch (body.action) {
      case "add": {
        const name = cleanName(body.name);
        let slug = slugify(name), i = 2;
        while (people.some((p) => p.slug === slug)) slug = `${slugify(name)}-${i++}`;
        // Grupo al azar en cada ronda.
        const rounds = Array.from({ length: base.roundCount }, () => base.groups[Math.floor(Math.random() * base.groups.length)]);
        people.push({ name, slug, rounds });
        people.sort((a, b) => a.name.localeCompare(b.name, "es"));
        break;
      }
      case "update": {
        const p = people.find((x) => x.slug === body.slug);
        if (!p) return res.status(404).json({ error: "Persona no encontrada" });
        if (body.name != null) p.name = cleanName(body.name); // el slug (y su QR) no cambian
        if (body.rounds != null) p.rounds = cleanRounds(body.rounds);
        people.sort((a, b) => a.name.localeCompare(b.name, "es"));
        break;
      }
      case "remove": {
        const n = people.length;
        people = people.filter((x) => x.slug !== body.slug);
        if (people.length === n) return res.status(404).json({ error: "Persona no encontrada" });
        break;
      }
      case "reset": {
        await store.del(KEY);
        return res.status(200).json(payload(base.people, false));
      }
      default:
        return res.status(400).json({ error: "Acción desconocida" });
    }
    await store.set(KEY, people);
    return res.status(200).json(payload(people, true));
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
};
