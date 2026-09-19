// Genera un PNG de código QR por persona (qrs/<slug>.png) apuntando a la web,
// más qrs/hoja.html: una hoja imprimible con todos los QRs y nombres.
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { ROOT, BASE_URL, readCsv } = require("./lib");

const OUT = path.join(ROOT, "qrs");
const { people } = readCsv();

const QR_OPTS = {
  errorCorrectionLevel: "H", // tolera el logo/desgaste al imprimir
  width: 900,
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const rows = [];
  for (const p of people) {
    const url = `${BASE_URL}/?p=${p.slug}`;
    const file = path.join(OUT, `${p.slug}.png`);
    await QRCode.toFile(file, url, QR_OPTS);
    rows.push({ ...p, url, file: path.basename(file) });
    console.log(`✔ ${p.name.padEnd(40)} ${url}`);
  }

  const cards = rows
    .map(
      (r) => `
      <figure class="card">
        <img src="${r.file}" alt="QR de ${r.name}" width="220" height="220">
        <figcaption>
          <strong>${r.name}</strong>
          <small>${r.url.replace(/^https?:\/\//, "")}</small>
        </figcaption>
      </figure>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>QRs · Iron Lion 4977 · Miembros nuevos</title>
<style>
  @page { size: letter; margin: 12mm; }
  body { font-family: "DM Sans", Roboto, system-ui, sans-serif; margin: 0; padding: 16px; color: #000; background: #fff; }
  h1 { font-family: "League Spartan", Impact, system-ui, sans-serif; font-weight: 800; letter-spacing: -.02em; margin: 0 0 4px; }
  p.sub { margin: 0 0 20px; color: #404040; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .card { margin: 0; border: 2px solid #000; border-radius: 12px; padding: 12px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .card img { width: 100%; height: auto; display: block; }
  .card strong { display: block; font-size: 15px; margin-top: 8px; line-height: 1.2; }
  .card small { display: block; color: #404040; font-size: 10px; margin-top: 3px; word-break: break-all; }
  .card::before { content: "IRON LION 4977"; display: block; font-family: "League Spartan", Impact, sans-serif; font-weight: 800; color: #fd4a02; font-size: 12px; letter-spacing: .12em; margin-bottom: 6px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Códigos QR · Miembros nuevos</h1>
<p class="sub">${rows.length} personas · Cada QR abre el horario personal en ${BASE_URL}</p>
<div class="grid">${cards}</div>
</body></html>`;
  fs.writeFileSync(path.join(OUT, "hoja.html"), html);
  console.log(`\n✔ ${rows.length} QRs en ${path.relative(ROOT, OUT)}/ + hoja.html imprimible`);
}

main().catch((e) => { console.error(e); process.exit(1); });
