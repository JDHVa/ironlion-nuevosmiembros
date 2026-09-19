// Estado compartido del cronómetro de rondas.
// GET  /api/state  → estado actual
// POST /api/state  → guarda el estado (body JSON). Sin login: la ruta /control es "oculta".
//                    Si defines CONTROL_PIN en Vercel, el POST exige header x-pin.
//
// Persistencia: Upstash Redis (Vercel → Storage → Upstash → Connect).
// Sin Redis configurado, el estado vive solo en memoria de la función
// (se pierde al escalar/dormir) — suficiente para probar, no para el evento.

const { Redis } = require("@upstash/redis");

const KEY = "ironlion:rondas:state";
const DEFAULT_STATE = {
  mode: "off",          // off | auto | manual
  startAt: null,        // ISO: inicio de la Ronda 1 (modo auto)
  roundMinutes: 5,      // duración de cada ronda
  breakMinutes: 0,      // descanso entre rondas
  manualRound: 1,       // ronda forzada (modo manual)
  updatedAt: null,
};

let memory = { ...DEFAULT_STATE };

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function load(redis) {
  if (!redis) return memory;
  const s = await redis.get(KEY);
  return s ? { ...DEFAULT_STATE, ...s } : { ...DEFAULT_STATE };
}

async function save(redis, state) {
  memory = state;
  if (redis) await redis.set(KEY, state);
}

function sanitize(body, prev) {
  const s = { ...prev };
  if (["off", "auto", "manual"].includes(body.mode)) s.mode = body.mode;
  if (body.startAt === null || (typeof body.startAt === "string" && !isNaN(Date.parse(body.startAt)))) s.startAt = body.startAt;
  if (Number.isFinite(+body.roundMinutes) && +body.roundMinutes > 0) s.roundMinutes = Math.min(180, +body.roundMinutes);
  if (Number.isFinite(+body.breakMinutes) && +body.breakMinutes >= 0) s.breakMinutes = Math.min(120, +body.breakMinutes);
  if (Number.isInteger(+body.manualRound) && +body.manualRound >= 0) s.manualRound = Math.min(50, +body.manualRound);
  s.updatedAt = new Date().toISOString();
  return s;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-pin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const redis = getRedis();
  try {
    if (req.method === "GET") {
      const state = await load(redis);
      return res.status(200).json({ ...state, persistent: !!redis, serverTime: new Date().toISOString() });
    }
    if (req.method === "POST") {
      const pin = process.env.CONTROL_PIN;
      if (pin && req.headers["x-pin"] !== pin) return res.status(401).json({ error: "PIN incorrecto" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const state = sanitize(body, await load(redis));
      await save(redis, state);
      return res.status(200).json({ ...state, persistent: !!redis, serverTime: new Date().toISOString() });
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
