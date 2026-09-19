// Almacén compartido: Upstash Redis si está configurado (Vercel → Storage),
// si no, memoria de la función (solo para pruebas locales).
const { Redis } = require("@upstash/redis");

const memory = new Map();

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

async function get(key) {
  if (!redis) return memory.get(key) ?? null;
  return (await redis.get(key)) ?? null;
}

async function set(key, value) {
  memory.set(key, value);
  if (redis) await redis.set(key, value);
}

async function del(key) {
  memory.delete(key);
  if (redis) await redis.del(key);
}

function cors(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function parseBody(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
}

module.exports = { get, set, del, cors, parseBody, persistent: !!redis };
