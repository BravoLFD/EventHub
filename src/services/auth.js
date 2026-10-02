const AUTH_KEY = "eventhub_session";

export function guardarSesion(data) {
  const sesion = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    usuario: data.usuario,
    created_at: Date.now(),
  };

  sessionStorage.setItem(AUTH_KEY, JSON.stringify(sesion));
}

export function obtenerSesion() {
  const data = sessionStorage.getItem(AUTH_KEY);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function obtenerAccessToken() {
  return obtenerSesion()?.access_token || null;
}

export function cerrarSesion() {
  sessionStorage.removeItem(AUTH_KEY);
}

export function estaAutenticado() {
  return Boolean(obtenerAccessToken());
}