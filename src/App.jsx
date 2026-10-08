import "./App.css";
import logo_EventHub from "./assets/Logo.png";
import logo_Jaguar from "./assets/Logo_Jaguar.png";
import { FaLock, FaEye, FaEyeSlash, FaDoorOpen, FaSyncAlt, FaTrashAlt } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import {
  actualizarEvento,
  actualizarSubtarea,
  actualizarConfiguracionUsuario,
  crearEvento,
  crearSubtarea,
  eliminarEvento,
  eliminarSubtarea,
  iniciarSesion,
  registrarUsuario,
  obtenerConfiguracionUsuario,
  obtenerHoy,
  obtenerEvento,
  obtenerEventos,
  obtenerSubtareas,
  actualizarParcialSubtarea,
} from "./services/api.js";
import {
  cerrarSesion,
  estaAutenticado,
  guardarSesion,
} from "./services/auth.js";

const rutas = ["/login", "/registro", "/registro/onboarding", "/eventos", "/hoy", "/crear-evento", "/configuracion"];

function rutaActual() {
  const path = window.location.pathname;
  if (path.startsWith("/eventos/") && path.split("/")[2]) return path;
  return rutas.includes(path) ? path : "/eventos";
}
function esRutaPublica(path) {
  return path === "/login" || path === "/registro";
}
function esRutaPrivada(path) {
  return (
    path === "/eventos" ||
    path === "/hoy" ||
    path === "/crear-evento" ||
    path === "/configuracion" ||
    path === "/progreso" ||
    path === "/registro/onboarding" ||
    path.startsWith("/eventos/")
  );
}
function obtenerRutaInicial() {
  const path = window.location.pathname;

  if (esRutaPublica(path)) {
    return estaAutenticado() ? "/eventos" : path;
  }

  if (esRutaPrivada(path)) {
    return estaAutenticado() ? rutaActual() : "/login";
  }

  return estaAutenticado() ? "/eventos" : "/login";
}

