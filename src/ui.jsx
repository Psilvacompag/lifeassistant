import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Sparkles, X } from "lucide-react";
import { api, avisarCambio } from "./api.js";
import { Ico } from "./iconos.jsx";

// ── Datos ────────────────────────────────────────────────────────────────────
/** Carga `path` y se recarga sola cuando otra pantalla o el chat avisan un cambio. */
export function useApi(path) {
  const [estado, setEstado] = useState({ data: null, error: null, cargando: true });
  const recargar = useCallback(() => {
    if (!path) return;
    api(path)
      .then((data) => setEstado({ data, error: null, cargando: false }))
      .catch((error) => setEstado((e) => ({ ...e, error, cargando: false })));
  }, [path]);
  useEffect(() => {
    setEstado((e) => ({ ...e, cargando: true }));
    recargar();
    window.addEventListener("la:cambio", recargar);
    return () => window.removeEventListener("la:cambio", recargar);
  }, [recargar]);
  return { ...estado, recargar };
}

/**
 * Checks que responden al instante: el toque se ve marcado de inmediato (con vibración corta) y la API va detrás.
 * Si falla, vuelve al valor del servidor y deja el error. `valor(id, servidor)` da lo que hay que mostrar.
 * `salida` (ms): para listas donde lo marcado desaparece, espera a que termine la animación antes de recargar.
 */
export function useMarcas(enviar, { salida = 0 } = {}) {
  const [local, setLocal] = useState({});
  const [error, setError] = useState("");
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);
  const marcar = useCallback(async (id, v) => {
    navigator.vibrate?.(10);
    setError("");
    setLocal((l) => ({ ...l, [id]: { v, hasta: Infinity } }));
    try {
      await Promise.all([enviar(id, v), new Promise((ok) => setTimeout(ok, salida))]);
      // Se mantiene un rato más: la recarga del servidor llega después y no debe parpadear.
      if (vivo.current) setLocal((l) => ({ ...l, [id]: { v, hasta: Date.now() + 4000 } }));
      avisarCambio();
    } catch (e) {
      if (!vivo.current) return;
      setLocal((l) => { const n = { ...l }; delete n[id]; return n; });
      setError(e.message);
    }
  }, [enviar, salida]);
  const valor = (id, servidor) => {
    const x = local[id];
    return x && x.hasta > Date.now() ? x.v : servidor;
  };
  const enCurso = (id) => local[id]?.hasta === Infinity;
  return { valor, marcar, enCurso, error };
}

/** Casilla con animación: se llena y el visto se dibuja. Decorativa: el botón o la fila llevan el texto. */
export function Caja({ marcada, chica }) {
  return (
    <span className={`caja ${marcada ? "marcada" : ""} ${chica ? "chica" : ""}`} aria-hidden>
      <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
    </span>
  );
}

// ── Formato ──────────────────────────────────────────────────────────────────
const clpFmt = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export const clp = (n) => clpFmt.format(Number(n) || 0);
export const num = (n, d = 0) =>
  Number(n ?? 0).toLocaleString("es-CL", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fechaCorta = (iso) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const anio = d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {};
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", ...anio });
};
export const diaSemana = (iso) =>
  new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "");
