// Servidor local de prueba: sirve public/ y monta api/state.js (estado en memoria).
const http = require("http");
const fs = require("fs");
const path = require("path");
const handlers = { "/api/state": require("../api/state"), "/api/people": require("../api/people") };

const PUB = path.join(__dirname, "..", "public");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (handlers[url.pathname]) {
    let body = ""; for await (const c of req) body += c;
    req.body = body;
    const r = { _h: {}, setHeader: (k, v) => r._h[k] = v, status: (c) => { res.statusCode = c; return r; }, json: (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); }, end: () => res.end() };
    return handlers[url.pathname](req, r);
  }
  let p = url.pathname === "/" ? "/index.html" : url.pathname;
  if (!path.extname(p)) p += ".html";
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB) || !fs.existsSync(file)) { res.statusCode = 404; return res.end("404"); }
  res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(5177, () => console.log("http://localhost:5177"));
