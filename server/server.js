require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const db = require('./db');
const auth = require('./auth');

const PORT = process.env.PORT || 4100;
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXT_POR_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = EXT_POR_MIME[file.mimetype] || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!EXT_POR_MIME[file.mimetype]) {
      return cb(new Error('Formato de imagen no soportado (usa JPG, PNG o WEBP)'));
    }
    cb(null, true);
  },
});

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '20kb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Validación ──
const LIMITES_TEXTO = {
  sector: 120, unidad_vecinal: 120, direccion: 300, tipo_superficie: 120,
  especie_comun: 200, especie_cientifica: 200, familia: 120,
  defectos_estructurales: 500, conflicto_urbano: 500, manejo_recomendado: 500,
};

function validarDatosArbol(body, { exigirEspecie }) {
  const errores = [];
  const datos = {};

  for (const campo of Object.keys(LIMITES_TEXTO)) {
    if (body[campo] === undefined) continue;
    const valor = String(body[campo]).trim();
    if (valor.length > LIMITES_TEXTO[campo]) {
      errores.push(`${campo} supera el largo máximo (${LIMITES_TEXTO[campo]})`);
      continue;
    }
    datos[campo] = valor || null;
  }

  if (exigirEspecie && !datos.especie_comun) {
    errores.push('especie_comun es obligatorio');
  }

  for (const campo of ['origen', 'tipo_hoja', 'fase_desarrollo', 'estado_fitosanitario']) {
    if (body[campo] === undefined || body[campo] === '') continue;
    if (!db.ENUMS[campo].includes(body[campo])) {
      errores.push(`${campo} inválido`);
      continue;
    }
    datos[campo] = body[campo];
  }

  if (body.lat !== undefined || exigirEspecie) {
    const lat = Number(body.lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errores.push('lat inválida');
    } else {
      datos.lat = lat;
    }
  }
  if (body.lng !== undefined || exigirEspecie) {
    const lng = Number(body.lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errores.push('lng inválida');
    } else {
      datos.lng = lng;
    }
  }

  for (const [campo, max] of [['altura', 100], ['dap', 500]]) {
    if (body[campo] === undefined || body[campo] === '') continue;
    const num = Number(body[campo]);
    if (!Number.isFinite(num) || num < 0 || num > max) {
      errores.push(`${campo} fuera de rango`);
      continue;
    }
    datos[campo] = num;
  }

  return { errores, datos };
}

// ── Sesión ──
app.get('/api/session', (req, res) => {
  res.json({ autenticado: auth.sesionActiva(req) });
});

app.post('/api/login', (req, res) => {
  const { token } = req.body || {};
  if (!process.env.TEAM_TOKEN) {
    return res.status(500).json({ error: 'Servidor no configurado (TEAM_TOKEN faltante)' });
  }
  if (!token || token !== process.env.TEAM_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  auth.iniciarSesion(res);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  auth.cerrarSesion(res);
  res.json({ ok: true });
});

// ── Árboles: lectura pública ──
app.get('/api/arboles', (req, res) => {
  res.json(db.listarArboles());
});

app.get('/api/arboles/:id', (req, res) => {
  const arbol = db.obtenerArbol(Number(req.params.id));
  if (!arbol) return res.status(404).json({ error: 'No encontrado' });
  res.json(arbol);
});

// ── Árboles: escritura, requiere sesión de equipo ──
app.post('/api/arboles', auth.requireTeamSession, (req, res) => {
  upload.single('foto')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const { errores, datos } = validarDatosArbol(req.body, { exigirEspecie: true });
    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join('; ') });
    }

    const fotoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const censador = req.body.censador ? String(req.body.censador).trim().slice(0, 120) : null;
    const arbol = db.crearArbol(datos, fotoPath, censador);
    res.status(201).json(arbol);
  });
});

app.put('/api/arboles/:id', auth.requireTeamSession, (req, res) => {
  const { errores, datos } = validarDatosArbol(req.body, { exigirEspecie: false });
  if (errores.length > 0) {
    return res.status(400).json({ error: errores.join('; ') });
  }
  const actualizado = db.actualizarArbol(Number(req.params.id), datos);
  if (!actualizado) return res.status(404).json({ error: 'No encontrado' });
  res.json(actualizado);
});

app.delete('/api/arboles/:id', auth.requireTeamSession, (req, res) => {
  const eliminado = db.eliminarArbol(Number(req.params.id));
  if (!eliminado) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
});

app.get('/api/enums', (req, res) => {
  res.json(db.ENUMS);
});

app.listen(PORT, () => {
  console.log(`Geopolis Arbolado escuchando en http://localhost:${PORT}`);
});
