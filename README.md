# Geopolis · Catastro de Arbolado

Plataforma de captura y gestión para el servicio de Catastro de Arbolado Urbano de Geopolis Consultores.

## Qué es

- **Mapa público** (`index.html`): catastro visible por cualquiera, sin login. Mapa Leaflet + lista filtrable + exportación CSV.
- **Ficha por árbol** (`arbol.html?id=`): detalle público de cada ejemplar (equivalente a "Arbotag Vecino").
- **Captura en terreno** (`captura.html`): formulario para el equipo, protegido por sesión. Se registran los datos a mano (especie, altura, DAP, diagnóstico) y se sube la fotografía.
- **Login de equipo** (`login.html`): un solo token compartido (`TEAM_TOKEN`) para censadores/administradores.

## Sobre el análisis con IA

El pipeline de visión computacional (`Arbocensus_expert_system`: SAM + Depth Anything + Grounding DINO + clasificador de especie) requiere Python/PyTorch y GPU con soporte CUDA, y no está conectado todavía. Cada árbol se guarda con `ia_estado = "pendiente"` — el campo ya existe en la base de datos para que, cuando el pipeline esté listo, un proceso pueda escribir sobre el mismo registro sin cambiar el esquema.

## Correr en local

```bash
cp .env.example .env   # editar TEAM_TOKEN
npm install
npm start               # http://localhost:4100
```

## Stack

Express + `node:sqlite` (sin dependencias nativas) + `multer` para las fotos. Frontend estático (sin build), mismo lenguaje visual que geopolis.cl (Space Grotesk / Inter / JetBrains Mono, tema oscuro cian/verde).

## Desplegar en Render (demo)

`geopolis.cl` se sirve estático desde GitHub Pages, que no puede correr este backend — por eso esta app vive en su propio servicio Node en Render.

1. Entra a [render.com](https://render.com) e inicia sesión con tu cuenta de GitHub.
2. **New +** → **Blueprint** → selecciona el repo `dannlebeau/geopolis-arbolado`. Render detecta `render.yaml` automáticamente y propone el servicio `geopolis-arbolado`.
3. Antes de confirmar, define la variable de entorno `TEAM_TOKEN` (no tiene valor por defecto, queda como secreto tuyo — no se sube al repo).
4. Deploy. La primera vez tarda unos minutos; Render te da una URL del tipo `https://geopolis-arbolado.onrender.com` (o con un sufijo si ese nombre ya está tomado).
5. Pásame esa URL final y actualizo el botón "Ver demo" en `catastro-arbolado.html` (geopolis.cl) para que apunte ahí.

**Limitaciones del tier gratis** (aceptables para una demo, no para datos reales):
- El servicio "duerme" tras ~15 min sin tráfico; la primera visita después de eso tarda 30-50s en responder.
- El disco no es persistente: cada redeploy borra la base de datos y las fotos subidas. Para producción real, hay que sumar un disco persistente de pago o migrar a Postgres.
