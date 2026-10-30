import { Check, ChevronRight, Droplet, Pill, Plus, X } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import { DosisLista } from "../componentes.jsx";
import {
  Anillo, Badge, Campo, Card, Estado, FechaBloque, Formulario, Hoja, IconoFila, Resumen, Seccion, limpiar, useApi,
} from "../ui.jsx";

export default function Salud() {
  const { data: s, error, cargando } = useApi("/salud");
  const [hoja, setHoja] = useState(null); // "med" | "cita" | {med}
  const citasPend = s?.citas.filter((c) => c.estado === "pendiente") ?? [];
  const citasPasadas = s?.citas.filter((c) => c.estado !== "pendiente") ?? [];
  const proxima = s?.dosis_hoy.find((d) => d.estado === "pendiente");

  async function estadoCita(id, estado) {
    await api(`/citas/${id}`, { method: "PATCH", body: { estado } });
    avisarCambio();
  }

  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Salud</h1></header>
      <Estado cargando={cargando && !s} error={!s && error}>
        {s && (
          <>
            <Resumen>
              <div className="resumen-fila">
                <Anillo valor={s.adherencia.tomadas} meta={s.adherencia.programadas || 1} tamano={96} grosor={9}>
                  <b style={{ fontSize: "1.25rem" }}>{s.adherencia.pct !== null ? `${s.adherencia.pct}%` : "—"}</b>
                </Anillo>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span className="resumen-etiqueta">Adherencia · 7 días</span>
                  <b style={{ fontSize: "1.05rem" }}>
                    {s.adherencia.programadas ? `${s.adherencia.tomadas} de ${s.adherencia.programadas} dosis` : "Sin registros aún"}
                  </b>
                  <small>{proxima ? `Próxima: ${proxima.nombre} a las ${proxima.horario}` : "Nada pendiente hoy"}</small>
                </div>
              </div>
              <div className="resumen-pie">
                <div><small>Medicamentos activos</small><b>{s.meds.filter((m) => m.activo).length}</b></div>
                <div><small>Citas pendientes</small><b>{citasPend.length}</b></div>
              </div>
            </Resumen>

            <Seccion titulo="Medicación de hoy">
              <Card>
                <DosisLista dosis={s.dosis_hoy} vacio="Nada programado para hoy." />
              </Card>
            </Seccion>

            <Seccion titulo="Medicamentos" accion={<button className="enlace ver" onClick={() => setHoja("med")}><Ico i={Plus} size={16} />Agregar</button>}>
              <Card>
                {!s.meds.length && <p className="suave" style={{ margin: 0 }}>Agrega tus remedios con sus horarios, o mándale una foto de la receta al chat.</p>}
                <ul className="lista">
                  {s.meds.map((m) => (
                    <li key={m.id} className={`fila clic ${m.activo ? "" : "hecha"}`} onClick={() => setHoja({ med: m })}>
                      <IconoFila icono={m.area === "cuidado" ? Droplet : Pill} tono={m.activo ? "acento" : "neutro"} />
                      <span className="fila-txt">
                        <b>{m.nombre}</b>
                        <small className="suave">{m.dosis} · {m.horarios.join(", ") || "sin horario"}</small>
                      </span>
                      {m.stock !== null && <Badge tono={m.stock <= 5 ? "aviso" : "neutro"}>stock {m.stock}</Badge>}
                      {!m.activo && <Badge>pausado</Badge>}
                      <Ico i={ChevronRight} size={18} className="chevron" />
                    </li>
                  ))}
                </ul>
              </Card>
            </Seccion>

            <Seccion titulo="Citas y exámenes" accion={<button className="enlace ver" onClick={() => setHoja("cita")}><Ico i={Plus} size={16} />Agregar</button>}>
              <Card>
                {!citasPend.length && <p className="suave" style={{ margin: 0 }}>Sin citas pendientes.</p>}
                <ul className="lista">
                  {citasPend.map((c) => (
                    <li key={c.id} className="fila">
                      <FechaBloque iso={c.inicio} />
                      <span className="fila-txt">
                        <b>{c.titulo}</b>
                        <small className="suave">
                          {new Date(c.inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} · {c.tipo}{c.lugar && ` · ${c.lugar}`}
                        </small>
                        {c.preparacion && <small className="nota-estado serio">Preparación: {c.preparacion}</small>}
                      </span>
                      <span className="acciones">
                        <button className="chico secundario" onClick={() => estadoCita(c.id, "hecha")}><Ico i={Check} size={15} />Hecha</button>
                        <button className="icono chico" aria-label="Cancelar cita" onClick={() => estadoCita(c.id, "cancelada")}><Ico i={X} size={16} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
                {citasPasadas.length > 0 && (
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary className="suave chico-txt"><Ico i={ChevronRight} size={15} />Anteriores ({citasPasadas.length})</summary>
                    <ul className="lista">
                      {citasPasadas.map((c) => (
                        <li key={c.id} className="fila hecha">
                          <FechaBloque iso={c.inicio} />
                          <span className="fila-txt"><b>{c.titulo}</b><small className="suave">{c.estado}</small></span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            </Seccion>
            <p className="suave chico-txt">
              Organizo tus remedios y citas; no reemplazo a tu médico. Los horarios y dosis son los que tú cargas.
            </p>
          </>
        )}
      </Estado>

      <Hoja titulo="Nuevo medicamento" abierta={hoja === "med"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          const d = limpiar(v, ["stock"]);
          d.horarios = (v.horarios || "").split(/[,\s]+/).filter(Boolean);
          d.con_comida = v.con_comida === "si" ? true : v.con_comida === "no" ? false : null;
          await api("/meds", { method: "POST", body: d });
          avisarCambio();
          setHoja(null);
        }}>
          <Campo label="Nombre" name="nombre" required placeholder="Minoxidil 5 %" />
          <Campo label="Dosis" name="dosis" required placeholder="1 comprimido de 50 mg / 1 ml" />
          <Campo label="Horarios" name="horarios" placeholder="08:00, 20:00" ayuda="Hora local, formato HH:MM, separados por coma." />
          <div className="grid-2">
            <Campo label="¿Con comida?" name="con_comida" type="select" defaultValue="">
              <option value="">da igual</option><option value="si">sí</option><option value="no">no</option>
            </Campo>
            <Campo label="Tipo" name="area" type="select" defaultValue="salud">
              <option value="salud">salud</option><option value="cuidado">cuidado (piel, pelo, barba)</option>
            </Campo>
            <Campo label="Stock (unidades)" name="stock" type="number" min="0" inputMode="numeric" />
            <Campo label="Termina el" name="fin" type="date" />
          </div>
          <Campo label="Notas" name="notas" type="textarea" placeholder="Indicación del médico, efectos a vigilar…" />
        </Formulario>
      </Hoja>

      <Hoja titulo={hoja?.med?.nombre ?? ""} abierta={!!hoja?.med} onCerrar={() => setHoja(null)}>
        {hoja?.med && (
          <Formulario boton="Guardar cambios" onEnviar={async (v) => {
            const d = limpiar(v, ["stock"]);
            d.horarios = (v.horarios || "").split(/[,\s]+/).filter(Boolean);
            d.activo = v.activo === "on";
            await api(`/meds/${hoja.med.id}`, { method: "PATCH", body: d });
            avisarCambio();
            setHoja(null);
          }}>
            <Campo label="Dosis" name="dosis" defaultValue={hoja.med.dosis} />
            <Campo label="Horarios" name="horarios" defaultValue={hoja.med.horarios.join(", ")} />
            <Campo label="Stock" name="stock" type="number" min="0" defaultValue={hoja.med.stock ?? ""} />
            <Campo label="Notas" name="notas" type="textarea" defaultValue={hoja.med.notas ?? ""} />
            <label className="check-linea"><input type="checkbox" name="activo" defaultChecked={hoja.med.activo} /> Activo</label>
            <button type="button" className="secundario peligro" onClick={async () => {
              if (!confirm(`¿Borrar ${hoja.med.nombre} y su historial?`)) return;
              await api(`/meds/${hoja.med.id}`, { method: "DELETE" });
              avisarCambio();
              setHoja(null);
            }}>Borrar medicamento</button>
          </Formulario>
        )}
      </Hoja>

      <Hoja titulo="Nueva cita o examen" abierta={hoja === "cita"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          const inicio = new Date(`${v.fecha}T${v.hora || "09:00"}`).toISOString();
          await api("/citas", { method: "POST", body: { ...limpiar(v), inicio, fecha: undefined, hora: undefined } });
          avisarCambio();
          setHoja(null);
        }}>
          <Campo label="Tipo" name="tipo" type="select" defaultValue="cita">
            <option value="cita">cita</option><option value="examen">examen</option><option value="control">control</option>
          </Campo>
          <Campo label="Qué es" name="titulo" required placeholder="Dermatólogo / Perfil lipídico" />
          <div className="grid-2">
            <Campo label="Fecha" name="fecha" type="date" required />
            <Campo label="Hora" name="hora" type="time" />
          </div>
          <Campo label="Lugar" name="lugar" placeholder="Clínica UC Christus, San Carlos" />
          <Campo label="Preparación" name="preparacion" placeholder="ayuno de 8 h" />
        </Formulario>
      </Hoja>
    </div>
  );
}