export const fechaHora = (iso) =>
  new Date(iso).toLocaleString("es-CL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const isoLocal = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

/** Monto en su moneda: CLP con formato chileno, dólares como US$, el resto con su código. */
export const dinero = (n, moneda = "CLP") =>
  moneda === "CLP" ? clp(n)
    : `${moneda === "USD" ? "US$" : `${moneda} `}${Number(n ?? 0).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Días desde hoy hasta una fecha YYYY-MM-DD (negativo si ya pasó). */
export const diasHasta = (iso) =>
  Math.round((new Date(`${String(iso).slice(0, 10)}T12:00:00`) - new Date(`${isoLocal()}T12:00:00`)) / 864e5);
/** "vence hoy", "vence mañana", "vence en 4 días", "venció hace 2 días". */
export const venceTexto = (iso) => {
  const d = diasHasta(iso);
  if (d < 0) return `venció hace ${-d} ${d === -1 ? "día" : "días"}`;
  return d === 0 ? "vence hoy" : d === 1 ? "vence mañana" : `vence en ${d} días`;
};

// ── Bloques ──────────────────────────────────────────────────────────────────
export function Card({ titulo, accion, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(titulo || accion) && (
        <div className="card-cab">
          {titulo && <h2>{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Estado({ cargando, error, vacio, children }) {
  if (error) return <p className="error" style={{ display: "flex", gap: "0.4rem" }}><Ico i={AlertCircle} /> No pude cargar esto: {error.message}</p>;
  if (cargando) return <p className="suave">Cargando…</p>;
  if (vacio) return <p className="suave">{vacio}</p>;
  return children;
}

export function Badge({ tono = "neutro", icono, children }) {
  return <span className={`badge ${tono}`}>{icono && <Ico i={icono} size={12} />}{children}</span>;
}

/** Barra de progreso hacia una meta; pasarse se marca con estado (ícono + texto, no solo color). */
export function Progreso({ etiqueta, valor, meta, unidad = "", exceso = "malo" }) {
  const pct = meta ? Math.min(100, (valor / meta) * 100) : 0;
  const pasado = meta && valor > meta;
  const tono = pasado ? (exceso === "malo" ? "serio" : "bueno") : pct >= 100 ? "bueno" : "normal";
  return (
    <div className="progreso">
      <div className="progreso-txt">
        <span>{etiqueta}</span>
        <span>
          <b>{num(valor)}</b>
          {meta ? ` / ${num(meta)} ${unidad}` : ` ${unidad}`}
          {pasado && exceso === "malo" && <span className="nota-estado serio"> · {num(valor - meta)} sobre la meta</span>}
          {meta && !pasado && valor < meta && <span className="nota-estado"> · faltan {num(meta - valor)}</span>}
          {meta && valor >= meta && !(pasado && exceso === "malo") && <span className="nota-estado bueno"> · meta cumplida</span>}
        </span>
      </div>
      <div className="progreso-pista" role="progressbar" aria-valuenow={valor} aria-valuemax={meta || undefined}>
        <div className={`progreso-barra ${tono}`} style={{ width: `${meta ? pct : 0}%` }} />
      </div>
    </div>
  );
}

/** Hoja inferior para formularios (modal). */
export function Hoja({ titulo, abierta, onCerrar, children }) {
  useEffect(() => {
    if (!abierta) return;
    const esc = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="hoja-cab">
          <h2>{titulo}</h2>
          <button className="icono" onClick={onCerrar} aria-label="Cerrar"><Ico i={X} size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Formulario con estado de envío y error; onEnviar recibe los valores como objeto. */
export function Formulario({ onEnviar, boton = "Guardar", reiniciar = false, children }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  async function enviar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setEnviando(true);
    setError("");
    try {
      await onEnviar(Object.fromEntries(new FormData(form)));
      if (reiniciar) form.reset();
      setListo(true);
      setTimeout(() => setListo(false), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <form className="form" onSubmit={enviar}>
      {children}
      {error && <p className="error">{error}</p>}
      <button disabled={enviando}>{enviando ? "Guardando…" : listo ? <><Ico i={Check} size={16} /> Guardado</> : boton}</button>
    </form>
  );
}

export function Campo({ label, ayuda, ...props }) {
  return (
    <label className="campo">
      <span>{label}</span>
      {props.type === "select" ? (
        <select {...props}>{props.children}</select>
      ) : props.type === "textarea" ? (
        <textarea rows={3} {...props} />
      ) : (
        <input {...props} />
      )}
      {ayuda && <small className="suave">{ayuda}</small>}
    </label>
  );
}

/** Convierte strings vacíos del formulario en null y números donde corresponde. */
export function limpiar(valores, numericos = []) {
  const out = {};
  for (const [k, v] of Object.entries(valores)) {
    if (v === "" || v === undefined) continue;
    out[k] = numericos.includes(k) ? Number(v) : v;
  }
  return out;
}

// ── Gráficos (colores de datos validados en dataviz; la interfaz usa la paleta washi) ──
/** Columnas de una serie con línea de meta y tooltip por columna. */
export function Columnas({ datos, valor, etiqueta, meta, formato = num, alto = 140 }) {
  const [hover, setHover] = useState(null);
  const ancho = 320;
  const max = Math.max(meta || 0, ...datos.map(valor), 1) * 1.1;
  const banda = ancho / datos.length;
  const bw = Math.min(24, banda * 0.6);
  const y = (v) => alto - 18 - (v / max) * (alto - 30);
  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Gráfico de columnas">
        <line x1="0" x2={ancho} y1={alto - 18} y2={alto - 18} className="eje" />
        {meta ? (
          <>
            <line x1="0" x2={ancho} y1={y(meta)} y2={y(meta)} className="meta" />
            <text x={ancho - 2} y={y(meta) - 4} textAnchor="end" className="txt-eje">meta {formato(meta)}</text>
          </>
        ) : null}
        {datos.map((d, i) => {
          const v = valor(d);
          const x = i * banda + (banda - bw) / 2;
          const h = alto - 18 - y(v);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={i * banda} y="0" width={banda} height={alto} fill="transparent" />
              {v > 0 && <path className="serie-1" d={barra(x, y(v), bw, h)} />}
              <text x={x + bw / 2} y={alto - 4} textAnchor="middle" className="txt-eje">{etiqueta(d)}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="tooltip">
          {etiqueta(datos[hover])}: <b>{formato(valor(datos[hover]))}</b>
        </div>
      )}
    </div>
  );
}

/** Barra con extremo de datos redondeado (4 px) y base recta. */
function barra(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/** Barras horizontales ordenadas (una serie): para gasto por categoría. */
export function BarrasH({ datos, valor, etiqueta, formato = num }) {
  const max = Math.max(...datos.map(valor), 1);
  return (
    <div className="barras-h">
      {datos.map((d, i) => (
        <div key={i} className="barra-h" title={`${etiqueta(d)}: ${formato(valor(d))}`}>
          <span className="barra-h-txt">{etiqueta(d)}</span>
          <span className="barra-h-pista">
            <span className="barra-h-fill serie-1-bg" style={{ width: `${(valor(d) / max) * 100}%` }} />
          </span>
          <span className="barra-h-val">{formato(valor(d))}</span>
        </div>
      ))}
    </div>
  );
}

/** Peso diario (puntos, gris) + tendencia (línea azul) con crosshair. Leyenda siempre visible. */
export function LineaPeso({ puntos }) {
  const [hover, setHover] = useState(null);
  if (puntos.length < 2) return <p className="suave">Con 2 registros o más aparece el gráfico.</p>;
  const W = 320, H = 160, pl = 34, pr = 10, pt = 10, pb = 20;
  const vals = puntos.flatMap((p) => [p.peso, p.tendencia]);
  const min = Math.floor(Math.min(...vals) - 0.5), max = Math.ceil(Math.max(...vals) + 0.5);
  const t0 = new Date(puntos[0].fecha).getTime(), t1 = new Date(puntos.at(-1).fecha).getTime() || t0 + 1;
  const x = (f) => pl + ((new Date(f).getTime() - t0) / (t1 - t0 || 1)) * (W - pl - pr);
  const y = (v) => pt + (1 - (v - min) / (max - min || 1)) * (H - pt - pb);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.fecha)},${y(p.tendencia)}`).join(" ");
  const ticks = [min, (min + max) / 2, max];
  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let mejor = 0;
    puntos.forEach((p, i) => { if (Math.abs(x(p.fecha) - px) < Math.abs(x(puntos[mejor].fecha) - px)) mejor = i; });
    setHover(mejor);
  }
  const ultimo = puntos.at(-1);
  return (
    <div className="grafico">
      <div className="leyenda">
        <span><i className="clave punto" /> Peso del día</span>
        <span><i className="clave linea serie-1-bg" /> Tendencia</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={mover} onClick={mover} onMouseLeave={() => setHover(null)}
           role="img" aria-label="Peso y tendencia">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} className="grilla" />
            <text x={pl - 4} y={y(t) + 3} textAnchor="end" className="txt-eje">{num(t, 1)}</text>
          </g>
        ))}
        {puntos.map((p, i) => <circle key={i} cx={x(p.fecha)} cy={y(p.peso)} r="3" className="punto-gris" />)}
        <path d={linea} className="linea serie-1-stroke" />
        <circle cx={x(ultimo.fecha)} cy={y(ultimo.tendencia)} r="4.5" className="serie-1 anillo" />
        <text x={x(ultimo.fecha) - 6} y={y(ultimo.tendencia) - 9} textAnchor="end" className="txt-dato">
          {num(ultimo.tendencia, 1)} kg
        </text>
        {hover !== null && (
          <line x1={x(puntos[hover].fecha)} x2={x(puntos[hover].fecha)} y1={pt} y2={H - pb} className="cruz" />
        )}
      </svg>
      {hover !== null && (
        <div className="tooltip">
          {fechaCorta(puntos[hover].fecha)} · peso <b>{num(puntos[hover].peso, 1)} kg</b> · tendencia{" "}
          <b>{num(puntos[hover].tendencia, 1)} kg</b>
        </div>
      )}
    </div>
  );
}

