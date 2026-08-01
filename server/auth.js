const SESSION_COOKIE = 'arbolado_session';

function requireTeamSession(req, res, next) {
  if (!process.env.TEAM_TOKEN) {
    return res.status(500).json({ error: 'Servidor no configurado (TEAM_TOKEN faltante)' });
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (!cookieToken || cookieToken !== process.env.TEAM_TOKEN) {
    return res.status(401).json({ error: 'Sesión de equipo requerida' });
  }
  next();
}

function iniciarSesion(res) {
  res.cookie(SESSION_COOKIE, process.env.TEAM_TOKEN, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000, // 12 horas
  });
}

function cerrarSesion(res) {
  res.clearCookie(SESSION_COOKIE);
}

function sesionActiva(req) {
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  return Boolean(cookieToken && process.env.TEAM_TOKEN && cookieToken === process.env.TEAM_TOKEN);
}

module.exports = {
  requireTeamSession,
  iniciarSesion,
  cerrarSesion,
  sesionActiva,
};
