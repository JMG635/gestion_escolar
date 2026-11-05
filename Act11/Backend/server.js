const express = require('express');
const { DatabaseSync } = require('node:sqlite'); // SQLite integrado en Node.js (no requiere instalar nada)
const path = require('path');

const app = express();
const PORT = 3000;

// ---------- Base de datos (archivo escolar.db) ----------
const db = new DatabaseSync(path.join(__dirname, 'escolar.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS actividades (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    materia   TEXT NOT NULL,
    estado    TEXT NOT NULL DEFAULT 'Pendiente',
    prioridad TEXT NOT NULL
  )
`);

const ESTADOS = ['Pendiente', 'En proceso', 'Completada'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

// ---------- Validación ----------
function validar(body, esCreacion) {
  const errores = [];
  const nombre = (body.nombre ?? '').toString().trim();
  const materia = (body.materia ?? '').toString().trim();
  const prioridad = (body.prioridad ?? '').toString().trim();
  const estado = esCreacion ? 'Pendiente' : (body.estado ?? '').toString().trim();

  if (!nombre) errores.push('El nombre de la actividad es obligatorio.');
  else if (nombre.length > 100) errores.push('El nombre no puede pasar de 100 caracteres.');
  if (!materia) errores.push('La materia es obligatoria.');
  else if (materia.length > 60) errores.push('La materia no puede pasar de 60 caracteres.');
  if (!PRIORIDADES.includes(prioridad)) errores.push('La prioridad debe ser Alta, Media o Baja.');
  if (!ESTADOS.includes(estado)) errores.push('El estado debe ser Pendiente, En proceso o Completada.');

  return { errores, datos: { nombre, materia, prioridad, estado } };
}

// ---------- API REST ----------
// Consultar todas
app.get('/api/actividades', (req, res) => {
  const filas = db.prepare(`
    SELECT * FROM actividades
    ORDER BY CASE prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END, id DESC
  `).all();
  res.json(filas);
});

// Registrar (estado inicial siempre Pendiente)
app.post('/api/actividades', (req, res) => {
  const { errores, datos } = validar(req.body, true);
  if (errores.length) return res.status(400).json({ errores });
  const r = db.prepare(
    'INSERT INTO actividades (nombre, materia, estado, prioridad) VALUES (?, ?, ?, ?)'
  ).run(datos.nombre, datos.materia, 'Pendiente', datos.prioridad);
  res.status(201).json({ id: r.lastInsertRowid, ...datos, estado: 'Pendiente' });
});

// Modificar (datos y/o estado)
app.put('/api/actividades/:id', (req, res) => {
  const id = Number(req.params.id);
  const existe = db.prepare('SELECT id FROM actividades WHERE id = ?').get(id);
  if (!existe) return res.status(404).json({ errores: ['La actividad no existe.'] });

  const { errores, datos } = validar(req.body, false);
  if (errores.length) return res.status(400).json({ errores });
  db.prepare(
    'UPDATE actividades SET nombre = ?, materia = ?, estado = ?, prioridad = ? WHERE id = ?'
  ).run(datos.nombre, datos.materia, datos.estado, datos.prioridad, id);
  res.json({ id, ...datos });
});

// Eliminar
app.delete('/api/actividades/:id', (req, res) => {
  const r = db.prepare('DELETE FROM actividades WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) return res.status(404).json({ errores: ['La actividad no existe.'] });
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));