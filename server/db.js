const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'arbolado.db');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS arboles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sector TEXT,
    unidad_vecinal TEXT,
    direccion TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    tipo_superficie TEXT,
    especie_comun TEXT NOT NULL,
    especie_cientifica TEXT,
    familia TEXT,
    origen TEXT,
    tipo_hoja TEXT,
    fase_desarrollo TEXT,
    altura REAL,
    dap REAL,
    estado_fitosanitario TEXT,
    defectos_estructurales TEXT,
    conflicto_urbano TEXT,
    manejo_recomendado TEXT,
    foto_path TEXT,
    ia_estado TEXT NOT NULL DEFAULT 'pendiente',
    censador TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const ENUMS = {
  origen: ['Nativa', 'Endémica', 'Exótica'],
  tipo_hoja: ['Caduca', 'Perenne'],
  fase_desarrollo: ['Juvenil', 'Adulto', 'Maduro'],
  estado_fitosanitario: ['Sano', 'No sano'],
};

const CAMPOS_EDITABLES = [
  'sector', 'unidad_vecinal', 'direccion', 'lat', 'lng', 'tipo_superficie',
  'especie_comun', 'especie_cientifica', 'familia', 'origen', 'tipo_hoja',
  'fase_desarrollo', 'altura', 'dap', 'estado_fitosanitario',
  'defectos_estructurales', 'conflicto_urbano', 'manejo_recomendado',
];

function listarArboles() {
  return db.prepare('SELECT * FROM arboles ORDER BY created_at DESC').all();
}

function obtenerArbol(id) {
  return db.prepare('SELECT * FROM arboles WHERE id = ?').get(id);
}

function crearArbol(datos, fotoPath, censador) {
  const ahora = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO arboles (
      sector, unidad_vecinal, direccion, lat, lng, tipo_superficie,
      especie_comun, especie_cientifica, familia, origen, tipo_hoja,
      fase_desarrollo, altura, dap, estado_fitosanitario,
      defectos_estructurales, conflicto_urbano, manejo_recomendado,
      foto_path, ia_estado, censador, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const info = stmt.run(
    datos.sector || null,
    datos.unidad_vecinal || null,
    datos.direccion || null,
    datos.lat,
    datos.lng,
    datos.tipo_superficie || null,
    datos.especie_comun,
    datos.especie_cientifica || null,
    datos.familia || null,
    datos.origen || null,
    datos.tipo_hoja || null,
    datos.fase_desarrollo || null,
    datos.altura ?? null,
    datos.dap ?? null,
    datos.estado_fitosanitario || null,
    datos.defectos_estructurales || null,
    datos.conflicto_urbano || null,
    datos.manejo_recomendado || null,
    fotoPath || null,
    'pendiente',
    censador || null,
    ahora,
    ahora
  );
  return obtenerArbol(Number(info.lastInsertRowid));
}

function actualizarArbol(id, datos) {
  const actual = obtenerArbol(id);
  if (!actual) return null;

  const set = [];
  const valores = [];
  for (const campo of CAMPOS_EDITABLES) {
    if (Object.prototype.hasOwnProperty.call(datos, campo)) {
      set.push(`${campo} = ?`);
      valores.push(datos[campo]);
    }
  }
  if (set.length === 0) return actual;

  set.push('updated_at = ?');
  valores.push(new Date().toISOString());
  valores.push(id);

  db.prepare(`UPDATE arboles SET ${set.join(', ')} WHERE id = ?`).run(...valores);
  return obtenerArbol(id);
}

function eliminarArbol(id) {
  const actual = obtenerArbol(id);
  if (!actual) return null;
  db.prepare('DELETE FROM arboles WHERE id = ?').run(id);
  return actual;
}

module.exports = {
  ENUMS,
  listarArboles,
  obtenerArbol,
  crearArbol,
  actualizarArbol,
  eliminarArbol,
};
