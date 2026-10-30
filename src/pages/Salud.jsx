import { Plus } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import { DosisLista } from "../componentes.jsx";
import { Badge, Campo, Card, Estado, Formulario, Hoja, fechaHora, limpiar, useApi } from "../ui.jsx";

export default function Salud() {
  const { data: s, error, cargando } = useApi("/salud");
  const [hoja, setHoja] = useState(null); // "med" | "cita" | {med}
  const citasPend = s?.citas.filter((c) => c.estado === "pendiente") ?? [];
  const citasPasadas = s?.citas.filter((c) => c.estado !== "pendiente") ?? [];

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
            <Card titulo="Hoy" accion={s.adherencia.pct !== null && (
              <Badge tono={s.adherencia.pct >= 90 ? "bueno" : s.adherencia.pct >= 70 ? "aviso" : "serio"}>
                {s.adherencia.pct}% esta semana
              </Badge>
            )}>
              <DosisLista dosis={s.dosis_hoy} vacio="Sin tomas programadas hoy." />
            </Card>

            <Card titulo="Medicamentos" accion={<button className="chico secundario" onClick={() => setHoja("med")}><Ico i={Plus} size={16} />Agregar</button>}>
              {!s.meds.length && <p className="suave">Agrega tus remedios con sus horarios, o mándale una foto de la receta al chat.</p>}
              <ul className="lista">
                {s.meds.map((m) => (
                  <li key={m.id} className={`fila clic ${m.activo ? "" : "hecha"}`} onClick={() => setHoja({ med: m })}>
                    <span className="fila-txt">
                      <b>{m.nombre}</b>
                      <small className="suave">
                        {m.dosis} · {m.horarios.join(", ") || "sin horario"}
                        {m.area === "cuidado" && " · cuidado"}
                      </small>
                    </span>
                    {m.stock !== null && <Badge tono={m.stock <= 5 ? "aviso" : "neutro"}>stock {m.stock}</Badge>}
                    {!m.activo && <Badge>pausado</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card titulo="Citas y exámenes" accion={<button className="chico secundario" onClick={() => setHoja("cita")}><Ico i={Plus} size={16} />Agregar</button>}>
              {!citasPend.length && <p className="suave">Sin citas pendientes.</p>}
              <ul className="lista">
                {citasPend.map((c) => (
                  <li key={c.id} className="fila">
                    <span className="fila-txt">
                      <b>{c.titulo}</b> <Badge>{c.tipo}</Badge>
                      <small className="suave">{fechaHora(c.inicio)}{c.lugar && ` · ${c.lugar}`}</small>
                      {c.preparacion && <small className="nota-estado serio">Preparación: {c.preparacion}</small>}
                    </span>
                    <span className="acciones">
                      <button className="chico secundario" onClick={() => estadoCita(c.id, "hecha")}>Hecha</button>
                      <button className="chico enlace" onClick={() => estadoCita(c.id, "cancelada")}>cancelar</button>
                    </span>
                  </li>
                ))}
              </ul>
              {citasPasadas.length > 0 && (
                <details>
                  <summary className="suave">Anteriores ({citasPasadas.length})</summary>
                  <ul className="lista">
                    {citasPasadas.map((c) => (
                      <li key={c.id} className="fila hecha">
                        <span className="fila-txt"><b>{c.titulo}</b><small className="suave">{fechaHora(c.inicio)} · {c.estado}</small></span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
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
              if (!confirm(`¿Borrar ${hoja.med.nombre} y su historial de tomas?`)) return;
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