function navegar(path) {
  if (esRutaPrivada(path) && !estaAutenticado()) {
    path = "/login";
  }

  if (
    path === "/login" &&
    estaAutenticado()
  ) {
    path = "/eventos";
  }

  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }

  window.dispatchEvent(
    new PopStateEvent("popstate", { state: { eventhubInternalNavigation: true } })
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";
  const [y, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return fecha;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
}

function normalizarEstado(estado) {
  const value = String(estado || "pendiente").trim().toLowerCase();
  if (value === "hecho" || value === "hecha" || value.includes("complet")) return "hecho";
  if (value === "pospuesto") return "pospuesto";
  return "pendiente";
}

function etiquetaEstado(estado) {
  const value = normalizarEstado(estado);
  if (value === "hecho") return "Hecho";
  if (value === "pospuesto") return "Pospuesto";
  return "Pendiente";
}

function obtenerHoras(item) {
  const value = Number(item?.horas_estimadas ?? item?.horas ?? item?.hours ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function obtenerTituloSubtarea(item) {
  return item?.titulo ?? item?.nombre ?? "Sin título";
}

function Toast({ type = "success", message }) {
  if (!message) return null;
  return <div className={`toast toast-${type}`} role={type === "error" ? "alert" : "status"}>{type === "success" ? "✓" : "!"} {message}</div>;
}

function Modal({ title, subtitle, close, children, wide = false }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button ref={closeRef} className="close" type="button" aria-label="Cerrar" onClick={close}>×</button>
        <h2 id="modal-title">{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}

function Header({ ruta, abrirCrear, busquedaEventos, onBuscarEventos }) {
  const [mostrarCerrarSesion, setMostrarCerrarSesion] = useState(false);

  const confirmarCerrarSesion = () => {
    cerrarSesion();
    navegar("/login");
  };

  return (
    <>
      <header>
        <button
          className="brand"
          type="button"
          onClick={() => navegar("/eventos")}
        >
          <img
            src={logo_Jaguar}
            alt="Jaguar EventHub"
            className="brand-logo"
          />
          <span>EventHub</span>
        </button>

        <nav aria-label="Navegación principal">
          <button
            className={
              ruta === "/eventos" || ruta.startsWith("/eventos/")
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() => navegar("/eventos")}
          >
            ✦ Eventos
          </button>

          <button
            className={ruta === "/hoy" ? "nav-link active" : "nav-link"}
            onClick={() => navegar("/hoy")}
          >
            Hoy
          </button>
        </nav>

        <div className="header-spacer" />

        <form
          className="search-placeholder"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            navegar("/eventos");
          }}
        >
          <label htmlFor="header-event-search" aria-label="Buscar eventos">⌕</label>
          <input
            id="header-event-search"
            type="search"
            placeholder="Buscar eventos..."
            value={busquedaEventos}
            onChange={(event) => onBuscarEventos(event.target.value)}
          />
        </form>

        <button
          className="icon-button"
          type="button"
          aria-label="Notificaciones"
        >
          ☾
        </button>

        <button
          className="icon-button"
          type="button"
          aria-label="Ayuda"
        >
          ?
        </button>

        <button
          className="btn primary header-create"
          type="button"
          onClick={abrirCrear}
        >
          ＋ Crear Evento
        </button>

        <button
          className="avatar"
          type="button"
          aria-label="Abrir configuración"
          onClick={() => navegar("/configuracion")}
        >
          LV
        </button>

        <button
          className="icon-button logout-button"
          type="button"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={() => setMostrarCerrarSesion(true)}
        >
          <FaDoorOpen aria-hidden="true" />
        </button>
      </header>

      {mostrarCerrarSesion && (
        <Modal
          title="¿Deseas cerrar sesión?"
          subtitle="Tu sesión se cerrará en este dispositivo."
          close={() => setMostrarCerrarSesion(false)}
        >
          <div className="logout-confirmation">
            <div className="logout-confirmation-icon">
              <FaDoorOpen aria-hidden="true" />
            </div>

            <p>
              Si cierras sesión, tendrás que iniciar sesión nuevamente
              para acceder a EventHub.
            </p>

            <div className="logout-confirmation-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setMostrarCerrarSesion(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn danger"
                onClick={confirmarCerrarSesion}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
{/* Login */ }
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const validar = () => {
    const next = {};

    if (!email.trim()) {
      next.email = "El correo electrónico es requerido.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Ingresa un correo electrónico válido.";
    }

    if (!password) {
      next.password = "La contraseña es requerida.";
    }

    return next;
  };

  const enviar = async (event) => {
    event.preventDefault();

    const next = validar();

    setErrores(next);
    setErrorServidor("");

    if (Object.keys(next).length > 0) {
      return;
    }

    setEnviando(true);

    try {
      const data = await iniciarSesion(
        email.trim(),
        password
      );

      guardarSesion(data);

      onLogin();
    } catch (error) {
      setErrorServidor(
        error.message || "No fue posible iniciar sesión."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">

        {/* LOGO */}
        <div className="login-brand">
          <img
            src={logo_EventHub}
            alt="EventHub"
            className="login-logo"
          />

          <h1 className="login-subtitle">
            INICIAR SESION
          </h1>

          <span className="security-badge">
            🛡 Portal Operativo Seguro
          </span>
        </div>

        {/* ERROR DEL SERVIDOR */}
        {errorServidor && (
          <div className="login-error" role="alert">
            <strong>No fue posible iniciar sesión.</strong>
            <span>{errorServidor}</span>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={enviar} noValidate>

          <div className="login-field">
            <label htmlFor="login-email">
              Correo electrónico o usuario
            </label>

            <div className="login-input-wrapper">
              <span className="login-input-icon">✉</span>

              <input
                id="login-email"
                type="email"
                placeholder="ejemplo@organizacion.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);

                  setErrores((prev) => ({
                    ...prev,
                    email: "",
                  }));

                  setErrorServidor("");
                }}
                autoComplete="email"
                autoFocus
                aria-invalid={Boolean(errores.email)}
                className={errores.email ? "input-error" : ""}
              />
            </div>

            {errores.email && (
              <p className="inline-error" role="alert">
                {errores.email}
              </p>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="login-password">
              Contraseña
            </label>

            <div className="login-input-wrapper">
              <span className="login-input-icon">♙</span>

              <input
                id="login-password"
                type={mostrarPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);

                  setErrores((prev) => ({
                    ...prev,
                    password: "",
                  }));

                  setErrorServidor("");
                }}
                autoComplete="current-password"
                aria-invalid={Boolean(errores.password)}
                className={errores.password ? "input-error" : ""}
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setMostrarPassword((prev) => !prev)}
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>

            {errores.password && (
              <p className="inline-error" role="alert">
                {errores.password}
              </p>
            )}
          </div>

          {/* OPCIONES */}
          <div className="login-options">

            <label className="remember-option">
              <input type="checkbox" />
              <span>
                Recordar sesión en este equipo
              </span>
            </label>

            <button
              type="button"
              className="forgot-password"
              disabled
            >
              ¿Olvidaste tu contraseña?
            </button>

          </div>

          {/* LOGIN */}
          <button
            className="login-submit"
            type="submit"
            disabled={enviando}
          >
            {enviando
              ? "Iniciando sesión..."
              : (
                <>
                  Iniciar Sesión
                  <span>→</span>
                </>
              )}
          </button>

        </form>

        {/* REGISTRO */}
        <div className="login-register">
          <span>¿Eres un usuario nuevo?</span>

          <button
            type="button"
            onClick={() => navegar("/registro")}
          >
            Regístrate
          </button>
        </div>

        {/* AVISO DE SEGURIDAD */}
        <div className="security-message">
          <FaLock className="security-message-icon" />

          <span>
            Conexión cifrada de extremo a extremo.
            Acceso exclusivo para organizadores autorizados.
          </span>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="login-footer">
        <p>EventHub © 2025 • Todos los derechos reservados.</p>

        <div>
          <button type="button">Términos de servicio</button>
          <span>•</span>
          <button type="button">Política de privacidad</button>
          <span>•</span>
          <button type="button">Soporte TI</button>
        </div>
      </footer>

    </main>
  );
}

function FormularioEvento({ onCancelar, onCrear, onProgress }) {
  const [formulario, setFormulario] = useState({
    titulo: "",
    fecha: "",
    horas: "",
    usuario_responsable: "",
    descripcion: "",
  });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [crearSubtareaInicial, setCrearSubtareaInicial] = useState(false);
  const [subtarea, setSubtarea] = useState({
    titulo: "",
    horas_estimadas: "",
    estado: "",
  });
  const [errorSubtarea, setErrorSubtarea] = useState("");

  useEffect(() => {
    onProgress?.({
      porcentaje: 0,
      pasosCompletados: 0,
      pasos: [false, false, false, false],
    });
  }, [onProgress]);

  const actualizar = (event) => {
    const { name, value } = event.target;

    setFormulario((prev) => {
      const siguiente = { ...prev, [name]: value };

      const pasosCompletados = [
        Boolean(siguiente.titulo.trim()),
        Boolean(siguiente.fecha),
        Boolean(
          siguiente.horas &&
          Number(siguiente.horas) >= 1 &&
          Number(siguiente.horas) <= 24 &&
          Number.isInteger(Number(siguiente.horas))
        ),
        Boolean(siguiente.usuario_responsable.trim()),
      ].filter(Boolean).length;

      onProgress?.({
        porcentaje: Math.round((pasosCompletados / 4) * 100),
        pasosCompletados,
        pasos: [
          Boolean(siguiente.titulo.trim()),
          Boolean(siguiente.fecha),
          Boolean(
            siguiente.horas &&
            Number(siguiente.horas) >= 1 &&
            Number(siguiente.horas) <= 24 &&
            Number.isInteger(Number(siguiente.horas))
          ),
          Boolean(siguiente.usuario_responsable.trim()),
        ],
      });

      return siguiente;
    });

    setErrores((prev) => ({ ...prev, [name]: "" }));
    setErrorServidor("");
  };

  const validar = () => {
    const next = {};

    if (!formulario.titulo.trim()) {
      next.titulo = "El título es requerido.";
    }

    const hoy = obtenerFechaLocalHoy();

    if (!formulario.fecha) {
      next.fecha = "La fecha del evento es requerida.";
    } else if (formulario.fecha < hoy) {
      next.fecha = "La fecha del evento no puede ser anterior a hoy.";
    }

    const horas = Number(formulario.horas);

    if (
      !formulario.horas ||
      horas <= 0 ||
      !Number.isInteger(horas)
    ) {
      next.horas = "Las horas deben ser mayor a 0.";
    } else if (horas > 24) {
      next.horas = "Las horas no pueden ser mayores a 24.";
    }

    if (!formulario.usuario_responsable.trim()) {
      next.usuario_responsable = "El usuario responsable es requerido.";
    }

    return next;
  };

  const enviar = async (event) => {
    event.preventDefault();
    const next = validar();
    setErrores(next);
    setErrorServidor("");
    if (crearSubtareaInicial) {
      const erroresSubtarea = [];
      if (!subtarea.titulo.trim()) erroresSubtarea.push("indica el nombre");
      if (
        !subtarea.horas_estimadas ||
        Number(subtarea.horas_estimadas) <= 0 ||
        Number(subtarea.horas_estimadas) > 24 ||
        !Number.isInteger(Number(subtarea.horas_estimadas))
      ) {
        erroresSubtarea.push("indica las horas (de 1 a 24)");
      }
      if (!subtarea.estado) erroresSubtarea.push("selecciona el estado");
      if (!formulario.fecha) erroresSubtarea.push("indica la fecha del evento");

      if (erroresSubtarea.length) {
        setErrorSubtarea(`Para crear la subtarea, ${erroresSubtarea.join(", ")}.`);
        return;
      }
    }
    setErrorSubtarea("");
    if (Object.keys(next).length) return;

    setEnviando(true);
    try {
      await onCrear({
        titulo: formulario.titulo.trim(),
        fecha: formulario.fecha,
        horas: Number(formulario.horas),
        usuario_responsable: formulario.usuario_responsable.trim(),
        descripcion: formulario.descripcion.trim() || null,
      }, crearSubtareaInicial ? {
        titulo: subtarea.titulo.trim(),
        horas_estimadas: Number(subtarea.horas_estimadas),
        estado: subtarea.estado,
        dia_objetivo: formulario.fecha,
      } : null);
    } catch (error) {
      setErrorServidor(error.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <div className="field-header"><label htmlFor="titulo">Título del evento <span>*</span></label><small>Obligatorio</small></div>
      <input id="titulo" name="titulo" value={formulario.titulo} onChange={actualizar} placeholder="Ej. Conferencia de Tecnología 2026" aria-invalid={Boolean(errores.titulo)} autoFocus />
      {errores.titulo && <p className="inline-error" role="alert">{errores.titulo}</p>}

      <div className="form-two-columns">
        <div>
          <div className="field-header"><label htmlFor="fecha">Fecha del evento <span>*</span></label><small>Obligatorio</small></div>
          <input
            id="fecha"
            name="fecha"
            type="date"
            min={obtenerFechaLocalHoy()}
            value={formulario.fecha}
            onChange={actualizar}
            aria-invalid={Boolean(errores.fecha)}
          />
          {errores.fecha ? (
            <p className="inline-error" role="alert">{errores.fecha}</p>
          ) : (
            <p className="helper">ⓘ La fecha debe ser hoy o una fecha futura</p>
          )}
        </div>
        <div>
          <div className="field-header"><label htmlFor="horas">Horas <span>*</span></label><small>Duración estimada</small></div>
          <input
            id="horas"
            name="horas"
            type="number"
            min="1"
            max="24"
            step="1"
            value={formulario.horas}
            onChange={actualizar}
            placeholder="4"
            aria-invalid={Boolean(errores.horas)}
          />
          {errores.horas && <p className="inline-error" role="alert">{errores.horas}</p>}
          {!errores.horas && <p className="helper">ⓘ Las horas deben ser entre 1 y 24</p>}
        </div>
      </div>

      <div className="field-header">
        <label htmlFor="usuario_responsable">
          Usuario responsable <span>*</span>
        </label>
        <small>Obligatorio</small>
      </div>

      <input
        id="usuario_responsable"
        name="usuario_responsable"
        value={formulario.usuario_responsable}
        onChange={actualizar}
        placeholder="Ej. Laura V. (Coordinadora General)"
        aria-invalid={Boolean(errores.usuario_responsable)}
      />

      {errores.usuario_responsable && (
        <p className="inline-error" role="alert">
          {errores.usuario_responsable}
        </p>
      )}

      <div className="field-header"><label htmlFor="descripcion">Descripción</label><small>Opcional</small></div>
      <textarea id="descripcion" name="descripcion" value={formulario.descripcion} onChange={actualizar} placeholder="Describe el objetivo, alcance o información útil del evento." />

      <section className="create-event-subtask">
        <label className="create-event-subtask-toggle">
          <input
            type="checkbox"
            checked={crearSubtareaInicial}
            onChange={(event) => {
              setCrearSubtareaInicial(event.target.checked);
              setErrorSubtarea("");
            }}
          />
          <span>
            <strong>Crear una subtarea</strong>
            <small>Se guardará vinculada a este evento y con su fecha de realización.</small>
          </span>
        </label>
        {crearSubtareaInicial && (
          <div className="create-event-subtask-fields">
            <div className="field-header">
              <label htmlFor="evento-subtarea-titulo">Nombre de la subtarea <span>*</span></label>
            </div>
            <input
              id="evento-subtarea-titulo"
              value={subtarea.titulo}
              onChange={(event) =>
                setSubtarea((prev) => ({ ...prev, titulo: event.target.value }))
              }
              placeholder="Ej. Preparar presentación"
            />
            <div className="form-two-columns">
              <div>
                <div className="field-header">
                  <label htmlFor="evento-subtarea-horas">Horas <span>*</span></label>
                </div>
                <input
                  id="evento-subtarea-horas"
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  value={subtarea.horas_estimadas}
                  onChange={(event) =>
                    setSubtarea((prev) => ({
                      ...prev,
                      horas_estimadas: event.target.value,
                    }))
                  }
                  placeholder="2"
                />
              </div>
              <div>
                <div className="field-header">
                  <label htmlFor="evento-subtarea-estado">Estado</label>
                </div>
                <select
                  id="evento-subtarea-estado"
                  value={subtarea.estado}
                  onChange={(event) =>
                    setSubtarea((prev) => ({ ...prev, estado: event.target.value }))
                  }
                >
                  <option value="">Selecciona un estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="hecho">Hecho</option>
                  <option value="pospuesto">Pospuesto</option>
                </select>
              </div>
            </div>
            <div className="field-header">
              <label htmlFor="evento-subtarea-fecha">Fecha límite <span>*</span></label>
            </div>
            <input
              id="evento-subtarea-fecha"
              type="date"
              value={formulario.fecha}
              readOnly
              disabled={!formulario.fecha}
              aria-invalid={!formulario.fecha}
            />
            <p className="helper">
              La fecha límite corresponde al día del evento
              {formulario.fecha ? ` (${formatearFecha(formulario.fecha)})` : "."}
            </p>
            {errorSubtarea && <p className="inline-error" role="alert">{errorSubtarea}</p>}
          </div>
        )}
      </section>

      {errorServidor && <div className="alert alert-error" role="alert"><b>No fue posible crear el evento.</b><span>{errorServidor}</span></div>}
      <div className="actions">
        <button className="btn ghost" type="button" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button className="btn primary" type="submit" disabled={enviando}>{enviando && <span className="mini-spinner" />} {enviando ? "Creando…" : "Crear evento"}</button>
      </div>
    </form>
  );
}

function CrearSubtareaForm({ eventoId, eventoFecha, onCancelar, onCreada }) {
  const [form, setForm] = useState({
    nombre: "",
    horas: "",
    estado: "pendiente",
    dia_objetivo: eventoFecha || "",
  });

  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const actualizar = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrores((prev) => ({
      ...prev,
      [name]: "",
    }));

    setErrorServidor("");
  };

  const enviar = async (event) => {
    event.preventDefault();

    const next = {};

    if (!form.nombre.trim()) {
      next.nombre = "El nombre de la subtarea es requerido.";
    }

    if (
      !form.horas ||
      Number(form.horas) <= 0 ||
      !Number.isInteger(Number(form.horas))
    ) {
      next.horas = "Las horas deben ser mayor a 0.";
    }

    if (!form.dia_objetivo) {
      next.dia_objetivo = "La fecha del evento es requerida.";
    }
    setErrores(next);

    if (Object.keys(next).length) return;

    setEnviando(true);
    setErrorServidor("");

    try {
      await crearSubtarea({
        evento_id: eventoId,
        titulo: form.nombre.trim(),
        dia_objetivo: form.dia_objetivo,
        horas_estimadas: Number(form.horas),
        estado: form.estado,
      });

      onCreada();
    } catch (error) {
      console.error("Error al crear subtarea:", error);
      setErrorServidor(
        error.message || "No fue posible crear la subtarea."
      );
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <div className="field-header">
        <label htmlFor="sub-nombre">
          Nombre de la subtarea <span>*</span>
        </label>
      </div>

      <input
        id="sub-nombre"
        name="nombre"
        value={form.nombre}
        onChange={actualizar}
        placeholder="Ej. Preparar presentación"
        aria-invalid={Boolean(errores.nombre)}
        autoFocus
      />

      {errores.nombre && (
        <p className="inline-error" role="alert">
          X {errores.nombre}
        </p>
      )}

      <div className="form-two-columns">
        <div>
          <div className="field-header">
            <label htmlFor="sub-horas">
              Horas <span>*</span>
            </label>
          </div>

          <input
            id="sub-horas"
            name="horas"
            type="number"
            min="1"
            max="24"
            step="1"
            value={form.horas}
            onChange={actualizar}
            placeholder="2"
            aria-invalid={Boolean(errores.horas)}
          />

          {errores.horas ? (
            <p className="inline-error" role="alert">
              X {errores.horas}
            </p>
          ) : (
            <p className="helper">
              ⓘ Las horas deben ser entre 1 y 24
            </p>
          )}
        </div>

        <div>
          <div className="field-header">
            <label htmlFor="sub-estado">Estado</label>
          </div>

          <select
            id="sub-estado"
            name="estado"
            value={form.estado}
            onChange={actualizar}
          >
            <option value="pendiente">Pendiente</option>
            <option value="hecho">Hecho</option>
            <option value="pospuesto">Pospuesto</option>
          </select>

          <p className="helper">
            Estado inicial asignado
          </p>
        </div>
      </div>

      <div className="field-header">
        <label htmlFor="sub-dia-objetivo">
          Fecha límite <span>*</span>
        </label>
      </div>

      <input
        id="sub-dia-objetivo"
        name="dia_objetivo"
        type="date"
        disabled
        value={form.dia_objetivo}
        aria-invalid={Boolean(errores.dia_objetivo)}
      />
      <p className="helper">La fecha límite corresponde al día del evento.</p>

      {errores.dia_objetivo && (
        <p className="inline-error" role="alert">
          X {errores.dia_objetivo}
        </p>
      )}

      {errorServidor && (
        <div className="alert alert-error" role="alert">
          <b>No fue posible crear la subtarea.</b>
          <span>{errorServidor}</span>
        </div>
      )}

      <div className="actions">
        <button
          className="btn ghost"
          type="button"
          onClick={onCancelar}
          disabled={enviando}
        >
          Cancelar
        </button>

        <button
          className="btn primary"
          type="submit"
          disabled={enviando}
        >
          {enviando && <span className="mini-spinner" />}
          {enviando ? "Creando…" : "Crear subtarea"}
        </button>
      </div>
    </form>
  );
}


function ConfirmModal({ title, message, confirmLabel = "Eliminar", close, onConfirm, loading = false }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && !loading && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, loading]);

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && !loading && close()}>
      <section className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className="confirm-icon">!</div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message" className="modal-subtitle">{message}</p>
        <div className="actions">
          <button ref={cancelRef} className="btn ghost" type="button" onClick={close} disabled={loading}>Cancelar</button>
          <button className="btn danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading && <span className="mini-spinner danger-spinner" />}
            {loading ? "Eliminando…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function EditarEventoForm({ evento, onCancelar, onGuardado }) {
  const responsable = typeof evento?.usuario_responsable === "object" ? evento.usuario_responsable?.nombre : evento?.usuario_responsable;
  const [formulario, setFormulario] = useState({
    titulo: evento?.titulo || "",
    fecha: String(evento?.fecha || "").slice(0, 10),
    horas: evento?.horas ?? "",
    usuario_responsable: responsable || "",
    descripcion: evento?.descripcion || "",
  });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [guardando, setGuardando] = useState(false);

  const actualizar = (event) => {
    const { name, value } = event.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: "" }));
    setErrorServidor("");
  };

  const validar = () => {
    const next = {};

    if (formulario.titulo.trim().length < 3) {
      next.titulo = "El título debe tener al menos 3 caracteres.";
    } else if (formulario.titulo.trim().length < 5) {
      next.titulo = "El título debe tener al menos 5 caracteres.";
    }

    const hoy = obtenerFechaLocalHoy();

    if (!formulario.fecha) {
      next.fecha = "La fecha del evento es requerida.";
    } else if (formulario.fecha < hoy) {
      next.fecha = "La fecha del evento no puede ser anterior a hoy.";
    }

    const horas = Number(formulario.horas);

    if (
      !formulario.horas ||
      horas <= 0 ||
      !Number.isInteger(horas)
    ) {
      next.horas = "Las horas deben ser mayor a 0.";
    } else if (horas > 24) {
      next.horas = "Las horas no pueden ser mayores a 24.";
    }

    if (!formulario.usuario_responsable.trim()) {
      next.usuario_responsable = "El usuario responsable es requerido.";
    }

    return next;
  };

  const enviar = async (event) => {
    event.preventDefault();
    const next = validar();
    setErrores(next);
    if (Object.keys(next).length) return;
    setGuardando(true);
    setErrorServidor("");
    try {
      await actualizarEvento(evento.id, {
        titulo: formulario.titulo.trim(),
        fecha: formulario.fecha,
        horas: Number(formulario.horas),
        usuario_responsable: formulario.usuario_responsable.trim(),
        descripcion: formulario.descripcion.trim() || null,
      });
      onGuardado();
    } catch (error) {
      setErrorServidor(error.message);
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <div className="field-header"><label htmlFor="edit-titulo">Título del evento <span>*</span></label></div>
      <input id="edit-titulo" name="titulo" value={formulario.titulo} onChange={actualizar} aria-invalid={Boolean(errores.titulo)} autoFocus />
      {errores.titulo && <p className="inline-error" role="alert">X {errores.titulo}</p>}
      <div className="form-two-columns">
        <div>
          <div className="field-header"><label htmlFor="edit-fecha">Fecha del evento <span>*</span></label></div>
          <input
            id="edit-fecha"
            name="fecha"
            type="date"
            min={obtenerFechaLocalHoy()}
            value={formulario.fecha}
            onChange={actualizar}
            aria-invalid={Boolean(errores.fecha)}
          />
          {errores.fecha ? (
            <p className="inline-error" role="alert">X {errores.fecha}</p>
          ) : (
            <p className="helper">ⓘ La fecha debe ser hoy o una fecha futura</p>
          )}
        </div>
        <div>
          <div className="field-header"><label htmlFor="edit-horas">Horas <span>*</span></label></div>
          <input
            id="edit-horas"
            name="horas"
            type="number"
            min="1"
            max="24"
            step="1"
            value={formulario.horas}
            onChange={actualizar}
            aria-invalid={Boolean(errores.horas)}
          />
          {errores.horas ? (
            <p className="inline-error" role="alert">X {errores.horas}</p>
          ) : (
            <p className="helper">ⓘ Las horas deben ser entre 1 y 24</p>
          )}
        </div>
      </div>
      <div className="field-header">
        <label htmlFor="edit-responsable">
          Usuario responsable <span>*</span>
        </label>
        <small>Obligatorio</small>
      </div>

      <input
        id="edit-responsable"
        name="usuario_responsable"
        value={formulario.usuario_responsable}
        onChange={actualizar}
        aria-invalid={Boolean(errores.usuario_responsable)}
      />

      {errores.usuario_responsable && (
        <p className="inline-error" role="alert">
          X {errores.usuario_responsable}
        </p>
      )}
      <div className="field-header"><label htmlFor="edit-descripcion">Descripción</label></div>
      <textarea id="edit-descripcion" name="descripcion" value={formulario.descripcion} onChange={actualizar} />
      {errorServidor && <div className="alert alert-error" role="alert"><b>No fue posible actualizar el evento.</b><span>{errorServidor}</span></div>}
      <div className="actions">
        <button className="btn ghost" type="button" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="btn primary" type="submit" disabled={guardando}>{guardando && <span className="mini-spinner" />}{guardando ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}

function EditarSubtareaForm({ subtarea, eventoId, eventoFecha, onCancelar, onGuardado }) {
  const [form, setForm] = useState({
    nombre: subtarea?.titulo ?? subtarea?.nombre ?? "",
    horas: subtarea?.horas_estimadas ?? subtarea?.horas ?? "",
    estado: normalizarEstado(subtarea?.estado),
    dia_objetivo: eventoFecha || subtarea?.dia_objetivo || "",
  });

  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [guardando, setGuardando] = useState(false);

  const actualizar = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrores((prev) => ({
      ...prev,
      [name]: "",
    }));

    setErrorServidor("");
  };

  const enviar = async (event) => {
    event.preventDefault();

    const next = {};

    if (!form.nombre.trim()) {
      next.nombre = "El nombre de la subtarea es requerido.";
    }

    if (
      !form.horas ||
      Number(form.horas) <= 0 ||
      !Number.isInteger(Number(form.horas))
    ) {
      next.horas = "Las horas deben ser mayor a 0.";
    }
    if (!form.dia_objetivo) {
      next.dia_objetivo = "La fecha del evento es requerida.";
    }
    setErrores(next);

    if (Object.keys(next).length) {
      return;
    }

    setGuardando(true);
    setErrorServidor("");

    try {
      await actualizarSubtarea(subtarea.id, {
        evento_id: eventoId,
        titulo: form.nombre.trim(),
        dia_objetivo: eventoFecha || form.dia_objetivo,
        horas_estimadas: Number(form.horas),
        estado: form.estado,
      });

      onGuardado();
    } catch (error) {
      console.error("Error al actualizar subtarea:", error);

      setErrorServidor(
        error?.message || "No fue posible actualizar la subtarea."
      );

      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <div className="field-header">
        <label htmlFor="edit-sub-nombre">
          Nombre de la subtarea <span>*</span>
        </label>
      </div>

      <input
        id="edit-sub-nombre"
        name="nombre"
        value={form.nombre}
        onChange={actualizar}
        aria-invalid={Boolean(errores.nombre)}
        autoFocus
      />

      {errores.nombre && (
        <p className="inline-error" role="alert">
          X {errores.nombre}
        </p>
      )}

      <div className="form-two-columns">
        <div>
          <div className="field-header">
            <label htmlFor="edit-sub-horas">
              Horas <span>*</span>
            </label>
          </div>

          <input
            id="edit-sub-horas"
            name="horas"
            type="number"
            min="1"
            step="1"
            value={form.horas}
            onChange={actualizar}
            aria-invalid={Boolean(errores.horas)}
          />

          {errores.horas && (
            <p className="inline-error" role="alert">
              X {errores.horas}
            </p>
          )}
        </div>

        <div>
          <div className="field-header">
            <label htmlFor="edit-sub-estado">
              Estado
            </label>
          </div>

          <select
            id="edit-sub-estado"
            name="estado"
            value={form.estado}
            onChange={actualizar}
          >
            <option value="pendiente">Pendiente</option>
            <option value="hecho">Hecho</option>
            <option value="pospuesto">Pospuesto</option>
          </select>
        </div>
      </div>

      <div className="field-header">
        <label htmlFor="edit-sub-dia-objetivo">
          Fecha límite <span>*</span>
        </label>
      </div>

      <input
        id="edit-sub-dia-objetivo"
        name="dia_objetivo"
        type="date"
        disabled
        value={form.dia_objetivo}
        aria-invalid={Boolean(errores.dia_objetivo)}
      />
      <p className="helper">La fecha límite corresponde al día del evento.</p>

      {errores.dia_objetivo && (
        <p className="inline-error" role="alert">
          X {errores.dia_objetivo}
        </p>
      )}

      {errorServidor && (
        <div className="alert alert-error" role="alert">
          <b>No fue posible actualizar la subtarea.</b>
          <span>{errorServidor}</span>
        </div>
      )}

      <div className="actions">
        <button
          className="btn ghost"
          type="button"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          className="btn primary"
          type="submit"
          disabled={guardando}
        >
          {guardando && <span className="mini-spinner" />}
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
function Eventos({ eventos, cargando, error, recargar, crear, busqueda }) {
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const eventosVisibles = eventos.filter((evento) =>
    `${evento.titulo || ""} ${evento.descripcion || ""}`
      .toLocaleLowerCase("es")
      .includes(termino)
  );

  return (
    <section className="page">
      <div className="heading">
        <div><small>PLANIFICACIÓN</small><h1>Eventos</h1><p>Gestiona tus eventos y organiza las tareas necesarias para completarlos.</p></div>      </div>

      {cargando && <section className="card state-card"><span className="spinner" /> Cargando eventos...</section>}
      {!cargando && error && <section className="card state-card error-state" role="alert"><div><b>No se pudieron cargar los eventos.</b><p>{error}</p></div><button className="btn ghost" onClick={recargar}>Reintentar</button></section>}
      {!cargando && !error && eventos.length === 0 && <section className="card empty-state"><div className="empty-icon">✦</div><h2>Aún no hay eventos</h2><p>¿Deseas crear tu primer evento?</p><button className="btn primary" onClick={crear}>Crear el primer evento</button></section>}
      {!cargando && !error && eventos.length > 0 && eventosVisibles.length === 0 && <section className="card empty-state"><div className="empty-icon">⌕</div><h2>No se encontraron eventos</h2><p>Prueba con otro nombre.</p></section>}
      {!cargando && !error && eventosVisibles.length > 0 && <section className="event-grid" aria-label="Eventos guardados">
        {eventosVisibles.map((evento) => <article className="event-card card" key={evento.id ?? `${evento.titulo}-${evento.fecha}`}>
          <div className="event-card-icon">✦</div>
          <div className="event-card-content"><span className="status-pill">● En preparación</span><h2>{evento.titulo}</h2><p>{formatearFecha(evento.fecha)} {evento.horas ? `• ${evento.horas} horas` : ""}</p>{evento.descripcion && <p className="muted-line">{evento.descripcion}</p>}</div>
          <button className="btn secondary" onClick={() => navegar(`/eventos/${evento.id}`)}>Ver detalle</button>
        </article>)}
      </section>}
    </section>
  );
}

function DetalleEvento({ id, volver, onNotify, onEventosChanged }) {
  const [evento, setEvento] = useState(null);
  const [cargandoEvento, setCargandoEvento] = useState(true);
  const [errorEvento, setErrorEvento] = useState("");
  const [subtareas, setSubtareas] = useState([]);
  const [estadoSubtareas, setEstadoSubtareas] = useState("loading");
  const [errorSubtareas, setErrorSubtareas] = useState("");
  const [modal, setModal] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = async () => {
    setCargandoEvento(true); setErrorEvento("");
    try { setEvento(await obtenerEvento(id)); }
    catch (error) { setErrorEvento(error.message); }
    finally { setCargandoEvento(false); }
  };
  const cargarSubtareas = async () => {
    setEstadoSubtareas("loading"); setErrorSubtareas("");
    try {
      const data = await obtenerSubtareas(id);
      setSubtareas(Array.isArray(data) ? data : []);
      setEstadoSubtareas(Array.isArray(data) && data.length ? "success" : "empty");
    } catch (error) { setErrorSubtareas(error.message); setEstadoSubtareas("error"); }
  };
  useEffect(() => { cargar(); cargarSubtareas(); }, [id]);

  const completadas = subtareas.filter((item) => normalizarEstado(item.estado) === "hecho").length;
  const horasRegistradas = subtareas.reduce((total, item) => total + obtenerHoras(item), 0);
  const porcentaje = subtareas.length ? Math.round((completadas / subtareas.length) * 100) : 0;
  const responsable = evento?.usuario_responsable;
  const responsableTexto =
    typeof responsable === "object"
      ? responsable?.nombre
      : responsable;

  const eventoActualizado = async () => {
    setModal(null); await cargar(); onEventosChanged?.(); onNotify("Evento actualizado correctamente");
  };
  const subtareaActualizada = async () => {
    setModal(null); await cargarSubtareas(); onNotify("Subtarea actualizada correctamente");
  };
  const ejecutarEliminacion = async () => {
    if (!confirmacion) return;
    setEliminando(true);
    try {
      if (confirmacion.type === "evento") {
        await eliminarEvento(id);
        setConfirmacion(null);
        onNotify("Evento eliminado correctamente");
        onEventosChanged?.();
        volver();
      } else {
        await eliminarSubtarea(confirmacion.item.id);
        setConfirmacion(null);
        await cargarSubtareas();
        onNotify("Subtarea eliminada correctamente");
      }
    } catch (error) {
      setConfirmacion(null);
      onNotify(error.message || "No fue posible eliminar el elemento.", "error");
    } finally { setEliminando(false); }
  };

  if (cargandoEvento) return <section className="page"><div className="breadcrumb">← Volver a la lista general de eventos</div><section className="card state-card"><span className="spinner" /> Cargando detalle del evento...</section></section>;
  if (errorEvento || !evento) return <section className="page"><button className="back-link" onClick={volver}>← Volver a la lista general de eventos</button><section className="card state-card error-state" role="alert"><div><b>No se pudo cargar el evento.</b><p>{errorEvento || "El evento no existe."}</p></div><button className="btn ghost" onClick={cargar}>Reintentar</button></section></section>;

  return (
    <section className="page detail-page">
      <button className="back-link" onClick={volver}>← Volver a la lista general de eventos</button>
      <div className="detail-title-row">
        <div><h1>{evento.titulo}</h1><p>• Información del evento</p></div>
        <div className="title-actions">
          <button className="btn secondary" onClick={() => setModal("edit-event")}>✎ Editar</button>
          <button className="btn danger-outline" onClick={() => setConfirmacion({ type: "evento" })}><FaTrashAlt aria-hidden="true" /> Eliminar</button>
        </div>
      </div>

      <section className="event-info card">
        <InfoBlock icon="fecha" title="FECHA DEL EVENTO"><strong>{formatearFecha(evento.fecha)}</strong><span>Fecha registrada</span></InfoBlock>
        <InfoBlock icon="duracion" title="DURACIÓN ESTIMADA"><strong>{evento.horas ?? "—"} horas</strong><span>Jornada estimada</span></InfoBlock>
        <InfoBlock icon="responsable" title="USUARIO RESPONSABLE"><strong>{responsableTexto || "Sin asignar"}</strong><span>Responsable</span></InfoBlock>
        <InfoBlock icon="descripcion" title="DESCRIPCIÓN COMPLETA"><strong className="description-value">{evento.descripcion || "Sin descripción"}</strong></InfoBlock>
      </section>

      <div className="subtasks-heading"><div><h2>Subtareas</h2><p>Organiza las tareas necesarias para completar este evento.</p></div><button className="btn primary" onClick={() => setModal("create-subtask")}>＋ Nueva subtarea</button></div>
      <section className="subtask-section card">
        <div className="section-tabs"><span className="tab active">Con subtareas ({subtareas.length})</span></div>
        {estadoSubtareas === "loading" && <div className="state-inside"><span className="spinner" /> Cargando subtareas...</div>}
        {estadoSubtareas === "error" && <div className="state-inside error-inside" role="alert"><div><b>Error cargando las subtareas</b><p>{errorSubtareas}</p></div><button className="btn ghost" onClick={cargarSubtareas}>Reintentar</button></div>}
        {estadoSubtareas === "empty" && <div className="empty-subtasks"><div className="empty-icon">✦</div><h3>Aún no hay subtareas</h3><p>Agrega una subtarea para organizar este evento.</p><button className="btn primary" onClick={() => setModal("create-subtask")}>＋ Nueva subtarea</button></div>}
        {estadoSubtareas === "success" && <div className="subtask-list">
          {subtareas.map((task) => {
            const estado = normalizarEstado(task.estado);
            const titulo = obtenerTituloSubtarea(task);
            return <article className="subtask-row" key={task.id ?? `${titulo}-${obtenerHoras(task)}`}>
              <span className={`task-check ${estado === "hecho" ? "completed" : ""}`}>{estado === "hecho" ? "✓" : ""}</span>
              <div className="task-main"><h3 className={estado === "hecho" ? "completed-text" : ""}>{titulo}</h3><p>◷ {obtenerHoras(task)} {obtenerHoras(task) === 1 ? "hora" : "horas"}</p></div>
              <span className={`badge ${estado === "hecho" ? "badge-success" : "badge-pending"}`}>{etiquetaEstado(estado)}</span>
              <div className="row-actions"><button className="btn ghost" onClick={() => setModal({ type: "edit-subtask", item: task })}>✎ Editar</button><button className="btn danger-outline" onClick={() => setConfirmacion({ type: "subtarea", item: task })}><FaTrashAlt aria-hidden="true" /> Eliminar</button></div>
            </article>;
          })}
        </div>}
      </section>

      <section className="progress-card card"><div className="progress-icon">✓</div><div><h2>Progreso global de subtareas</h2><p>{completadas} de {subtareas.length} completadas ({porcentaje}%) • {horasRegistradas} horas totales registradas</p></div><strong>{porcentaje}%</strong><div className="progress-track"><span style={{ width: `${porcentaje}%` }} /></div></section>

      {modal === "create-subtask" && <Modal title="Crear subtarea" subtitle="Agrega una nueva tarea para este evento." close={() => setModal(null)}><CrearSubtareaForm eventoId={id} eventoFecha={evento.fecha} onCancelar={() => setModal(null)} onCreada={async () => { setModal(null); onNotify("Subtarea creada correctamente"); await cargarSubtareas(); }} /></Modal>}
      {modal === "edit-event" && <Modal title="Editar evento" subtitle="Actualiza la información del evento." close={() => setModal(null)} wide><EditarEventoForm evento={evento} onCancelar={() => setModal(null)} onGuardado={eventoActualizado} /></Modal>}
      {modal?.type === "edit-subtask" && <Modal title="Editar subtarea" subtitle="Actualiza la información de la subtarea." close={() => setModal(null)}><EditarSubtareaForm subtarea={modal.item} eventoId={id} eventoFecha={evento.fecha} onCancelar={() => setModal(null)} onGuardado={subtareaActualizada} /></Modal>}
      {confirmacion?.type === "evento" && <ConfirmModal title="¿Eliminar evento?" message="Esta acción eliminará el evento y sus subtareas. No se puede deshacer." close={() => setConfirmacion(null)} onConfirm={ejecutarEliminacion} loading={eliminando} />}
      {confirmacion?.type === "subtarea" && <ConfirmModal title="¿Eliminar subtarea?" message={`Esta acción eliminará “${obtenerTituloSubtarea(confirmacion.item)}”. No se puede deshacer.`} close={() => setConfirmacion(null)} onConfirm={ejecutarEliminacion} loading={eliminando} />}
    </section>
  );
}

function InfoBlock({ icon, title, children }) {
  return (
    <div className="info-block">
      <span className="info-icon">
        {icon === "fecha" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="17" rx="3" />
            <path d="M8 2v4M16 2v4M3 9h18" />
            <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
          </svg>
        )}

        {icon === "duracion" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}

        {icon === "responsable" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c.8-3.4 3.2-5 7-5s6.2 1.6 7 5" />
          </svg>
        )}

        {icon === "descripcion" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
        )}
      </span>

      <div>
        <small>{title}</small>
        {children}
      </div>
    </div>
  );
}

function CrearEventoPage({ onCancelar, onCrear }) {
  const [progreso, setProgreso] = useState({
    porcentaje: 0,
    pasosCompletados: 0,
    pasos: [false, false, false, false],
  });

  const pasos = [
    {
      titulo: "Nombre y temática principal",
      descripcion: "Título claro para identificar el evento.",
    },
    {
      titulo: "Fecha fijada",
      descripcion: "Selecciona una fecha para reservar.",
    },
    {
      titulo: "Horas estimadas de ejecución",
      descripcion: "Indica una duración entre 1 y 24 horas.",
    },
    {
      titulo: "Usuario responsable",
      descripcion: "Asigna la persona responsable del evento.",
    },
  ];

  return (
    <section className="create-page">
      <div className="create-main">
        <button className="back-link" onClick={onCancelar}>← Volver a Eventos <span className="back-dot">•</span> <span className="draft-pill">◉ Borrador</span></button>
        <div className="create-heading">
          <div>
            <h1>Crear evento</h1>
            <p>Completa la información para crear un nuevo evento.</p>
          </div>
        </div>
        <section className="card create-form-card">
          <FormularioEvento onCancelar={onCancelar} onCrear={onCrear} onProgress={setProgreso} />
        </section>
      </div>
      <aside className="create-sidebar">
        <section className="card progress-register">
          <div className="sidebar-title">
            <span className="sidebar-icon">☷</span>
            <h2>Progreso del Registro</h2>
            <span className="ready-pill">{progreso.porcentaje}% Listo</span>
          </div>

          {pasos.map((paso, index) => {
            const completado = progreso.pasos[index];
            const actual =
              !completado &&
              (index === 0 || progreso.pasos[index - 1]);

            return (
              <div
                className={`register-step ${completado ? "done" : actual ? "current" : ""
                  }`}
                key={paso.titulo}
              >
                <span className="step-dot">
                  {completado ? "✓" : actual ? "○" : "○"}
                </span>
                <div>
                  <b>{paso.titulo}</b>
                  <small>{paso.descripcion}</small>
                </div>
              </div>
            );
          })}

          <div className="register-progress">
            <span style={{ width: `${progreso.porcentaje}%` }} />
          </div>
        </section>

        <section className="card validation-card">
          <div className="validation-title"><span>ⓘ</span><h2>Reglas de validación y publicación</h2></div>
          <p>Al registrar un nuevo evento en el workspace de EventHub:</p>
          <ul>
            <li><b>Título:</b> Debe tener al menos 3 caracteres.</li>
            <li><b>Fecha:</b> Debe ser hoy o una fecha futura.</li>
            <li><b>Horas:</b> Debe ser un número entero entre 1 y 24.</li>
            <li><b>Usuario responsable:</b> Debe indicar la persona responsable del evento.</li>
          </ul>
        </section>


      </aside>
    </section>
  );
}

function ConfiguracionUsuario({ onNotify }) {
  const [horasDia, setHorasDia] = useState(6);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorCampo, setErrorCampo] = useState("");

  useEffect(() => {
    const cargarConfiguracion = async () => {
      setCargando(true);
      setError("");

      try {
        const data = await obtenerConfiguracionUsuario();

        setHorasDia(
          Number.isInteger(Number(data?.horas_dia))
            ? Number(data.horas_dia)
            : 6
        );
      } catch (errorActual) {
        setError(
          errorActual.message ||
          "No fue posible cargar la configuración del usuario."
        );
      } finally {
        setCargando(false);
      }
    };

    cargarConfiguracion();
  }, []);

  const cambiarHoras = (event) => {
    const value = event.target.value;

    setHorasDia(value);
    setErrorCampo("");
  };

  const validar = () => {
    const horas = Number(horasDia);

    if (
      horasDia === "" ||
      !Number.isInteger(horas) ||
      horas < 1 ||
      horas > 16
    ) {
      return "Las horas por día deben ser un número entero entre 1 y 16.";
    }

    return "";
  };

  const guardar = async (event) => {
    event.preventDefault();

    const errorValidacion = validar();

    if (errorValidacion) {
      setErrorCampo(errorValidacion);
      return;
    }

    setGuardando(true);
    setError("");
    setErrorCampo("");

    try {
      const data = await actualizarConfiguracionUsuario(Number(horasDia));

      setHorasDia(Number(data.horas_dia));

      onNotify("Configuración guardada correctamente.");
    } catch (errorActual) {
      setError(
        errorActual.message ||
        "No fue posible guardar la configuración. Inténtalo de nuevo."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="page configuration-page">
      <div className="configuration-header">
        <div>
          <small>CONFIGURACIÓN DEL ORGANIZADOR</small>
          <h1>Disponibilidad</h1>
          <p>
            Define cuántas horas al día tienes disponibles para gestionar tus
            eventos.
          </p>
        </div>
      </div>

      {cargando ? (
        <section className="card state-card">
          <span className="spinner" />
          Consultando tu configuración...
        </section>
      ) : error ? (
        <section className="card state-card error-state" role="alert">
          <div>
            <b>No se pudo cargar la configuración.</b>
            <p>{error}</p>
          </div>
        </section>
      ) : (
        <section className="card configuration-card">
          <div className="configuration-card-header">
            <div>
              <h2>Límite diario de gestión</h2>
              <p>
                El sistema utilizará este límite para detectar sobrecarga en
                tu planificación diaria.
              </p>
            </div>
          </div>

          <form onSubmit={guardar} noValidate>
            <div className="configuration-field">
              <label htmlFor="horas-dia">
                Horas disponibles por día <span>*</span>
              </label>

              <input
                id="horas-dia"
                name="horas-dia"
                type="number"
                min="1"
                max="16"
                step="1"
                value={horasDia}
                onChange={cambiarHoras}
                aria-invalid={Boolean(errorCampo)}
                aria-describedby="horas-dia-ayuda horas-dia-error"
              />

              <small id="horas-dia-ayuda">
                Introduce un número entero entre 1 y 16 horas.
              </small>

              {errorCampo && (
                <p
                  id="horas-dia-error"
                  className="inline-error"
                  role="alert"
                >
                  X {errorCampo}
                </p>
              )}
            </div>

            <div className="configuration-actions">
              <button
                className="btn primary"
                type="submit"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar configuración"}
              </button>

              <button
                className="btn secondary"
                type="button"
                disabled={guardando}
                onClick={() => navegar("/eventos")}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
    </section>
  );
}

function obtenerFechaLocalHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Today({ onNotify }) {
  const [tareas, setTareas] = useState([]);
  const [gestionesVencidas, setGestionesVencidas] = useState([]);
  const [proximasGestiones, setProximasGestiones] = useState([]);
  const [subtareasAgenda, setSubtareasAgenda] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [capacidadDiaria, setCapacidadDiaria] = useState(6);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [tareaPosponer, setTareaPosponer] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [motivoPosposicion, setMotivoPosposicion] = useState("");
  const [horasPosposicion, setHorasPosposicion] = useState(0);
  const [conflictoJornada, setConflictoJornada] = useState(null);
  const [resolverSobrecarga, setResolverSobrecarga] = useState(false);
  const [estrategiaSobrecarga, setEstrategiaSobrecarga] = useState("mover");
  const [horasManuales, setHorasManuales] = useState(0);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [guardandoPosposicion, setGuardandoPosposicion] = useState(false);
  const claveCompletadasHoy = `eventhub_completadas_hoy_${obtenerFechaLocalHoy()}`;
  const completadasHoyRef = useRef((() => {
    try {
      return new Set(
        JSON.parse(sessionStorage.getItem(claveCompletadasHoy) || "[]")
          .map(String)
      );
    } catch {
      return new Set();
    }
  })());


  const cargarHoy = async () => {
    setCargando(true);
    setError("");

    try {
      const [eventosData, subtareasData, hoyData] = await Promise.all([
        obtenerEventos(),
        obtenerSubtareas(),
        obtenerHoy(),
      ]);

      const listaEventos = Array.isArray(eventosData)
        ? eventosData
        : [];

      const listaSubtareas = Array.isArray(subtareasData)
        ? subtareasData
        : [];

      const horasConfiguradas = Number(
        hoyData?.resumen?.limite_horas_dia
      );

      if (
        Number.isInteger(horasConfiguradas) &&
        horasConfiguradas > 0
      ) {
        setCapacidadDiaria(horasConfiguradas);
      } else {
        setCapacidadDiaria(6);
      }
      const eventosPorId = new Map(
        listaEventos.map((evento) => [String(evento.id), evento])
      );

      const hoy = hoyData?.fecha || obtenerFechaLocalHoy();

      const subtareasPreparadas = listaSubtareas.map((subtarea) => {
        const evento = eventosPorId.get(String(subtarea.evento_id));

        return {
          ...subtarea,
          evento,
          fechaObjetivo: subtarea.dia_objetivo || evento?.fecha || null,
        };
      });

      const resolverSubtarea = (subtarea) => ({
        ...subtareasPreparadas.find(
          (item) => String(item.id) === String(subtarea.id)
        ),
        ...subtarea,
        evento: eventosPorId.get(String(subtarea.evento_id)),
        fechaObjetivo: subtarea.dia_objetivo || null,
      });
      const gestionesActivas = [
        ...(hoyData?.vencidas || []),
        ...(hoyData?.urgentes || []),
        ...(hoyData?.proximas || []),
      ].map(resolverSubtarea);
      const gestionesVencidasBackend = (hoyData?.vencidas || [])
        .map(resolverSubtarea)
        .sort((a, b) =>
          String(a.fechaObjetivo || "").localeCompare(
            String(b.fechaObjetivo || "")
          )
        );
      const proximasBackend = (hoyData?.proximas || [])
        .map(resolverSubtarea)
        .sort((a, b) =>
          String(a.fechaObjetivo || "").localeCompare(
            String(b.fechaObjetivo || "")
          )
        )
        .slice(0, 8);
      const completadasDeHoy = subtareasPreparadas.filter(
        (subtarea) =>
          normalizarEstado(subtarea.estado) === "hecho" &&
          (
            String(subtarea.fechaObjetivo || "").slice(0, 10) === hoy ||
            completadasHoyRef.current.has(String(subtarea.id))
          )
      );

      const tareasDeHoy = [
        ...gestionesActivas.filter(
          (subtarea) =>
            String(subtarea.fechaObjetivo || "").slice(0, 10) === hoy
        ),
        ...completadasDeHoy,
      ]
        .sort((a, b) => {
          const estadoA = normalizarEstado(a.estado);
          const estadoB = normalizarEstado(b.estado);

          if (estadoA === "hecho" && estadoB !== "hecho") return 1;
          if (estadoA !== "hecho" && estadoB === "hecho") return -1;

          return obtenerTituloSubtarea(a).localeCompare(
            obtenerTituloSubtarea(b),
            "es"
          );
        });

      setTareas(tareasDeHoy);
      setGestionesVencidas(gestionesVencidasBackend);
      setProximasGestiones(proximasBackend);
      setSubtareasAgenda(
        subtareasPreparadas.filter(
          (subtarea) =>
            !["hecho", "completada", "completado", "hecha"].includes(
              String(subtarea.estado || "").toLowerCase()
            )
        )
      );

      if (
        seleccionada &&
        !tareasDeHoy.some((tarea) => tarea.id === seleccionada.id)
      ) {
        setSeleccionada(null);
      }
    } catch (errorActual) {
      setError(
        errorActual.message || "No fue posible cargar las tareas de hoy."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarHoy();
  }, []);
  const abrirModalPosponer = (tarea) => {
    setTareaPosponer(tarea);
    setNuevaFecha("");
    setMotivoPosposicion("");
    setConflictoJornada(null);
    setResolverSobrecarga(false);
    setHorasPosposicion(obtenerHoras(tarea));
    setMesCalendario(() => {
      const hoy = new Date();
      return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    });
  };
  const reprogramarConValidacionLocal = async (tarea, fecha, horas) => {
    const horasOtros = subtareasAgenda.reduce((total, subtarea) => {
      if (
        String(subtarea.fechaObjetivo || "").slice(0, 10) !== fecha ||
        String(subtarea.id) === String(tarea.id)
      ) {
        return total;
      }
      return total + obtenerHoras(subtarea);
    }, 0);
    const horasTotales = horasOtros + Number(horas);

    if (horasTotales > capacidadDiaria) {
      const agenda = subtareasAgenda
        .filter(
          (subtarea) =>
            String(subtarea.fechaObjetivo || "").slice(0, 10) === fecha &&
            String(subtarea.id) !== String(tarea.id)
        )
        .map((subtarea) => ({
          id: subtarea.id,
          titulo: obtenerTituloSubtarea(subtarea),
          evento: subtarea.evento?.titulo || "Evento sin título",
          horas_estimadas: obtenerHoras(subtarea),
          es_subtarea_reprogramada: false,
        }));
      agenda.push({
        id: tarea.id,
        titulo: obtenerTituloSubtarea(tarea),
        evento: tarea.evento?.titulo || "Evento sin título",
        horas_estimadas: Number(horas),
        es_subtarea_reprogramada: true,
      });

      let fechaRecomendada = null;
      const fechaBase = new Date(`${fecha}T00:00:00`);
      for (let dias = 1; dias <= 365; dias += 1) {
        const candidata = new Date(fechaBase);
        candidata.setDate(candidata.getDate() + dias);
        const fechaCandidata = [
          candidata.getFullYear(),
          String(candidata.getMonth() + 1).padStart(2, "0"),
          String(candidata.getDate()).padStart(2, "0"),
        ].join("-");
        const horasCandidata = subtareasAgenda.reduce((total, subtarea) => {
          if (
            String(subtarea.fechaObjetivo || "").slice(0, 10) !==
              fechaCandidata ||
            String(subtarea.id) === String(tarea.id)
          ) {
            return total;
          }
          return total + obtenerHoras(subtarea);
        }, 0);

        if (horasCandidata + Number(horas) <= capacidadDiaria) {
          fechaRecomendada = fechaCandidata;
          break;
        }
      }

      return {
        actualizada: false,
        limite_excedido: true,
        fecha_objetivo: fecha,
        horas_asignadas: horasTotales,
        limite_horas: capacidadDiaria,
        exceso_horas: horasTotales - capacidadDiaria,
        horas_disponibles: Math.max(0, capacidadDiaria - horasOtros),
        agenda,
        fecha_recomendada: fechaRecomendada,
      };
    }

    const subtareaActualizada = await actualizarParcialSubtarea(tarea.id, {
      estado: "pospuesto",
      dia_objetivo: fecha,
      horas_estimadas: Number(horas),
      motivo_posposicion: motivoPosposicion.trim(),
    });

    return {
      actualizada: true,
      subtarea: subtareaActualizada,
    };
  };
  const confirmarPosposicion = async () => {
    if (!tareaPosponer || !nuevaFecha || !motivoPosposicion.trim()) {
      return;
    }

    setGuardandoPosposicion(true);

    try {
      const resultado = await reprogramarConValidacionLocal(
        tareaPosponer,
        nuevaFecha,
        horasPosposicion
      );

      if (resultado?.limite_excedido) {
        setConflictoJornada(resultado);
        setHorasManuales(
          Math.min(
            Number(horasPosposicion),
            Number(resultado.horas_disponibles || 0)
          )
        );
        return;
      }

      if (!resultado?.actualizada) {
        throw new Error("No fue posible actualizar la subtarea.");
      }

      setTareaPosponer(null);
      setNuevaFecha("");
      setMotivoPosposicion("");
      setConflictoJornada(null);
      setResolverSobrecarga(false);

      await cargarHoy();

      onNotify("La fecha de la subtarea se actualizó correctamente.");
    } catch (errorActual) {
      onNotify(
        errorActual.message || "No fue posible actualizar la subtarea.",
        "error"
      );
    } finally {
      setGuardandoPosposicion(false);
    }
  };
  const aplicarResolucionSobrecarga = async () => {
    if (!tareaPosponer || !conflictoJornada) {
      return;
    }

    const esMover =
      estrategiaSobrecarga === "mover" &&
      Boolean(conflictoJornada.fecha_recomendada);
    const fecha = esMover
      ? conflictoJornada.fecha_recomendada
      : conflictoJornada.fecha_objetivo;
    const horas = esMover
      ? Number(horasPosposicion)
      : Number(horasManuales);

    if (!fecha || !Number.isFinite(horas) || horas <= 0) {
      return;
    }

    setGuardandoPosposicion(true);

    try {
      const resultado = await reprogramarConValidacionLocal(
        tareaPosponer,
        fecha,
        horas
      );

      if (resultado?.limite_excedido) {
        setConflictoJornada(resultado);
        setHorasManuales(
          Math.min(horas, Number(resultado.horas_disponibles || 0))
        );
        setResolverSobrecarga(false);
        return;
      }

      if (!resultado?.actualizada) {
        throw new Error("No fue posible actualizar la subtarea.");
      }

      setResolverSobrecarga(false);
      setConflictoJornada(null);
      setTareaPosponer(null);
      setNuevaFecha("");
      setMotivoPosposicion("");
      await cargarHoy();
      onNotify("La fecha de la subtarea se actualizó correctamente.");
    } catch (errorActual) {
      onNotify(
        errorActual.message || "No fue posible actualizar la subtarea.",
        "error"
      );
    } finally {
      setGuardandoPosposicion(false);
    }
  };
  const cambiarEstado = async (tarea, nuevoEstado = null) => {
    const estadoActual = normalizarEstado(tarea.estado);

    const estadoNuevo =
      nuevoEstado ||
      (estadoActual === "hecho" ? "pendiente" : "hecho");

    setActualizando(tarea.id);

    try {
      await actualizarParcialSubtarea(tarea.id, {
        estado: estadoNuevo,
      });

      if (estadoNuevo === "hecho") {
        completadasHoyRef.current.add(String(tarea.id));
      } else {
        completadasHoyRef.current.delete(String(tarea.id));
      }
      let errorPersistencia = false;
      try {
        sessionStorage.setItem(
          claveCompletadasHoy,
          JSON.stringify([...completadasHoyRef.current])
        );
      } catch (errorAlPersistir) {
        console.error("No fue posible conservar las gestiones realizadas hoy.", errorAlPersistir);
        errorPersistencia = true;
      }

      await cargarHoy();

      setSeleccionada((actual) =>
        actual?.id === tarea.id
          ? { ...actual, estado: estadoNuevo }
          : actual
      );

      onNotify(
        errorPersistencia
          ? "La ejecución se guardó, pero no fue posible conservarla en esta vista."
          : estadoNuevo === "hecho"
            ? "Subtarea marcada como hecha."
            : estadoNuevo === "pospuesto"
              ? "Subtarea pospuesta correctamente."
              : "Subtarea marcada como pendiente.",
        errorPersistencia ? "error" : "success"
      );
    } catch (errorActual) {
      onNotify(
        errorActual.message || "No fue posible actualizar la subtarea.",
        "error"
      );
    } finally {
      setActualizando(null);
    }
  };
  const eventosFiltro = Array.from(
    new Map(
      [...tareas, ...gestionesVencidas, ...proximasGestiones]
        .filter((tarea) => tarea.evento?.id)
        .map((tarea) => [
          String(tarea.evento.id),
          tarea.evento,
        ])
    ).values()
  );
  const aplicarFiltros = (lista) => {
    const busqueda = filtroBusqueda.trim().toLowerCase();

    return lista.filter((tarea) => {
      const estado = normalizarEstado(tarea.estado);
      const eventoId = String(tarea.evento?.id || "");

      const coincideEvento =
        !filtroEvento || eventoId === String(filtroEvento);

      const coincideEstado =
        !filtroEstado || estado === filtroEstado;

      const coincideBusqueda =
        !busqueda ||
        obtenerTituloSubtarea(tarea).toLowerCase().includes(busqueda) ||
        (tarea.evento?.titulo || "").toLowerCase().includes(busqueda) ||
        String(tarea.responsable || "").toLowerCase().includes(busqueda);

      return (
        coincideEvento &&
        coincideEstado &&
        coincideBusqueda
      );
    });
  };
  const tareasFiltradas = aplicarFiltros(tareas);
  const gestionesVencidasFiltradas = aplicarFiltros(gestionesVencidas);
  const proximasGestionesFiltradas = aplicarFiltros(proximasGestiones);
  const pendientesFiltradas = tareasFiltradas.filter(
    (tarea) => normalizarEstado(tarea.estado) === "pendiente"
  );

  const pospuestasFiltradas = tareasFiltradas.filter(
    (tarea) => normalizarEstado(tarea.estado) === "pospuesto"
  );

  const completadasFiltradas = tareasFiltradas.filter(
    (tarea) => normalizarEstado(tarea.estado) === "hecho"
  );

  const urgentesFiltradas = [
    ...pospuestasFiltradas,
    ...pendientesFiltradas,
  ];

  const pendientes = tareas.filter(
    (tarea) => normalizarEstado(tarea.estado) === "pendiente"
  );

  const pospuestas = tareas.filter(
    (tarea) => normalizarEstado(tarea.estado) === "pospuesto"
  );

  const completadas = tareas.filter(
    (tarea) => normalizarEstado(tarea.estado) === "hecho"
  );

  const urgentes = [...pospuestas, ...pendientes];

  const horas = tareas.reduce(
    (total, tarea) => total + obtenerHoras(tarea),
    0
  );

  const horasPendientes = [...pendientes, ...pospuestas].reduce(
    (total, tarea) => total + obtenerHoras(tarea),
    0
  );

  const porcentajeCapacidad = Math.min(
    Math.round((horasPendientes / capacidadDiaria) * 100),
    100
  );

  const haySobrecarga = horasPendientes > capacidadDiaria;
  const diasMes = new Date(
    mesCalendario.getFullYear(),
    mesCalendario.getMonth() + 1,
    0
  ).getDate();
  const espaciosAntesDeMes = (new Date(
    mesCalendario.getFullYear(),
    mesCalendario.getMonth(),
    1
  ).getDay() + 6) % 7;
  const diasCalendario = [
    ...Array(espaciosAntesDeMes).fill(null),
    ...Array.from({ length: diasMes }, (_, index) => index + 1),
  ];
  const horasProgramadasEn = (fecha) =>
    subtareasAgenda.reduce((total, subtarea) => {
      if (
        String(subtarea.fechaObjetivo || "").slice(0, 10) !== fecha ||
        String(subtarea.id) === String(tareaPosponer?.id)
      ) {
        return total;
      }
      return total + obtenerHoras(subtarea);
    }, 0);
  const horasAsignadasEnFecha = nuevaFecha
    ? horasProgramadasEn(nuevaFecha) + Number(horasPosposicion || 0)
    : 0;
  const excedeJornadaSeleccionada =
    nuevaFecha && horasAsignadasEnFecha > capacidadDiaria;
  const comenzarResolucion = () => {
    const recomendada = Boolean(conflictoJornada?.fecha_recomendada);
    setEstrategiaSobrecarga(recomendada ? "mover" : "ajustar");
    setHorasManuales(
      Math.min(
        Number(horasPosposicion),
        Number(conflictoJornada?.horas_disponibles || 0)
      )
    );
    setResolverSobrecarga(true);
  };

  const renderTarea = (tarea, urgente = false) => {
    const estado = normalizarEstado(tarea.estado);
    const hecha = estado === "hecho";
    const titulo = obtenerTituloSubtarea(tarea);
    const nombreEvento = tarea.evento?.titulo || "Evento sin título";
    const horasTarea = obtenerHoras(tarea);
    const seleccionadaActual = seleccionada?.id === tarea.id;

    return (
      <article
        className={`today-task-card ${urgente ? "urgent-task" : ""} ${hecha ? "done-task" : ""
          } ${seleccionadaActual ? "selected-task" : ""}`}
        key={tarea.id}
        onClick={() => setSeleccionada(tarea)}
      >
        <div className="today-task-main">
          <div className="today-task-top">
            <span className="today-event-pill">
              Evento: {nombreEvento}
            </span>

            <span className={`today-status status-${estado}`}>
              {hecha ? "✓" : estado === "pospuesto" ? "◷" : "○"}{" "}
              {etiquetaEstado(estado)}
            </span>

            <span className="today-hours">{horasTarea}h</span>
          </div>

          <h3>{titulo}</h3>

          {urgente && !hecha && (
            <div className="today-urgent-message">
              <strong>⚠ Atención inmediata</strong>
            </div>
          )}

          <div className="today-task-meta">
            <span>
              📅{" "}
              {estado === "pospuesto" && tarea.dia_objetivo
                ? `Fecha reprogramada: ${new Intl.DateTimeFormat("es-CO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(
                  new Date(`${tarea.dia_objetivo}T00:00:00`)
                )}`
                : tarea.dia_objetivo
                  ? "Plazo: Hoy"
                  : tarea.evento?.fecha
                    ? "Evento programado para hoy"
                    : "Sin fecha específica"}
            </span>

            {estado === "pospuesto" && tarea.motivo_posposicion && (
              <span>
                Razón: "{tarea.motivo_posposicion}"
              </span>
            )}
          </div>
        </div>

        <div
          className="today-task-actions"
          onClick={(event) => event.stopPropagation()}
        >
          {!hecha ? (
            <>
              <button
                className="today-action-primary"
                type="button"
                disabled={actualizando === tarea.id}
                onClick={() => cambiarEstado(tarea, "hecho")}
              >
                {actualizando === tarea.id
                  ? "Guardando…"
                  : "✓ Marcar como hecho"}
              </button>

              <button
                className="today-action-secondary"
                type="button"
                disabled={actualizando === tarea.id}
                onClick={() => abrirModalPosponer(tarea)}
              >
                Reprogramar
              </button>
            </>
          ) : (
            <span className="today-verified">✓ Realizada</span>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="page today-page">
      <div className="today-header">
        <div>
          <small>
            SEGUIMIENTO DIARIO ·{" "}
            {new Intl.DateTimeFormat("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </small>
          <div className="today-title-row">
            <h1>Hoy</h1>

            <button
              className="today-refresh-button"
              type="button"
              onClick={cargarHoy}
              disabled={cargando}
              aria-label="Actualizar vista"
              title="Actualizar vista"
            >
              <FaSyncAlt aria-hidden="true" />
            </button>
          </div>
          <p>Prioriza lo importante y conserva el ritmo.</p>
        </div>

        <div className="today-capacity">
          <span>Capacidad del día </span>
          <strong>
            {horasPendientes}h / {capacidadDiaria}h
          </strong>

          <div className="today-capacity-track">
            <span style={{ width: `${porcentajeCapacidad}%` }} />
          </div>

          {haySobrecarga && (
            <div className="today-overload-message" role="status">
              Límite de jornada excedido
            </div>
          )}
        </div>
      </div>

      <div className="today-summary-grid">
        <article className="today-summary-card">
          <span className="today-summary-icon">◷</span>
          <div>
            <small>GESTIONES DE HOY</small>
            <strong>{tareas.length}</strong>
            <span>Subtareas programadas</span>
          </div>
        </article>

        <article className="today-summary-card">
          <span className="today-summary-icon">!</span>
          <div>
            <small>PENDIENTES</small>
            <strong>{urgentesFiltradas.length}</strong>
            <span>Requieren atención</span>
          </div>
        </article>

        <article className="today-summary-card">
          <span className="today-summary-icon">✓</span>
          <div>
            <small>REALIZADAS</small>
            <strong>{completadasFiltradas.length}</strong>
            <span>Completadas hoy</span>
          </div>
        </article>

        <article className="today-summary-card">
          <span className="today-summary-icon">◴</span>
          <div>
            <small>TIEMPO ESTIMADO</small>
            <strong>{horas}h</strong>
            <span>Horas de trabajo</span>
          </div>
        </article>
      </div>
      <div className="today-filters">

        <div className="today-filter-search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Buscar por evento, tarea o responsable..."
            value={filtroBusqueda}
            onChange={(event) => setFiltroBusqueda(event.target.value)}
          />
        </div>

        <div className="today-filter-select">
          <span>▣</span>

          <select
            value={filtroEvento}
            onChange={(event) => setFiltroEvento(event.target.value)}
          >
            <option value="">
              Todos los eventos ({eventosFiltro.length})
            </option>

            {eventosFiltro.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.titulo}
              </option>
            ))}
          </select>
        </div>

        <div className="today-filter-select">
          <span>☷</span>

          <select
            value={filtroEstado}
            onChange={(event) => setFiltroEstado(event.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pospuesto">Pospuesto</option>
            <option value="hecho">Hecho</option>
          </select>
        </div>

        <button
          type="button"
          className="today-filter-reset"
          aria-label="Limpiar filtros"
          title="Limpiar filtros"
          onClick={() => {
            setFiltroBusqueda("");
            setFiltroEvento("");
            setFiltroEstado("");
          }}
        >
          <span className="reset-icon">↻</span>
        </button>

      </div>

      <div className="today-layout">
        <main className="today-main-column">
          {cargando && (
            <section className="card state-card">
              <span className="spinner" />
              Cargando…
            </section>
          )}

          {!cargando && error && (
            <section
              className="card state-card error-state"
              role="alert"
            >
              <div>
                <b>No se pudieron cargar las tareas de hoy.</b>
                <p>{error}</p>
              </div>

              <button
                className="btn ghost"
                type="button"
                onClick={cargarHoy}
              >
                Reintentar
              </button>
            </section>
          )}

          {!cargando && !error && tareasFiltradas.length === 0 && gestionesVencidasFiltradas.length === 0 && (
            <section className="card today-no-tasks">
              <div className="empty-icon">⌕</div>

              <h2>
                {filtroBusqueda || filtroEvento || filtroEstado
                  ? "No hay resultados"
                  : "No hay gestiones para hoy"}
              </h2>

              <p>
                {filtroBusqueda || filtroEvento || filtroEstado
                  ? "No encontramos gestiones para hoy que coincidan con los filtros seleccionados."
                  : "No encontramos subtareas cuya fecha objetivo o evento corresponda a hoy."}
              </p>

              {(filtroBusqueda || filtroEvento || filtroEstado) && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    setFiltroBusqueda("");
                    setFiltroEvento("");
                    setFiltroEstado("");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </section>
          )}
          {!cargando && !error && gestionesVencidasFiltradas.length > 0 && (
            <section className="today-overdue-section">

              <div className="today-overdue-header">
                <div>
                  <h2>Gestiones Vencidas</h2>

                  <p className="today-overdue-risk">
                    ⚠ Riesgo operativo acumulado
                  </p>
                </div>

                <span className="today-overdue-count">
                  {gestionesVencidasFiltradas.length}
                </span>
              </div>

              <div className="today-overdue-grid">
                {gestionesVencidasFiltradas.map((tarea) => {
                  const fecha = String(
                    tarea.fechaObjetivo || ""
                  ).slice(0, 10);

                  const fechaVencida = new Date(`${fecha}T00:00:00`);
                  const fechaHoy = new Date(
                    `${obtenerFechaLocalHoy()}T00:00:00`
                  );

                  const diasVencidos = Math.max(
                    1,
                    Math.round(
                      (fechaHoy - fechaVencida) /
                      (1000 * 60 * 60 * 24)
                    )
                  );

                  return (
                    <article
                      className="today-overdue-card"
                      key={tarea.id}
                      onClick={() => setSeleccionada(tarea)}
                    >
                      <div className="today-overdue-main">

                        {/* PARTE SUPERIOR */}
                        <div className="today-overdue-top">

                          <span className="today-event-pill">
                            Evento: {tarea.evento?.titulo || "Evento sin título"}
                          </span>

                          <span className="today-overdue-badge">
                            ⚠ Retraso: {diasVencidos}{" "}
                            {diasVencidos === 1 ? "día" : "días"}
                          </span>

                          <span className="today-hours">
                            {obtenerHoras(tarea)}h
                          </span>

                        </div>

                        {/* TÍTULO */}
                        <h3>
                          {obtenerTituloSubtarea(tarea)}
                        </h3>

                        {/* DESCRIPCIÓN */}
                        {tarea.evento?.descripcion && (
                          <p className="today-overdue-description">
                            {tarea.evento.descripcion}
                          </p>
                        )}

                        {/* FECHA EN QUE VENCÍA */}
                        <div className="today-overdue-meta">
                          <span>
                            📅 Vencía: {fecha.split("-").reverse().join("/")}
                          </span>
                        </div>

                      </div>

                      {/* ACCIONES */}
                      <div
                        className="today-overdue-actions"
                        onClick={(event) => event.stopPropagation()}
                      >

                        <button
                          type="button"
                          className="today-overdue-resolve"
                          disabled={actualizando === tarea.id}
                          onClick={() => cambiarEstado(tarea, "hecho")}
                        >
                          {actualizando === tarea.id
                            ? "Guardando…"
                            : "✓ Resolver ahora"}
                        </button>

                        <button
                          type="button"
                          className="today-overdue-reprogram"
                          disabled={actualizando === tarea.id}
                          onClick={() => abrirModalPosponer(tarea)}
                        >
                          Reprogramar
                        </button>

                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {!cargando && !error && tareasFiltradas.length > 0 && (
            <>
              <section className="today-section">
                <div className="today-section-title">
                  <div>
                    <h2>Gestiones urgentes</h2>
                    <p>Requiere todavía atención el día de hoy.</p>
                  </div>

                  <span className="today-count urgent-count">
                    {urgentesFiltradas.length}
                  </span>
                </div>

                {urgentes.length === 0 ? (
                  <div className="today-empty">
                    <div className="today-empty-icon">✓</div>
                    <h3>Todo está al día</h3>
                    <p>No tienes gestiones urgentes pendientes para hoy.</p>
                  </div>
                ) : (
                  urgentesFiltradas.map((tarea) => renderTarea(tarea, true))
                )}
              </section>

              <section className="today-section">
                <div className="today-section-title">
                  <div>
                    <h2>Gestiones realizadas hoy</h2>
                  </div>

                  <span className="today-count done-count">
                    {completadasFiltradas.length}
                  </span>
                </div>

                {completadas.length === 0 ? (
                  <div className="today-empty">
                    <span>○</span>
                    <p>Aún no has completado gestiones hoy.</p>
                  </div>
                ) : (
                  completadasFiltradas.map((tarea) => renderTarea(tarea))
                )}
              </section>
            </>
          )}
        </main>

        <aside className="today-side-panel">
          <div className="today-panel-header">
            <small>GESTIÓN SELECCIONADA</small>
            <h2>
              {seleccionada
                ? obtenerTituloSubtarea(seleccionada)
                : "Selecciona una gestión"}
            </h2>
          </div>

          {seleccionada ? (
            <>
              <p className="today-panel-event">
                {seleccionada.evento?.titulo || "Evento sin título"}
              </p>

              <div className="today-panel-info">
                <span>Horas estimadas: </span>
                <strong>{obtenerHoras(seleccionada)}h</strong>
              </div>

              <div className="today-panel-info">
                <span>Estado: </span>
                <strong>{etiquetaEstado(seleccionada.estado)}</strong>
              </div>

              <div className="today-panel-info">
                <span>Fecha: </span>
                <strong>
                  {seleccionada.dia_objetivo
                    ? formatearFecha(seleccionada.dia_objetivo)
                    : "Hoy"}
                </strong>
              </div>

              {normalizarEstado(seleccionada.estado) !== "hecho" ? (
                <>
                  <button
                    className="today-register-button"
                    type="button"
                    disabled={actualizando === seleccionada.id}
                    onClick={() => cambiarEstado(seleccionada, "hecho")}
                  >
                    {actualizando === seleccionada.id
                      ? "Guardando…"
                      : "✓ Registrar ejecución"}
                  </button>

                  <button
                    className="today-panel-secondary"
                    type="button"
                    disabled={actualizando === seleccionada.id}
                    onClick={() => abrirModalPosponer(seleccionada)}
                  >
                    Reprogramar gestión
                  </button>
                </>
              ) : (
                <div className="today-panel-success">
                  ✓ Gestión realizada
                </div>
              )}

              {seleccionada.evento?.id && (
                <button
                  className="today-panel-cancel"
                  type="button"
                  onClick={() =>
                    navegar(`/eventos/${seleccionada.evento.id}`)
                  }
                >
                  Ver evento
                </button>
              )}
            </>
          ) : (
            <p className="today-panel-empty">
              Selecciona una gestión para consultar sus detalles y registrar
              su ejecución.
            </p>
          )}
        </aside>
      </div>
      <section className="today-upcoming-section">
        <div className="today-upcoming-header">
          <div>
            <h2>Próximas gestiones</h2>
            <p>Ten presentes las gestiones programadas para los próximos días.</p>
          </div>

          <span className="today-upcoming-count">
            {proximasGestiones.length}
          </span>
        </div>

        {proximasGestionesFiltradas.length === 0 ? (
          <div className="today-upcoming-empty">
            <span>✓</span>
            <p>No hay tareas programadas.</p>
          </div>
        ) : (
          <div className="today-upcoming-list">
              {proximasGestionesFiltradas.map((tarea) => {
              const fecha = String(tarea.fechaObjetivo || "").slice(0, 10);

              const fechaTarea = new Date(`${fecha}T00:00:00`);
              const fechaHoy = new Date(
                `${obtenerFechaLocalHoy()}T00:00:00`
              );

              const diferenciaDias = Math.round(
                (fechaTarea - fechaHoy) / (1000 * 60 * 60 * 24)
              );

              return (
                <article
                  className="today-upcoming-card"
                  key={tarea.id}
                  onClick={() => setSeleccionada(tarea)}
                >
                  <div className="today-upcoming-days">
                    <strong>+{diferenciaDias}</strong>
                    <span>día{diferenciaDias !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="today-upcoming-main">
                    <h3>{obtenerTituloSubtarea(tarea)}</h3>

                    <div className="today-upcoming-meta">
                      <span>
                        📅{" "}
                        {tarea.evento?.titulo || "Evento sin título"}
                      </span>

                      <span>•</span>

                      <span>
                        {formatearFecha(tarea.fechaObjetivo)}
                      </span>
                    </div>
                  </div>

                  <div className="today-upcoming-hours">
                    {obtenerHoras(tarea)}h
                  </div>

                  <span className="today-upcoming-arrow">
                    Ver detalles →
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {tareaPosponer && !conflictoJornada && !resolverSobrecarga && (
        <div className="postpone-overlay">
          <div
            className="postpone-modal postpone-schedule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="postpone-title"
          >
            <button
              type="button"
              className="postpone-close"
              onClick={() => setTareaPosponer(null)}
              disabled={guardandoPosposicion}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="postpone-task-summary">
              <span className="postpone-task-icon">✦</span>
              <div>
                <small>
                  {tareaPosponer.evento?.titulo || "Evento"}
                  {tareaPosponer.evento?.estado
                    ? ` · ${tareaPosponer.evento.estado}`
                    : ""}
                </small>
                <strong>{obtenerTituloSubtarea(tareaPosponer)}</strong>
                <span>
                  Responsable:
                  {" "}
                  {tareaPosponer.responsable ||
                    tareaPosponer.evento?.usuario_responsable ||
                    "Sin asignar"}
                </span>
              </div>
              <span className="postpone-original-date">
                ORIGINAL:{" "}
                <strong>
                  {formatearFecha(
                    tareaPosponer.dia_objetivo || tareaPosponer.fechaObjetivo
                  )}
                </strong>
              </span>
            </div>

            <div className="postpone-calendar-heading">
              <h3>
                <span aria-hidden="true">▦</span>{" "}
                {new Intl.DateTimeFormat("es-CO", {
                  month: "long",
                  year: "numeric",
                }).format(mesCalendario)}
              </h3>
              <div>
                <button
                  type="button"
                  aria-label="Mes anterior"
                  disabled={
                    mesCalendario.getFullYear() === new Date().getFullYear() &&
                    mesCalendario.getMonth() === new Date().getMonth()
                  }
                  onClick={() =>
                    setMesCalendario(
                      new Date(
                        mesCalendario.getFullYear(),
                        mesCalendario.getMonth() - 1,
                        1
                      )
                    )
                  }
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="postpone-today-link"
                  onClick={() => {
                    const hoy = new Date();
                    setMesCalendario(
                      new Date(hoy.getFullYear(), hoy.getMonth(), 1)
                    );
                    setNuevaFecha(obtenerFechaLocalHoy());
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() =>
                    setMesCalendario(
                      new Date(
                        mesCalendario.getFullYear(),
                        mesCalendario.getMonth() + 1,
                        1
                      )
                    )
                  }
                >
                  ›
                </button>
              </div>
            </div>

            <div className="postpone-calendar" aria-label="Seleccionar fecha">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                (dia) => (
                  <span className="postpone-weekday" key={dia}>
                    {dia}
                  </span>
                )
              )}
              {diasCalendario.map((dia, index) => {
                if (!dia) {
                  return <span className="postpone-day-spacer" key={`empty-${index}`} />;
                }

                const fecha = [
                  mesCalendario.getFullYear(),
                  String(mesCalendario.getMonth() + 1).padStart(2, "0"),
                  String(dia).padStart(2, "0"),
                ].join("-");
                const horasDelDia = horasProgramadasEn(fecha);
                const fechaPasada = fecha < obtenerFechaLocalHoy();
                const seleccionada = nuevaFecha === fecha;
                return (
                  <button
                    type="button"
                    className={`postpone-calendar-day ${seleccionada ? "selected" : ""} ${fechaPasada ? "past" : ""} ${horasDelDia >= capacidadDiaria ? "full" : ""}`}
                    key={fecha}
                    disabled={fechaPasada || guardandoPosposicion}
                    aria-pressed={seleccionada}
                    onClick={() => setNuevaFecha(fecha)}
                  >
                    <span>{dia}</span>
                    <small>{horasDelDia}h/{capacidadDiaria}h</small>
                  </button>
                );
              })}
            </div>

            {excedeJornadaSeleccionada && (
              <div className="postpone-overload-inline" role="alert">
                <strong>⚠</strong>
                <span>
                  {formatearFecha(nuevaFecha)} supera tu jornada diaria:{" "}
                  {horasAsignadasEnFecha.toFixed(1)}h acumuladas frente a{" "}
                  {capacidadDiaria.toFixed(1)}h de tope.
                </span>
              </div>
            )}

            <div className="postpone-fields-row">
              <div className="postpone-field postpone-hours-field">
                <label htmlFor="horas-reprogramacion">
                  Horas estimadas de ejecución
                </label>
                <div className="postpone-hours-control">
                  <button
                    type="button"
                    aria-label="Reducir duración"
                    disabled={guardandoPosposicion || horasPosposicion <= 0.5}
                    onClick={() =>
                      setHorasPosposicion((horas) =>
                        Math.max(0.5, Number((Number(horas) - 0.5).toFixed(1)))
                      )
                    }
                  >
                    −
                  </button>
                  <input
                    id="horas-reprogramacion"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={horasPosposicion}
                    onChange={(event) =>
                      setHorasPosposicion(Number(event.target.value))
                    }
                    disabled={guardandoPosposicion}
                  />
                  <span>horas</span>
                  <button
                    type="button"
                    aria-label="Aumentar duración"
                    disabled={guardandoPosposicion || horasPosposicion >= 24}
                    onClick={() =>
                      setHorasPosposicion((horas) =>
                        Math.min(24, Number((Number(horas) + 0.5).toFixed(1)))
                      )
                    }
                  >
                    +
                  </button>
                </div>
                <small>Base: {obtenerHoras(tareaPosponer)}h</small>
              </div>

              <div className="postpone-field">
                <label htmlFor="motivo-posposicion">
                  Solicitud de reprogramación <span>Requerida</span>
                </label>
                <textarea
                  id="motivo-posposicion"
                  value={motivoPosposicion}
                  onChange={(event) =>
                    setMotivoPosposicion(event.target.value)
                  }
                  disabled={guardandoPosposicion}
                  required
                  maxLength={500}
                  placeholder="Describe el motivo o la solicitud para reprogramar esta subtarea..."
                />
              </div>
            </div>

            <div className="postpone-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setTareaPosponer(null);
                  setNuevaFecha("");
                  setMotivoPosposicion("");
                }}
                disabled={guardandoPosposicion}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={confirmarPosposicion}
                disabled={
                  !nuevaFecha ||
                  !motivoPosposicion.trim() ||
                  !horasPosposicion ||
                  guardandoPosposicion
                }
              >
                {guardandoPosposicion
                  ? "Reprogramando…"
                  : "Confirmar y verificar agenda"}
              </button>
            </div>
          </div>
        </div>
      )}
      {conflictoJornada && !resolverSobrecarga && tareaPosponer && (
        <div className="postpone-overlay">
          <div
            className="agenda-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="limit-title"
          >
            <button
              type="button"
              className="postpone-close"
              aria-label="Cerrar"
              disabled={guardandoPosposicion}
              onClick={() => {
                setConflictoJornada(null);
                setTareaPosponer(null);
              }}
            >
              ×
            </button>
            <div className="agenda-modal-title">
              <span className="agenda-warning-icon">⚠</span>
              <div>
                <h2 id="limit-title">Límite de jornada excedido</h2>
                <p>
                  El {formatearFecha(conflictoJornada.fecha_objetivo)} superarías
                  tu jornada máxima configurada ({conflictoJornada.limite_horas}h).
                </p>
              </div>
            </div>
            <div className="agenda-capacity-card">
              <div>
                <strong>
                  {Number(conflictoJornada.horas_asignadas).toFixed(1)}h{" "}
                  <small>asignadas</small>
                </strong>
                <span>
                  {Number(conflictoJornada.limite_horas).toFixed(1)}h de tope
                  {" "}· +{Number(conflictoJornada.exceso_horas).toFixed(1)}h
                  {" "}de exceso
                </span>
              </div>
              <div className="agenda-capacity-track">
                <span
                  style={{
                    width: `${Math.min(
                      (Number(conflictoJornada.limite_horas) /
                        Number(conflictoJornada.horas_asignadas)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <small className="agenda-breakdown-label">DESGLOSE DEL DÍA</small>
            <div className="agenda-breakdown">
              {conflictoJornada.agenda.map((gestion) => (
                <div className="agenda-breakdown-item" key={gestion.id}>
                  <span>
                    <strong>
                      {gestion.titulo}
                      {gestion.es_subtarea_reprogramada && (
                        <em> · Causa del exceso</em>
                      )}
                    </strong>
                    <small>{gestion.evento}</small>
                  </span>
                  <b>{Number(gestion.horas_estimadas).toFixed(1)}h</b>
                </div>
              ))}
            </div>
            <div className="agenda-modal-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={guardandoPosposicion}
                onClick={() => {
                  setConflictoJornada(null);
                  setTareaPosponer(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={comenzarResolucion}
                disabled={guardandoPosposicion}
              >
                Resolver conflicto →
              </button>
            </div>
          </div>
        </div>
      )}
      {conflictoJornada && resolverSobrecarga && tareaPosponer && (
        <div className="postpone-overlay">
          <div
            className="agenda-modal resolution-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolution-title"
          >
            <button
              type="button"
              className="postpone-close"
              aria-label="Cerrar"
              disabled={guardandoPosposicion}
              onClick={() => setResolverSobrecarga(false)}
            >
              ×
            </button>
            <h2 id="resolution-title">Resolver sobrecarga de horas</h2>
            <p>
              {formatearFecha(conflictoJornada.fecha_objetivo)} · Exceso de{" "}
              {Number(conflictoJornada.exceso_horas).toFixed(1)}h. Selecciona
              cómo deseas equilibrar tu agenda.
            </p>
            <div className="agenda-capacity-card compact">
              <div>
                <strong>
                  {Number(conflictoJornada.horas_asignadas).toFixed(1)}h
                  {" "}asignadas
                </strong>
                <span>
                  {Number(conflictoJornada.limite_horas).toFixed(1)}h de tope
                  {" "}· +{Number(conflictoJornada.exceso_horas).toFixed(1)}h
                  {" "}de exceso
                </span>
              </div>
              <div className="agenda-capacity-track">
                <span
                  style={{
                    width: `${Math.min(
                      (Number(conflictoJornada.limite_horas) /
                        Number(conflictoJornada.horas_asignadas)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="resolution-cause">
              ⚠ {obtenerTituloSubtarea(tareaPosponer)} · Causa del exceso
              {" "}({Number(horasPosposicion).toFixed(1)}h)
            </div>
            <div className="resolution-options">
              {conflictoJornada.fecha_recomendada && (
                <button
                  type="button"
                  className={`resolution-option ${estrategiaSobrecarga === "mover" ? "selected" : ""}`}
                  aria-pressed={estrategiaSobrecarga === "mover"}
                  onClick={() => setEstrategiaSobrecarga("mover")}
                >
                  <span className="resolution-radio" />
                  <span>
                    <strong>
                      Mover a {formatearFecha(conflictoJornada.fecha_recomendada)}
                      <em>Recomendada</em>
                    </strong>
                    <small>
                      Reubica la gestión completa en el siguiente día con
                      disponibilidad, sin recortar alcance.
                    </small>
                  </span>
                </button>
              )}
              <button
                type="button"
                className={`resolution-option ${estrategiaSobrecarga === "ajustar" ? "selected" : ""}`}
                aria-pressed={estrategiaSobrecarga === "ajustar"}
                onClick={() => setEstrategiaSobrecarga("ajustar")}
              >
                <span className="resolution-radio" />
                <span>
                  <strong>
                    Ajustar a {Number(horasManuales).toFixed(1)}h hoy
                  </strong>
                  <small>
                    Reduce la duración para cumplir el límite de{" "}
                    {Number(conflictoJornada.limite_horas).toFixed(1)}h.
                    {" "}Disponibles:{" "}
                    {Number(conflictoJornada.horas_disponibles).toFixed(1)}h.
                  </small>
                </span>
              </button>
            </div>
            {estrategiaSobrecarga === "ajustar" && (
              <div className="postpone-field resolution-hours-field">
                <label htmlFor="horas-ajuste">Duración ajustada (horas)</label>
                <input
                  id="horas-ajuste"
                  type="number"
                  min="0.5"
                  max={conflictoJornada.horas_disponibles}
                  step="0.5"
                  value={horasManuales}
                  onChange={(event) =>
                    setHorasManuales(Number(event.target.value))
                  }
                  disabled={guardandoPosposicion}
                />
              </div>
            )}
            <div className="agenda-modal-actions resolution-actions">
              <button
                type="button"
                className="btn text-button"
                onClick={() => setEstrategiaSobrecarga("ajustar")}
              >
                Ajustar manualmente
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={guardandoPosposicion}
                onClick={() => setResolverSobrecarga(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={aplicarResolucionSobrecarga}
                disabled={
                  guardandoPosposicion ||
                  (estrategiaSobrecarga === "mover" &&
                    !conflictoJornada.fecha_recomendada) ||
                  (estrategiaSobrecarga === "ajustar" &&
                    (!horasManuales ||
                      horasManuales <= 0 ||
                      horasManuales >
                        Number(conflictoJornada.horas_disponibles)))
                }
              >
                {guardandoPosposicion ? "Reprogramando…" : "Aplicar solución"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function OnboardingRegistro() {
  const [seleccionados, setSeleccionados] = useState([
    "fiesta",
    "corporativos",
  ]);

  const opciones = [
    {
      id: "fiesta",
      titulo: "Fiesta",
      etiqueta: "Social",
      descripcion:
        "Bodas, cumpleaños, aniversarios, galas y celebraciones sociales privadas.",
      pie: "Plantillas de banquete",
      icono: "✣",
    },
    {
      id: "corporativos",
      titulo: "Eventos corporativos",
      etiqueta: "B2B",
      descripcion:
        "Lanzamientos de producto, congresos empresariales, reuniones de accionistas y convenciones.",
      pie: "Actas y sponsors",
      icono: "▦",
    },
    {
      id: "personales",
      titulo: "Eventos personales",
      etiqueta: "Íntimo",
      descripcion:
        "Reuniones íntimas, baby showers, cenas exclusivas y compromisos familiares.",
      pie: "Listas RSVP privadas",
      icono: "♡",
    },
    {
      id: "culturales",
      titulo: "Eventos culturales",
      etiqueta: "Público",
      descripcion:
        "Festivales de música, exposiciones de arte, obras de teatro y eventos comunitarios.",
      pie: "Boletaje y aforos",
      icono: "▣",
    },
    {
      id: "tecnologia",
      titulo: "Eventos en tecnología",
      etiqueta: "Tech",
      descripcion:
        "Hackathones, summits tecnológicos, meetups de desarrolladores y lanzamientos de software.",
      pie: "Sprints & Keynotes",
      icono: "▤",
    },
  ];

  const alternarSeleccion = (id) => {
    setSeleccionados((actuales) =>
      actuales.includes(id)
        ? actuales.filter((item) => item !== id)
        : [...actuales, id]
    );
  };

  const comenzarOrganizar = () => {
    navegar("/eventos");
  };

  const omitir = () => {
    navegar("/eventos");
  };

  return (
    <main className="onboarding-page">
      <section className="onboarding-container">

        {/* BRAND */}
        <div className="onboarding-brand">
          <img
            src={logo_EventHub}
            alt="EventHub"
            className="onboarding-logo"
          />

          <span className="onboarding-workspace">
            ESPACIO DE TRABAJO
          </span>
        </div>

        {/* PASO */}
        <div className="onboarding-step">
          <span>☷</span>
          <strong>Paso 2 de 2</strong>
          <span>•</span>
          <span>Personalización de tu espacio de trabajo</span>
        </div>

        {/* TITULO */}
        <div className="onboarding-heading">
          <h1>¿Qué enfoque estás buscando?</h1>

          <p>
            Selecciona el tipo de eventos que gestionas con mayor frecuencia
            para calibrar tus plantillas, cronogramas y parámetros de capacidad.
          </p>

          <small>
            ⓘ Puedes elegir más de uno para adaptar tu panel multifuncional
          </small>
        </div>

        {/* OPCIONES */}
        <div className="onboarding-options">
          {opciones.map((opcion) => {
            const seleccionado = seleccionados.includes(opcion.id);

            return (
              <button
                key={opcion.id}
                type="button"
                className={`onboarding-option ${seleccionado ? "selected" : ""
                  }`}
                onClick={() => alternarSeleccion(opcion.id)}
              >
                <div className="onboarding-option-top">
                  <span className="onboarding-option-icon">
                    {opcion.icono}
                  </span>

                  <span
                    className={`onboarding-check ${seleccionado ? "checked" : ""
                      }`}
                    aria-hidden="true"
                  >
                    {seleccionado ? "✓" : ""}
                  </span>
                </div>

                <div className="onboarding-option-title">
                  <h2>{opcion.titulo}</h2>
                  <span>{opcion.etiqueta}</span>
                </div>

                <p>{opcion.descripcion}</p>

                <div className="onboarding-option-footer">
                  <span>{opcion.pie}</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ACCIONES */}
        <div className="onboarding-actions">
          <button
            type="button"
            className="onboarding-skip"
            onClick={omitir}
          >
            Omitir por ahora
          </button>

          <button
            type="button"
            className="onboarding-start"
            onClick={comenzarOrganizar}
          >
            Comenzar a Organizar
            <span>→</span>
          </button>
        </div>

        {/* FOOTER */}
        <footer className="onboarding-footer">
          <strong>EventHub OS</strong>
          <span>—</span>
          <span>Plataforma Operativa de Alto Rendimiento para Productoras y Organizadores</span>

          <small>
            © 2025 EventHub Inc. Todos los derechos reservados.
            Tus preferencias se sincronizan en la nube.
          </small>
        </footer>

      </section>
    </main>
  );
}
function RegistroUsuario() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [codigoPais, setCodigoPais] = useState("+57");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] =
    useState(false);

  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const categoriasPassword = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const nivelPassword =
    password.length >= 12 && categoriasPassword >= 3
      ? "segura"
      : password.length >= 8 && categoriasPassword >= 2
        ? "media"
        : "debil";
  const etiquetaPassword = {
    debil: "Contraseña no segura",
    media: "Contraseña medianamente segura",
    segura: "Contraseña segura",
  }[nivelPassword];

  const validar = () => {
    const next = {};

    if (!nombre.trim()) {
      next.nombre = "El nombre es requerido.";
    } else if (nombre.trim().length < 2) {
      next.nombre = "El nombre debe tener al menos 2 caracteres.";
    }

    if (!apellido.trim()) {
      next.apellido = "El apellido es requerido.";
    } else if (apellido.trim().length < 2) {
      next.apellido = "El apellido debe tener al menos 2 caracteres.";
    }

    if (!email.trim()) {
      next.email = "El correo electrónico es requerido.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      next.email = "Ingresa un correo electrónico válido.";
    }

    const telefonoLimpio = telefono.replace(/\D/g, "");

    if (!telefonoLimpio) {
      next.telefono = "El teléfono es requerido.";
    } else if (telefonoLimpio.length < 7) {
      next.telefono = "Ingresa un teléfono válido.";
    }

    if (!password) {
      next.password = "La contraseña es requerida.";
    } else if (password.length < 8) {
      next.password = "La contraseña debe tener mínimo 8 caracteres.";
    }

    if (!confirmarPassword) {
      next.confirmarPassword = "Confirma tu contraseña.";
    } else if (password !== confirmarPassword) {
      next.confirmarPassword = "Las contraseñas no coinciden.";
    }

    if (!aceptaTerminos) {
      next.terminos =
        "Debes aceptar los términos y la política de privacidad.";
    }

    return next;
  };

  const limpiarError = (campo) => {
    setErrores((prev) => ({
      ...prev,
      [campo]: "",
    }));

    setErrorServidor("");
  };

  const enviar = async (event) => {
    event.preventDefault();

    const next = validar();

    setErrores(next);
    setErrorServidor("");

    if (Object.keys(next).length > 0) {
      return;
    }

    setEnviando(true);

    try {
      const telefonoCompleto = `${codigoPais} ${telefono
        .replace(/\s+/g, " ")
        .trim()}`;

      const dataRegistro = await registrarUsuario({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefonoCompleto,
        password,
      });

      // Iniciar sesión automáticamente después del registro
      const sesion = await iniciarSesion(
        email.trim(),
        password
      );

      guardarSesion(sesion);

      navegar("/registro/onboarding");
    } catch (error) {
      setErrorServidor(
        error.message || "No fue posible crear la cuenta."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-card">

        {/* BRAND */}
        <div className="register-brand">
          <img
            src={logo_EventHub}
            alt="EventHub"
            className="register-logo"
          />

          <h1>Crea tu cuenta de organizador</h1>
        </div>

        {/* ERROR SERVIDOR */}
        {errorServidor && (
          <div className="register-error" role="alert">
            <strong>No fue posible crear la cuenta.</strong>
            <span>{errorServidor}</span>
          </div>
        )}

        <form onSubmit={enviar} noValidate>

          {/* NOMBRE / APELLIDO */}
          <div className="register-fields-row">

            <div className="register-field">
              <label htmlFor="register-nombre">
                Nombre <span>*</span>
              </label>

              <input
                id="register-nombre"
                type="text"
                placeholder="Ej. Valentina"
                value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                  limpiarError("nombre");
                }}
                autoComplete="given-name"
                aria-invalid={Boolean(errores.nombre)}
              />

              {errores.nombre && (
                <small className="register-inline-error">
                  {errores.nombre}
                </small>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="register-apellido">
                Apellido <span>*</span>
              </label>

              <input
                id="register-apellido"
                type="text"
                placeholder="Ej. Morales"
                value={apellido}
                onChange={(event) => {
                  setApellido(event.target.value);
                  limpiarError("apellido");
                }}
                autoComplete="family-name"
                aria-invalid={Boolean(errores.apellido)}
              />

              {errores.apellido && (
                <small className="register-inline-error">
                  {errores.apellido}
                </small>
              )}
            </div>

          </div>

          {/* EMAIL */}
          <div className="register-field">
            <label htmlFor="register-email">
              Correo electrónico corporativo <span>*</span>
            </label>

            <div className="register-input-with-icon">
              <span>✉</span>

              <input
                id="register-email"
                type="email"
                placeholder="coordinador@eventhub.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  limpiarError("email");
                }}
                autoComplete="email"
                aria-invalid={Boolean(errores.email)}
              />
            </div>

            {errores.email && (
              <small className="register-inline-error">
                {errores.email}
              </small>
            )}
          </div>

          {/* TELEFONO */}
          <div className="register-field">
            <label htmlFor="register-telefono">
              Teléfono de contacto <span>*</span>
            </label>

            <div className="register-phone">

              <select
                value={codigoPais}
                onChange={(event) => {
                  setCodigoPais(event.target.value);
                  limpiarError("telefono");
                }}
                aria-label="Código de país"
              >
                <option value="+34">+34</option>
                <option value="+57">+57</option>
                <option value="+1">+1</option>
                <option value="+52">+52</option>
              </select>

              <input
                id="register-telefono"
                type="tel"
                placeholder="300 123 4567"
                value={telefono}
                onChange={(event) => {
                  setTelefono(event.target.value);
                  limpiarError("telefono");
                }}
                autoComplete="tel"
                aria-invalid={Boolean(errores.telefono)}
              />

            </div>

            {errores.telefono && (
              <small className="register-inline-error">
                {errores.telefono}
              </small>
            )}
          </div>

          {/* PASSWORD */}
          <div className="register-field">

            <div className="register-label-row">
              <label htmlFor="register-password">
                Contraseña de acceso <span>*</span>
              </label>

              <small>
                Mín. 8 caracteres
              </small>
            </div>

            <div className="register-input-with-icon">

              <span>♙</span>

              <input
                id="register-password"
                type={mostrarPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  limpiarError("password");
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(errores.password)}
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setMostrarPassword((prev) => !prev)
                }
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarPassword ? <FaEyeSlash /> : <FaEye />}
              </button>

            </div>

            <div className="register-helper-row">
              <span>{etiquetaPassword}</span>
            </div>
            <div
              className={`password-strength password-strength-${nivelPassword}`}
              role="meter"
              aria-label={etiquetaPassword}
              aria-valuemin="0"
              aria-valuemax="3"
              aria-valuenow={nivelPassword === "debil" ? 1 : nivelPassword === "media" ? 2 : 3}
            >
              <span />
              <span />
              <span />
            </div>

            {errores.password && (
              <small className="register-inline-error">
                {errores.password}
              </small>
            )}
          </div>

          {/* CONFIRMAR PASSWORD */}
          <div className="register-field">

            <label htmlFor="register-confirm-password">
              Confirmar contraseña <span>*</span>
            </label>

            <div className="register-input-with-icon">

              <span>♙</span>

              <input
                id="register-confirm-password"
                type={
                  mostrarConfirmarPassword
                    ? "text"
                    : "password"
                }
                placeholder="••••••••••••"
                value={confirmarPassword}
                onChange={(event) => {
                  setConfirmarPassword(event.target.value);
                  limpiarError("confirmarPassword");
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(errores.confirmarPassword)}
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setMostrarConfirmarPassword((prev) => !prev)
                }
                aria-label={
                  mostrarConfirmarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarConfirmarPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

            {errores.confirmarPassword && (
              <small className="register-inline-error">
                {errores.confirmarPassword}
              </small>
            )}
          </div>

          {/* TERMINOS */}
          <div className="register-terms">

            <input
              id="register-terms"
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(event) => {
                setAceptaTerminos(event.target.checked);
                limpiarError("terminos");
              }}
            />

            <label htmlFor="register-terms">
              Acepto los Términos de Servicio y reconozco la Política
              de Privacidad de EventHub, incluyendo el tratamiento de
              registros de producción logística.
            </label>

          </div>

          {errores.terminos && (
            <small className="register-inline-error register-terms-error">
              {errores.terminos}
            </small>
          )}

          {/* CONTINUAR */}
          <button
            type="submit"
            className="register-submit"
            disabled={enviando}
          >
            {enviando
              ? "Creando cuenta..."
              : "Continuar al Onboarding  →"}
          </button>

        </form>

        {/* LOGIN */}
        <div className="register-login-divider">
          <span>¿ya tienes credenciales?</span>
        </div>

        <button
          type="button"
          className="register-login-link"
          onClick={() => navegar("/login")}
        >
          Iniciar Sesión en EventHub&nbsp; →
        </button>

      </section>
    </main>
  );
}
export default function App() {
  const [ruta, setRuta] = useState(obtenerRutaInicial);
  const [eventos, setEventos] = useState([]);
  const [busquedaEventos, setBusquedaEventos] = useState("");
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [errorEventos, setErrorEventos] = useState("");
  const [toast, setToast] = useState({ type: "success", message: "" });
  const toastTimer = useRef(null);

  const cargarEventos = async () => {
    setCargandoEventos(true); setErrorEventos("");
    try { const data = await obtenerEventos(); setEventos(Array.isArray(data) ? data : []); }
    catch (error) { setErrorEventos(error.message); }
    finally { setCargandoEventos(false); }
  };

  useEffect(() => {
    const rutaInicialNavegador = window.location.pathname;
    if (
      !estaAutenticado() &&
      esRutaPrivada(rutaInicialNavegador) &&
      rutaInicialNavegador !== "/login"
    ) {
      window.history.replaceState({}, "", "/login");
    }

    const onPop = (event) => {
      const path = window.location.pathname;

      if (
        ruta === "/registro" &&
        !event.state?.eventhubInternalNavigation
      ) {
        window.history.replaceState({}, "", "/login");
        setRuta("/login");
        return;
      }

      if (esRutaPrivada(path) && !estaAutenticado()) {
        window.history.replaceState({}, "", "/login");
        setRuta("/login");
        return;
      }

      if (path === "/login" && estaAutenticado()) {
        window.history.replaceState({}, "", "/eventos");
        setRuta("/eventos");
        return;
      }

      setRuta(rutaActual());
    };

    window.addEventListener("popstate", onPop);

    if (ruta === "/eventos" && estaAutenticado()) {
      cargarEventos();
    }

    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [ruta]);

  const notify = (message, type = "success") => {
    clearTimeout(toastTimer.current); setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast({ type, message: "" }), 4000);
  };

  const crear = async (evento, subtarea = null) => {
    const creado = await crearEvento(evento);
    if (subtarea && creado?.id) {
      try {
        await crearSubtarea({
          ...subtarea,
          evento_id: creado.id,
          dia_objetivo: evento.fecha,
        });
      } catch (error) {
        notify(
          `El evento se creó, pero no fue posible guardar la subtarea: ${error.message}`,
          "error"
        );
        navegar(`/eventos/${creado.id}`);
        return;
      }
    } else if (subtarea) {
      notify("El evento se creó, pero no se recibió su identificador para guardar la subtarea.", "error");
      await cargarEventos();
      navegar("/eventos");
      return;
    }

    notify(subtarea ? "Evento y subtarea creados correctamente" : "Evento creado correctamente");
    if (creado?.id) navegar(`/eventos/${creado.id}`);
    else { await cargarEventos(); navegar("/eventos"); }
  };

  const detalleId = ruta.startsWith("/eventos/") ? ruta.split("/")[2] : null;

  if (ruta === "/login") {
    return (
      <Login
        onLogin={() => {
          navegar("/eventos");
        }}
      />
    );
  }
  if (ruta === "/registro") {
    return <RegistroUsuario />;
  }

  if (ruta === "/registro/onboarding") {
    return <OnboardingRegistro />;
  }

  return <main className="app">
    <Header
      ruta={ruta}
      abrirCrear={() => navegar("/crear-evento")}
      busquedaEventos={busquedaEventos}
      onBuscarEventos={setBusquedaEventos}
    />
    <Toast type={toast.type} message={toast.message} />
    {ruta === "/eventos" && <Eventos eventos={eventos} cargando={cargandoEventos} error={errorEventos} recargar={cargarEventos} crear={() => navegar("/crear-evento")} busqueda={busquedaEventos} />}
    {ruta === "/hoy" && <Today onNotify={notify} />}
    {ruta === "/configuracion" && (<ConfiguracionUsuario onNotify={notify} />)}
    {detalleId && <DetalleEvento id={detalleId} volver={() => navegar("/eventos")} onNotify={notify} onEventosChanged={cargarEventos} />}
    {ruta === "/crear-evento" && <CrearEventoPage onCancelar={() => navegar("/eventos")} onCrear={crear} />}
  </main>;

}
