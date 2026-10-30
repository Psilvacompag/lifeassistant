import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { api, avisarCambio } from "./api.js";
import { Ico } from "./iconos.jsx";
import { Badge } from "./ui.jsx";

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
