const API = '/api/actividades';
const $ = id => document.getElementById(id);
let actividades = [];
let editandoId = null;

function mostrar(tipo, textos) {
  const m = $('mensaje');
  m.className = tipo;
  m.innerHTML = [].concat(textos).map(t => '<div>' + esc(t) + '</div>').join('');
  if (tipo === 'ok') setTimeout(() => { m.className = ''; }, 2500);
}
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

async function llamar(url, opciones) {
  try {
    const r = await fetch(url, opciones);
    const datos = await r.json();
    if (!r.ok) { mostrar('error', datos.errores || ['Ocurrió un error.']); return null; }
    return datos;
  } catch {
    mostrar('error', 'No se pudo conectar con el servidor. ¿Está corriendo en localhost:3000?');
    return null;
  }
}

async function cargar() {
  const datos = await llamar(API);
  if (datos) { actividades = datos; pintar(); }
}

function pintar() {
  const tbody = $('tabla');
  if (!actividades.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="vacio">Aún no hay actividades. Registra la primera arriba.</td></tr>';
    return;
  }
  tbody.innerHTML = actividades.map(a => `
    <tr class="${a.estado === 'Completada' ? 'completada' : ''}">
      <td class="nombre">${esc(a.nombre)}</td>
      <td>${esc(a.materia)}</td>
      <td class="pri ${a.prioridad}">${a.prioridad}</td>
      <td>
        <select class="estado ${a.estado.replace(' ', '-')}" data-id="${a.id}" aria-label="Estado">
          ${['Pendiente','En proceso','Completada'].map(e =>
            `<option ${e === a.estado ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </td>
      <td><div class="fila-btn">
        <button class="sec chico" data-editar="${a.id}">Editar</button>
        <button class="peligro chico" data-borrar="${a.id}">Eliminar</button>
      </div></td>
    </tr>`).join('');
}

function limpiarForm() {
  editandoId = null;
  $('form').reset();
  $('titulo-form').textContent = 'Nueva actividad';
  $('btn-guardar').textContent = 'Guardar actividad';
  $('btn-cancelar').hidden = true;
}

// Registrar o modificar
$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const cuerpo = {
    nombre: $('nombre').value.trim(),
    materia: $('materia').value.trim(),
    prioridad: $('prioridad').value
  };
  // Validación en el navegador (el servidor valida de nuevo)
  const errores = [];
  if (!cuerpo.nombre) errores.push('Escribe el nombre de la actividad.');
  if (!cuerpo.materia) errores.push('Escribe la materia.');
  if (!cuerpo.prioridad) errores.push('Selecciona una prioridad.');
  if (errores.length) return mostrar('error', errores);

  let ok;
  if (editandoId) {
    const actual = actividades.find(a => a.id === editandoId);
    ok = await llamar(`${API}/${editandoId}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ ...cuerpo, estado: actual.estado })
    });
  } else {
    ok = await llamar(API, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(cuerpo)
    });
  }
  if (ok) {
    mostrar('ok', editandoId ? 'Actividad actualizada.' : 'Actividad registrada como Pendiente.');
    limpiarForm();
    await cargar();
  }
});

$('btn-cancelar').addEventListener('click', () => { limpiarForm(); $('mensaje').className = ''; });

// Cambiar estado, editar y eliminar
$('tabla').addEventListener('change', async e => {
  if (!e.target.matches('select.estado')) return;
  const a = actividades.find(x => x.id === Number(e.target.dataset.id));
  const ok = await llamar(`${API}/${a.id}`, {
    method: 'PUT', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ ...a, estado: e.target.value })
  });
  if (ok) mostrar('ok', 'Estado actualizado.');
  await cargar();
});

$('tabla').addEventListener('click', async e => {
  const idEditar = e.target.dataset.editar, idBorrar = e.target.dataset.borrar;
  if (idEditar) {
    const a = actividades.find(x => x.id === Number(idEditar));
    editandoId = a.id;
    $('nombre').value = a.nombre; $('materia').value = a.materia; $('prioridad').value = a.prioridad;
    $('titulo-form').textContent = 'Editar actividad';
    $('btn-guardar').textContent = 'Guardar cambios';
    $('btn-cancelar').hidden = false;
    $('nombre').focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (idBorrar && confirm('¿Eliminar esta actividad?')) {
    const ok = await llamar(`${API}/${idBorrar}`, { method: 'DELETE' });
    if (ok) mostrar('ok', 'Actividad eliminada.');
    await cargar();
  }
});

cargar();