// ── Piezas de diseño: resumen, anillos, secciones, filas con ícono ──────────
/** Anillo de progreso hacia una meta (una serie: no necesita leyenda; el rótulo va al lado). */
export function Anillo({ valor, meta, tamano = 92, grosor = 9, children }) {
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  const pct = meta ? Math.min(1, valor / meta) : 0;
  return (
    <div className="anillo-caja" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} className="anillo-pista" strokeWidth={grosor} fill="none" />
        <circle cx={tamano / 2} cy={tamano / 2} r={r} className="anillo-valor" strokeWidth={grosor} fill="none"
                strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} />
      </svg>
      <div className="anillo-centro">{children}</div>
    </div>
  );
}

/** Bloque de resumen en el color de acento: el punto focal de cada pantalla. */
export function Resumen({ children, className = "" }) {
  return <section className={`resumen ${className}`}>{children}</section>;
}

/** Título de un grupo de tarjetas (fuera de la tarjeta). */
export function Seccion({ titulo, accion, children }) {
  return (
    <div className="seccion">
      <div className="seccion-cab">
        <h3>{titulo}</h3>
        {accion}
      </div>
      {children}
    </div>
  );
}

/** Cuadro con ícono para el inicio de una fila. tono: acento | bueno | aviso | serio | neutro */
export function IconoFila({ icono, tono = "acento" }) {
  return <span className={`icono-fila ${tono}`}><Ico i={icono} size={18} /></span>;
}

