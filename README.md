# Iron Lion 4977 · Horarios por QR (miembros nuevos)

Cada persona escanea su QR y ve a qué grupo va en cada una de las 9 rondas,
la ronda en curso con conteo regresivo y quiénes están en su grupo.

## Estructura
- `horarios_grupos.csv` — fuente de datos (Nombre, Ronda_1..Ronda_9).
- `scripts/build-data.js` — CSV → `public/data.json`.
- `scripts/generate-qrs.js` — un PNG por persona en `qrs/` + `qrs/hoja.html` (imprimible).
- `public/` — sitio estático (`/?p=<slug>` vista personal, `/` buscador, `/control` panel del staff).
- `api/state.js` — estado compartido del cronómetro (Vercel Function + Upstash Redis).

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
   pero el cronómetro puede reiniciarse solo.
4. (Opcional) Variable `CONTROL_PIN=1234` para que `/control` pida PIN al guardar cambios.

## El día del evento
1. Abre `https://ironlion-miembros-nuevos.vercel.app/control` en tu teléfono.
2. Ajusta minutos por ronda (5) y descanso, y pulsa **Iniciar Ronda 1 ahora**.
3. Si se retrasa el horario, usa **Forzar ronda manualmente**.
4. Imprime `qrs/hoja.html` (Ctrl+P) o reparte los PNG de `qrs/`.
# ironlion-nuevosmiembros
