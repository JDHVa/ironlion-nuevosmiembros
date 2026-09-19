// Ronda en curso, marcada a mano por el staff desde /control.
// GET  /api/state  → { mode, manualRound, updatedAt, serverTime }
// POST /api/state  { manualRound: 0..N }  (0 = aún no empieza)

const store = require("./_store");

const KEY = "ironlion:rondas:state";
const DEFAULT_STATE = { mode: "manual", manualRound: 0, updatedAt: null };

module.exports = async (req, res) => {
  store.cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const state = { ...DEFAULT_STATE, ...((await store.get(KEY)) || {}) };
    if (req.method === "GET") {
      return res.status(200).json({ ...state, persistent: store.persistent, serverTime: new Date().toISOString() });
    }
    if (req.method === "POST") {
      const body = store.parseBody(req);
      if (Number.isInteger(+body.manualRound) && +body.manualRound >= 0) state.manualRound = Math.min(50, +body.manualRound);
      state.updatedAt = new Date().toISOString();
      await store.set(KEY, state);
      return res.status(200).json({ ...state, persistent: store.persistent, serverTime: new Date().toISOString() });
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
