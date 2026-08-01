let mapa, capaMarcadores;
let arboles = [];

function iconoEstado(estado) {
  const color = estado === 'No sano' ? '#e35b5b' : '#56bf56';
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #050d1a;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function initMapa() {
  mapa = L.map('map').setView([-33.45, -70.65], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20,
  }).addTo(mapa);
  capaMarcadores = L.layerGroup().addTo(mapa);
}

function renderStats(lista) {
  const total = lista.length;
  const sanos = lista.filter((a) => a.estado_fitosanitario === 'Sano').length;
  const noSanos = lista.filter((a) => a.estado_fitosanitario === 'No sano').length;
  const iaPendiente = lista.filter((a) => a.ia_estado === 'pendiente').length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-mini"><div class="num">${total}</div><div class="lbl">Árboles catastrados</div></div>
    <div class="stat-mini"><div class="num">${sanos}</div><div class="lbl">Estado sano</div></div>
    <div class="stat-mini"><div class="num">${noSanos}</div><div class="lbl">Requieren manejo</div></div>
    <div class="stat-mini"><div class="num">${iaPendiente}</div><div class="lbl">Análisis IA pendiente</div></div>
  `;
}

function renderLista(lista) {
  const cont = document.getElementById('treeList');
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state"><i class="fas fa-tree"></i>Aún no hay árboles catastrados.</div>`;
    return;
  }
  cont.innerHTML = lista.map((a) => `
    <div class="tree-item" data-id="${a.id}" onclick="window.location.href='arbol.html?id=${a.id}'">
      <div class="row">
        <h4>${escapeHtml(a.especie_comun)}</h4>
        <span class="badge ${a.estado_fitosanitario === 'No sano' ? 'no-sano' : 'sano'}">
          <span class="badge-dot"></span>${a.estado_fitosanitario || 'Sin evaluar'}
        </span>
      </div>
      <p>${escapeHtml(a.direccion || a.sector || 'Sin dirección registrada')}</p>
    </div>
  `).join('');
}

function renderMarcadores(lista) {
  capaMarcadores.clearLayers();
  const puntos = [];
  lista.forEach((a) => {
    const marker = L.marker([a.lat, a.lng], { icon: iconoEstado(a.estado_fitosanitario) });
    marker.bindPopup(`
      <strong>${escapeHtml(a.especie_comun)}</strong><br>
      ${escapeHtml(a.direccion || '')}<br>
      <a href="arbol.html?id=${a.id}">Ver ficha</a>
    `);
    marker.addTo(capaMarcadores);
    puntos.push([a.lat, a.lng]);
  });
  if (puntos.length > 0) {
    mapa.fitBounds(puntos, { maxZoom: 15, padding: [30, 30] });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function aplicarFiltros() {
  const busqueda = document.getElementById('fBusqueda').value.trim().toLowerCase();
  const origen = document.getElementById('fOrigen').value;
  const estado = document.getElementById('fEstado').value;

  const filtrados = arboles.filter((a) => {
    if (origen && a.origen !== origen) return false;
    if (estado && a.estado_fitosanitario !== estado) return false;
    if (busqueda) {
      const texto = `${a.direccion || ''} ${a.sector || ''}`.toLowerCase();
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  });

  renderStats(filtrados);
  renderLista(filtrados);
  renderMarcadores(filtrados);
}

function poblarSelects(enums) {
  const selOrigen = document.getElementById('fOrigen');
  enums.origen.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    selOrigen.appendChild(opt);
  });
  const selEstado = document.getElementById('fEstado');
  enums.estado_fitosanitario.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    selEstado.appendChild(opt);
  });
}

function exportarCsv() {
  if (arboles.length === 0) {
    mostrarToast('No hay árboles para exportar', 'error');
    return;
  }
  const columnas = [
    'id', 'sector', 'unidad_vecinal', 'direccion', 'lat', 'lng',
    'especie_comun', 'especie_cientifica', 'familia', 'origen', 'tipo_hoja',
    'fase_desarrollo', 'altura', 'dap', 'estado_fitosanitario',
    'defectos_estructurales', 'conflicto_urbano', 'manejo_recomendado', 'ia_estado',
  ];
  const filas = [columnas.join(',')];
  arboles.forEach((a) => {
    filas.push(columnas.map((c) => {
      const v = a[c] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
  });
  const blob = new Blob([filas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'catastro-arbolado.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function init() {
  initMapa();
  try {
    const [resArboles, resEnums] = await Promise.all([
      fetch('/api/arboles'),
      fetch('/api/enums'),
    ]);
    arboles = await resArboles.json();
    poblarSelects(await resEnums.json());
    aplicarFiltros();
  } catch (err) {
    mostrarToast('No se pudo cargar el catastro', 'error');
  }

  document.getElementById('fBusqueda').addEventListener('input', aplicarFiltros);
  document.getElementById('fOrigen').addEventListener('change', aplicarFiltros);
  document.getElementById('fEstado').addEventListener('change', aplicarFiltros);
  document.getElementById('btnExportar').addEventListener('click', exportarCsv);
}

init();
