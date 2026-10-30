import { ChevronRight, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import {
  Campo, Card, Columnas, Estado, Formulario, Hoja, LineaPeso, Resumen, diaSemana, fechaCorta, isoLocal, limpiar, num, useApi,
} from "../ui.jsx";

export default function Fitness() {
  const comida = useApi(`/comida?fecha=${isoLocal()}`);
  const { data: f, error, cargando } = useApi("/fitness");
  const [hoja, setHoja] = useState(null); // "medidas" | "entreno"
  const [series, setSeries] = useState([{ ejercicio: "", reps: "", peso_kg: "" }]);
  const m = f?.metricas;
  const ultimaCintura = m?.registros.filter((r) => r.cintura_cm).at(-1);

  function cambiarSerie(i, campo, valor) {
    setSeries((s) => s.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Progreso</h1></header>
      <Estado cargando={cargando && !f} error={!f && error}>
        {f && (
          <>
            <Resumen>
              <span className="resumen-etiqueta">Peso · tendencia</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
                <span className="resumen-cifra">{m.tendencia.length ? `${num(m.tendencia.at(-1).tendencia, 1)} kg` : "—"}</span>
                {m.kg_semana !== null && (
                  <span className="badge" style={{ background: "rgb(255 255 255 / 0.14)", color: "inherit" }}>
                    <Ico i={m.kg_semana < 0 ? TrendingDown : m.kg_semana > 0 ? TrendingUp : Minus} size={12} />
                    {m.kg_semana > 0 ? "+" : ""}{num(m.kg_semana, 2)} kg/sem
                  </span>
                )}
              </div>
              <div className="resumen-pie">
                <div><small>Cintura</small><b>{ultimaCintura ? `${num(ultimaCintura.cintura_cm, 1)} cm` : "—"}</b></div>
                <div><small>Entrenos · 7 días</small><b>{f.entrenos.filter((w) => (Date.now() - new Date(`${w.fecha}T12:00:00`)) / 864e5 < 7).length}</b></div>
                <div><small>Registros</small><b>{m.registros.length}</b></div>
              </div>
            </Resumen>

            <Card titulo="Peso · últimos 90 días" accion={<button className="enlace ver" onClick={() => setHoja("medidas")}><Ico i={Plus} size={16} />Medidas</button>}>
              <LineaPeso puntos={m.tendencia} />
            </Card>

            {comida.data && (
              <Card titulo="Calorías · últimos 7 días">
                <Columnas datos={comida.data.semana} valor={(x) => x.kcal} meta={comida.data.metas.kcal}
                          etiqueta={(x) => diaSemana(x.fecha)} formato={(v) => `${num(v)} kcal`} />
              </Card>
            )}

            <Card titulo="Entrenamientos" accion={<button className="enlace ver" onClick={() => setHoja("entreno")}><Ico i={Plus} size={16} />Entreno</button>}>
              {!f.entrenos.length && <p className="suave">Registra tus sesiones aquí o cuéntaselas al chat ("hoy hice press banca 4x8 con 80").</p>}
              <ul className="lista">
                {f.entrenos.map((w) => (
                  <li key={w.id} className="fila bloque">
                    <details>
                      <summary>
                        <Ico i={ChevronRight} size={16} /><b>{w.nombre}</b> <small className="suave">{fechaCorta(w.fecha)} · {w.series.length} series</small>
                      </summary>
                      <table className="tabla">
                        <thead><tr><th>Ejercicio</th><th>Serie</th><th>Reps</th><th>Kg</th></tr></thead>
                        <tbody>
                          {w.series.map((s) => (
                            <tr key={s.id}><td>{s.ejercicio}</td><td>{s.serie}</td><td>{s.reps}</td><td>{num(s.peso_kg, 1)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      {w.notas && <p className="suave chico-txt">{w.notas}</p>}
                      <button className="chico enlace peligro" onClick={async () => {
                        if (!confirm("¿Borrar este entreno?")) return;
                        await api(`/entrenos/${w.id}`, { method: "DELETE" });
                        avisarCambio();
                      }}>borrar</button>
                    </details>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </Estado>

      <Hoja titulo="Medidas de hoy" abierta={hoja === "medidas"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          await api("/metricas", { method: "POST", body: limpiar(v, ["peso_kg", "cintura_cm", "grasa_pct"]) });
          avisarCambio();
          setHoja(null);
        }}>
          <Campo label="Fecha" name="fecha" type="date" defaultValue={isoLocal()} />
          <div className="grid-2">
            <Campo label="Peso (kg)" name="peso_kg" type="number" step="0.1" inputMode="decimal" />
            <Campo label="Cintura (cm)" name="cintura_cm" type="number" step="0.1" inputMode="decimal" />
          </div>
          <Campo label="% grasa (opcional)" name="grasa_pct" type="number" step="0.1" inputMode="decimal" />
          <p className="suave chico-txt">Pésate en ayunas, después del baño. La tendencia suaviza el agua y la sal del día a día.</p>
        </Formulario>
      </Hoja>

      <Hoja titulo="Nuevo entreno" abierta={hoja === "entreno"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          const conteo = {};
          const lista = series.filter((s) => s.ejercicio.trim() && s.reps).map((s) => {
            const e = s.ejercicio.trim();
            conteo[e] = (conteo[e] || 0) + 1;
            return { ejercicio: e, serie: conteo[e], reps: Number(s.reps), peso_kg: Number(s.peso_kg) || 0 };
          });
          await api("/entrenos", { method: "POST", body: { ...limpiar(v), series: lista } });
          setSeries([{ ejercicio: "", reps: "", peso_kg: "" }]);
          avisarCambio();
          setHoja(null);
        }}>
          <div className="grid-2">
            <Campo label="Nombre" name="nombre" required placeholder="Torso A" />
            <Campo label="Fecha" name="fecha" type="date" defaultValue={isoLocal()} />
          </div>
          <div className="series">
            <div className="serie-fila cab"><span>Ejercicio</span><span>Reps</span><span>Kg</span></div>
            {series.map((s, i) => (
              <div key={i} className="serie-fila">
                <input value={s.ejercicio} placeholder="Press banca" list="ejercicios"
                       onChange={(e) => cambiarSerie(i, "ejercicio", e.target.value)} />
                <input value={s.reps} type="number" min="0" inputMode="numeric" onChange={(e) => cambiarSerie(i, "reps", e.target.value)} />
                <input value={s.peso_kg} type="number" min="0" step="0.5" inputMode="decimal" onChange={(e) => cambiarSerie(i, "peso_kg", e.target.value)} />
              </div>
            ))}
            <datalist id="ejercicios">
              {[...new Set(f?.entrenos.flatMap((w) => w.series.map((s) => s.ejercicio)) ?? [])].map((e) => <option key={e} value={e} />)}
            </datalist>
            <button type="button" className="secundario chico" onClick={() => setSeries((s) => [...s, { ...s.at(-1) }])}>
              + Serie (copia la anterior)
            </button>
          </div>
          <Campo label="Notas" name="notas" />
        </Formulario>
      </Hoja>
    </div>
  );
}
