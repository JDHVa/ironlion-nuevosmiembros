# Iron Lion 4977 · Horarios por QR (miembros nuevos)

Cada persona escanea su QR y ve a qué grupo va en cada una de las 9 rondas,
la ronda en curso (la marca el staff desde `/control`) y quiénes están en su grupo.

## Estructura
- `horarios_grupos.csv` — fuente de datos (Nombre, Ronda_1..Ronda_9).
- `scripts/build-data.js` — CSV → `public/data.json`.
- `scripts/generate-qrs.js` — un PNG por persona en `qrs/` + `qrs/hoja.html` (imprimible).
- `public/` — sitio estático (`/?p=<slug>` vista personal, `/` buscador, `/control` panel del staff).
- `api/state.js` — ronda en curso compartida (Vercel Function + Upstash Redis).

## Comandos
```bash
npm install
npm run build            # regenera data.json y los QRs
node scripts/dev-server.js   # prueba local en http://localhost:5177
```
Si cambia el CSV, vuelve a correr `npm run build` y redeploya.
Si cambia el dominio: `BASE_URL=https://otro.dominio npm run build:qrs`.

## Deploy en Vercel (una vez)
1. Sube esta carpeta a GitHub (o `npx vercel`), proyecto con nombre **ironlion-miembros-nuevos**
   para que la URL sea `https://ironlion-miembros-nuevos.vercel.app` (la que traen los QRs).
2. Framework: *Other*. Output directory: `public`. Sin build command.
3. Para que la ronda en curso la vean todos los teléfonos: en el proyecto → **Storage → Create → Upstash Redis → Connect**.
   Vercel inyecta `KV_REST_API_URL` / `KV_REST_API_TOKEN` automáticamente. Sin esto el sitio funciona,
   pero la ronda marcada puede reiniciarse sola.

## El día del evento
1. Abre `https://ironlion-miembros-nuevos.vercel.app/control` en tu teléfono.
2. Cuando empiece cada ronda, pulsa **Siguiente ronda →** (o toca el número de ronda). Todos los teléfonos se actualizan solos.
3. Imprime `qrs/hoja.html` (Ctrl+P) o reparte los PNG de `qrs/`.
# ironlion-nuevosmiembros