/** Bloque de fecha (02 / NOV) para citas y eventos. */
export function FechaBloque({ iso }) {
  const d = new Date(iso);
  return (
    <span className="fecha-bloque" aria-hidden="true">
      <b>{String(d.getDate()).padStart(2, "0")}</b>
      <small>{d.toLocaleDateString("es-CL", { month: "short" }).replace(".", "")}</small>
    </span>
  );
}

/** Iniciales neutras para comercios (sin colores por entidad: no codifican nada). */
export function Avatar({ texto }) {
  const ini = (texto || "?").replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, " ").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return <span className="avatar" aria-hidden="true">{ini || "?"}</span>;
}

/** Mini gráfico de barras (una serie) para resúmenes; sin ejes, con tooltip nativo. */
export function MiniBarras({ datos, valor, etiqueta, alto = 44 }) {
  const max = Math.max(...datos.map(valor), 1);
  return (
    <div className="mini-barras" style={{ height: alto }} role="img" aria-label="Tendencia">
      {datos.map((d, i) => (
        <span key={i} title={`${etiqueta(d)}`} style={{ height: `${Math.max(4, (valor(d) / max) * 100)}%` }}
              className={valor(d) > 0 ? "" : "vacia"} />
      ))}
    </div>
  );
}

/** Estado vacío de una pantalla: explica qué va a aparecer y ofrece pedírselo al chat. */
export function VacioChat({ icono, texto, pedido, ir }) {
  return (
    <Card className="vacio-chat">
      {icono && <IconoFila icono={icono} tono="neutro" />}
      <p className="suave chico-txt">{texto}</p>
      <button className="secundario chico" onClick={() => ir("chat", { texto: pedido })}>
        <Ico i={Sparkles} size={15} />Pedir al chat
      </button>
    </Card>
  );
}
