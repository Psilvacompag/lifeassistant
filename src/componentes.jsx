import { useState } from "react";
import { Check, Clock, Moon, Pill, Stethoscope, Sun } from "lucide-react";
import { api, avisarCambio } from "./api.js";
import { Ico } from "./iconos.jsx";
import { Badge, IconoFila } from "./ui.jsx";

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

/** Checklist de la rutina de cuidado (AM o PM). */
export function RutinaLista({ pasos, vacio }) {
  const [error, setError] = useState("");
  if (!pasos?.length) return <p className="suave">{vacio}</p>;
  async function marcar(p) {
    setError("");
    try {
      await api("/cuidado/check", { method: "POST", body: { step_id: p.id, hecho: !p.hecho } });
      avisarCambio();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <ul className="lista">
        {pasos.map((p) => (
          <li key={p.id} className={`fila check ${p.hecho ? "hecha" : ""}`} onClick={() => marcar(p)}>
            <span className={`caja ${p.hecho ? "marcada" : ""}`} aria-hidden>{p.hecho && <Ico i={Check} size={14} />}</span>
            <span className="fila-txt">
              <b>{p.paso}</b>
              <small className="suave">{[p.area, p.producto].filter(Boolean).join(" · ")}</small>
            </span>
          </li>
        ))}
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
