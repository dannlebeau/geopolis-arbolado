async function verificarSesion() {
  try {
    const r = await fetch('/api/session');
    const data = await r.json();
    return Boolean(data.autenticado);
  } catch {
    return false;
  }
}

async function cerrarSesion() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'login.html';
}

function mostrarToast(mensaje, tipo) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.className = 'toast show' + (tipo ? ' ' + tipo : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3800);
}

async function pintarEstadoNav() {
  const autenticado = await verificarSesion();
  document.querySelectorAll('[data-auth="in"]').forEach((el) => {
    el.style.display = autenticado ? '' : 'none';
  });
  document.querySelectorAll('[data-auth="out"]').forEach((el) => {
    el.style.display = autenticado ? 'none' : '';
  });
  return autenticado;
}

document.addEventListener('DOMContentLoaded', pintarEstadoNav);
