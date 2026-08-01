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
