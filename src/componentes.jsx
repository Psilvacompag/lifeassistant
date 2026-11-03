import { useCallback, useState } from "react";
import { Check, ChevronDown, Clock, Lightbulb, LoaderCircle, Moon, Pill, RefreshCw, Stethoscope, Sun, ThumbsDown, ThumbsUp } from "lucide-react";
import { api, avisarCambio } from "./api.js";
import { Ico } from "./iconos.jsx";
import { Badge, Caja, IconoFila, num, useApi, useMarcas } from "./ui.jsx";

/** Dosis del día con botones Tomé / Omitir / Deshacer. Lo usan Hoy, Salud y Cuidado. */
export function DosisLista({ dosis, vacio = "Sin dosis programadas hoy." }) {
  const [ocupado, setOcupado] = useState(null);
  const [error, setError] = useState("");
  if (!dosis?.length) return <p className="suave">{vacio}</p>;
  async function marcar(d, estado) {
    const k = `${d.med_id}-${d.horario}`;
    setOcupado(k);
    setError("");
    try {
      await api("/dosis", { method: "POST", body: { med_id: d.med_id, horario: d.horario, estado } });
      avisarCambio();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(null);
    }
  }
  return (
    <>
      <ul className="lista">
        {dosis.map((d) => {
          const k = `${d.med_id}-${d.horario}`;
          return (
            <li key={k} className={`fila ${d.estado !== "pendiente" ? "hecha" : ""}`}>
              <span className="hora">{d.horario}</span>
              <span className="fila-txt">
                <b>{d.nombre}</b>
                <small className="suave">
                  {d.dosis}
                  {d.con_comida === true && " · con comida"}
                  {d.stock !== null && d.stock <= 5 && ` · quedan ${d.stock}`}
                </small>
              </span>
              {d.estado === "pendiente" ? (
                <span className="acciones">
                  {d.atrasada && <Badge tono="serio" icono={Clock}>atrasada</Badge>}
                  <button className="chico" disabled={ocupado === k} onClick={() => marcar(d, "tomada")}>Tomé</button>
                  <button className="chico secundario" disabled={ocupado === k} onClick={() => marcar(d, "omitida")}>Omitir</button>
                </span>
              ) : (
                <span className="acciones">
                  <Badge tono={d.estado === "tomada" ? "bueno" : "neutro"} icono={d.estado === "tomada" ? Check : undefined}>{d.estado === "tomada" ? "tomada" : "omitida"}</Badge>
                  <button className="chico enlace" disabled={ocupado === k} onClick={() => marcar(d, "pendiente")}>deshacer</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="error">{error}</p>}
    </>
  );
}

export const marcarPaso = (id, hecho) => api("/cuidado/check", { method: "POST", body: { step_id: id, hecho } });

/** Checklist de la rutina de cuidado (AM o PM). */
export function RutinaLista({ pasos, vacio }) {
  const { valor, marcar, error } = useMarcas(marcarPaso);
  if (!pasos?.length) return <p className="suave">{vacio}</p>;
  return (
    <>
      <ul className="lista">
        {pasos.map((p) => { const hecho = valor(p.id, p.hecho); return (
          <li key={p.id} className={`fila check ${hecho ? "hecha" : ""}`} onClick={() => marcar(p.id, !hecho)}
              role="checkbox" aria-checked={hecho} tabIndex={0} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), marcar(p.id, !hecho))}>
            <Caja marcada={hecho} />
            <span className="fila-txt">
              <b>{p.paso}</b>
              <small className="suave">{[p.area, p.producto].filter(Boolean).join(" · ")}</small>
            </span>
          </li>
        ); })}
      </ul>
      {error && <p className="error">{error}</p>}
    </>
  );
}

/** Agenda del día en línea de tiempo: remedios con su hora y las rutinas AM/PM, ordenados. */
export function AgendaHoy({ dosis, rutina, citasHoy = [], alIr }) {
  const [ocupado, setOcupado] = useState(null);
  async function marcar(d, estado) {
    setOcupado(`${d.med_id}-${d.horario}`);
    try {
      await api("/dosis", { method: "POST", body: { med_id: d.med_id, horario: d.horario, estado } });
      avisarCambio();
    } finally {
      setOcupado(null);
    }
  }
  const items = [
    ...dosis.map((d) => ({ tipo: "dosis", orden: d.horario, d })),
    ...citasHoy.map((c) => {
      const h = new Date(c.inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
      return { tipo: "cita", orden: h, c, hora: h };
    }),
    ...(rutina.am.length ? [{ tipo: "rutina", orden: "07:00", momento: "am", pasos: rutina.am }] : []),
    ...(rutina.pm.length ? [{ tipo: "rutina", orden: "21:30", momento: "pm", pasos: rutina.pm }] : []),
  ].sort((a, b) => a.orden.localeCompare(b.orden));
  if (!items.length) return <p className="suave">Nada programado para hoy.</p>;
  return (
    <ul className="agenda">
      {items.map((it) => {
        if (it.tipo === "dosis") {
          const d = it.d;
          const hecha = d.estado !== "pendiente";
          return (
            <li key={`d${d.med_id}${d.horario}`} className={hecha ? "hecha" : ""}>
              <span className="hora">{d.horario}</span>
              <IconoFila icono={Pill} tono={hecha ? (d.estado === "tomada" ? "bueno" : "neutro") : d.atrasada ? "serio" : "acento"} />
              <span className="contenido-agenda">
                <span className="fila-txt">
                  <b>{d.nombre}</b>
                  <small className="suave">{d.dosis}{d.con_comida ? " · con comida" : ""}</small>
                </span>
                {!hecha ? (
                  <span className="acciones">
                    <button className="chico" disabled={ocupado === `${d.med_id}-${d.horario}`} onClick={() => marcar(d, "tomada")}>Tomé</button>
                  </span>
                ) : (
                  <button className="chico enlace" onClick={() => marcar(d, "pendiente")}>deshacer</button>
                )}
              </span>
            </li>
          );
        }
        if (it.tipo === "cita") {
          return (
            <li key={`c${it.c.id}`}>
              <span className="hora">{it.hora}</span>
              <IconoFila icono={Stethoscope} tono="aviso" />
              <span className="fila-txt"><b>{it.c.titulo}</b><small className="suave">{it.c.lugar || it.c.tipo}</small></span>
            </li>
          );
        }
        const hechos = it.pasos.filter((p) => p.hecho).length;
        const completa = hechos === it.pasos.length;
        return (
          <li key={`r${it.momento}`} className={`clic ${completa ? "hecha" : ""}`} onClick={() => alIr("cuidado")} style={{ cursor: "pointer" }}>
            <span className="hora">{it.momento === "am" ? "AM" : "PM"}</span>
            <IconoFila icono={it.momento === "am" ? Sun : Moon} tono={completa ? "bueno" : "neutro"} />
            <span className="contenido-agenda">
              <span className="fila-txt">
                <b>Rutina de {it.momento === "am" ? "mañana" : "noche"}</b>
                <small className="suave">{it.pasos.map((p) => p.paso).join(" · ")}</small>
              </span>
              <Badge tono={completa ? "bueno" : "neutro"}>{hechos}/{it.pasos.length}</Badge>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const NOMBRE_COMIDA = { desayuno: "el desayuno", almuerzo: "el almuerzo", once: "la once", cena: "la cena", snack: "un snack" };
export const comidaDeAhora = () => {
  const h = new Date().getHours();
  return h < 11 ? "desayuno" : h < 16 ? "almuerzo" : h < 19 ? "once" : h < 23 ? "cena" : "snack";
};

/** Qué comer ahora: 3 ideas de mínimo esfuerzo que cierran lo que falta, con "La comí" y me gusta / no me gusta. */
export function IdeasComida({ comida = comidaDeAhora() }) {
  const { data, error, cargando } = useApi(`/comida/sugerencias?comida=${comida}`);
  const [propias, setPropias] = useState(null); // ideas nuevas pedidas con "Otras ideas"
  const [pidiendo, setPidiendo] = useState(false);
  const [votos, setVotos] = useState({}); // nombre → 1 | -1 | "comida"
  const [abierta, setAbierta] = useState(null);
  const ideas = propias ?? data?.ideas ?? [];

  async function otras() {
    setPidiendo(true);
    try {
      setPropias((await api(`/comida/sugerencias?comida=${comida}&nuevas=true`)).ideas);
      setVotos({});
    } finally {
      setPidiendo(false);
    }
  }
  async function votar(idea, voto) {
    setVotos((v) => ({ ...v, [idea.nombre]: voto }));
    await api("/comida/sugerencias/votar", { method: "POST", body: { nombre: idea.nombre, ingredientes: idea.ingredientes.join(", "), voto } });
  }
  async function comi(idea) {
    setVotos((v) => ({ ...v, [idea.nombre]: "comida" }));
    await api("/comida/sugerencias/comi", { method: "POST", body: { comida, idea: {
      nombre: idea.nombre, ingredientes: idea.ingredientes, kcal: idea.kcal, proteina: idea.proteina, carbos: idea.carbos, grasa: idea.grasa } } });
    avisarCambio();
  }

  if (error && !ideas.length) return <p className="suave chico-txt">No pude preparar ideas ahora. {error.message}</p>;
  if ((cargando && !ideas.length) || pidiendo) {
    return <p className="suave chico-txt cargando-ideas"><Ico i={LoaderCircle} size={15} className="girar" /> Pensando ideas para {NOMBRE_COMIDA[comida]}…</p>;
  }
  return (
    <div className="ideas">
      {ideas.map((idea, i) => {
        const v = votos[idea.nombre];
        return (
          <article key={idea.nombre} className={`idea ${v === -1 ? "descartada" : ""} ${v === "comida" ? "comida" : ""}`}>
            <button className="idea-cab" onClick={() => setAbierta(abierta === i ? null : i)} aria-expanded={abierta === i}>
              <span className="fila-txt">
                <b>{idea.nombre}</b>
                <small className="suave">{idea.descripcion}</small>
              </span>
              <Ico i={ChevronDown} size={18} className={`chevron ${abierta === i ? "abierto" : ""}`} />
            </button>
            <div className="idea-datos">
              <Badge icono={Clock}>{idea.minutos} min</Badge>
              <Badge>{num(idea.kcal)} kcal</Badge>
              <Badge tono="acento">{num(idea.proteina)} g proteína</Badge>
            </div>
            {abierta === i && (
              <div className="idea-detalle">
                <p className="chico-txt por-que"><Ico i={Lightbulb} size={15} /><span>{idea.por_que}</span></p>
                <h3>Ingredientes</h3>
                <ul>{idea.ingredientes.map((x) => <li key={x}>{x}</li>)}</ul>
                <h3>Cómo</h3>
                <ol>{idea.pasos.map((x) => <li key={x}>{x}</li>)}</ol>
                <p className="suave chico-txt">C {num(idea.carbos)} g · G {num(idea.grasa)} g · valores estimados</p>
              </div>
            )}
            <div className="idea-acciones">
              {v === "comida" ? (
                <Badge tono="bueno" icono={Check}>Registrada</Badge>
              ) : v === -1 ? (
                <small className="suave">No te la vuelvo a sugerir</small>
              ) : (
                <>
                  <button className="chico" onClick={() => comi(idea)}><Ico i={Check} size={15} />La comí</button>
                  <button className={`icono ${v === 1 ? "votado" : ""}`} aria-label="Me gusta" onClick={() => votar(idea, 1)}><Ico i={ThumbsUp} size={17} /></button>
                  <button className="icono" aria-label="No me gusta" onClick={() => votar(idea, -1)}><Ico i={ThumbsDown} size={17} /></button>
                </>
              )}
            </div>
          </article>
        );
      })}
      <button className="secundario chico" onClick={otras}><Ico i={RefreshCw} size={15} />Otras ideas</button>
    </div>
  );
}

const MOMENTO = { desayuno: "Desayuno", almuerzo: "Almuerzo", once: "Once", cena: "Cena", snack: "Snack" };

/**
 * Lo de siempre: las comidas fijas del día (el batido de la mañana). Cada una se marca con un toque y se desmarca
 * igual; si algo se repite varios días, propone dejarlo como de siempre. `datos` = respuesta de /comida/siempre.
 */
/** Lógica de "lo de siempre": marcar (registra) y desmarcar (borra el registro), con respuesta inmediata. */
export function useLoDeSiempre(datos, fecha) {
  const [logs, setLogs] = useState({}); // favorita → registro creado desde aquí (para deshacer antes de recargar)
  const hab = datos?.habituales ?? [];
  const logDe = (h) => h.log_id ?? logs[h.id];
  const enviar = useCallback(async (id, v) => {
    if (v) {
      const r = await api(`/comida/favoritas/${id}/registrar`, { method: "POST", body: { fecha } });
      setLogs((l) => ({ ...l, [id]: r.id }));
    } else {
      const h = hab.find((x) => x.id === id);
      const log = h && (h.log_id ?? logs[id]);
      if (log) await api(`/comida/${log}`, { method: "DELETE" });
      setLogs((l) => ({ ...l, [id]: undefined }));
    }
  }, [fecha, hab, logs]);
  const { valor, marcar, enCurso, error } = useMarcas(enviar);
  const hecha = (h) => valor(h.id, !!logDe(h));
  const tocar = (h) => !enCurso(h.id) && marcar(h.id, !hecha(h));
  return { hab, hecha, tocar, marcar, error };
}

export async function responderSugerencia(clave, aceptar) {
  await api("/comida/siempre/sugerencia", { method: "POST", body: { clave, aceptar } });
  avisarCambio();
}

export function LoDeSiempre({ datos, fecha, compacto, onElegir }) {
  const { hab, hecha, tocar, marcar, error } = useLoDeSiempre(datos, fecha);
  const pendientes = hab.filter((h) => !hecha(h));

  return (
    <>
      {hab.length > 0 && (
        <div className={`siempre ${compacto ? "compacto" : ""}`}>
          {hab.map((h) => {
            const ok = hecha(h);
            return (
              <button key={h.id} className={`siempre-item ${ok ? "hecha" : ""}`} onClick={() => tocar(h)} aria-pressed={ok}
                      aria-label={`${ok ? "Desmarcar" : "Marcar"} ${h.nombre}`}>
                <Caja marcada={ok} />
                <span className="siempre-txt">
                  <b>{h.nombre}</b>
                  <small>{MOMENTO[h.comida] ?? "Cuando sea"} · {num(h.kcal)} kcal · {num(h.proteina)} g prot.</small>
                </span>
              </button>
            );
          })}
          {pendientes.length > 1 && (
            <button className="secundario chico siempre-todo" onClick={() => pendientes.forEach((h) => marcar(h.id, true))}>
              <Ico i={Check} size={15} />Marcar todo ({pendientes.length})
            </button>
          )}
        </div>
      )}
      {error && <small className="error">{error}</small>}
      {datos?.sugerencia && <SugerenciaSiempre s={datos.sugerencia} />}
      {!hab.length && !datos?.sugerencia && onElegir && (
        <div className="siempre-vacio">
          <p className="widget-vacio">¿Comes algo casi todos los días? Déjalo como <b>de siempre</b> y lo marcas con un toque aquí y en Inicio, sin escribir nada.</p>
          <button className="secundario chico" onClick={onElegir}>Elegir mis de siempre</button>
        </div>
      )}
    </>
  );
}

function SugerenciaSiempre({ s }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  async function responder(aceptar) {
    setOcupado(true);
    setError("");
    try {
      await responderSugerencia(s.clave, aceptar);
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }
  return (
    <div className="siempre-sug">
      <small className="widget-sub">Lo anotaste {s.dias} días en las últimas dos semanas</small>
      <b>{s.descripcion}</b>
      <small className="widget-sub">{MOMENTO[s.comida]} · {num(s.kcal)} kcal · {num(s.proteina)} g prot.</small>
      <div className="botonera">
        <button className="chico" disabled={ocupado} onClick={() => responder(true)}><Ico i={Check} size={15} />Dejar como de siempre</button>
        <button className="secundario chico" disabled={ocupado} onClick={() => responder(false)}>No</button>
      </div>
      {error && <small className="error">{error}</small>}
    </div>
  );
}
