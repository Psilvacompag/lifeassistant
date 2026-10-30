import { AlertTriangle, Camera, ChevronRight, MessageCircle, Newspaper, Plus } from "lucide-react";
import { AgendaHoy } from "../componentes.jsx";
import { Ico } from "../iconos.jsx";
import {
  Anillo, Avatar, Badge, Card, Estado, FechaBloque, IconoFila, Resumen, Seccion, clp, fechaCorta, fechaHora, num, useApi,
} from "../ui.jsx";

const mismoDia = (iso, fecha) => new Date(iso).toLocaleDateString("sv-SE") === String(fecha).slice(0, 10);

export default function Hoy({ nombre, ir }) {
  const { data: h, error, cargando } = useApi("/hoy");
  const nov = useApi("/novedades");
  const nuevas = nov.data?.items.filter((n) => !n.leido).slice(0, 3) ?? [];
  const saludo = (() => {
    const hora = new Date().getHours();
    return hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  })();
  const n = h?.nutricion;
  const citasHoy = h?.citas.filter((c) => mismoDia(c.inicio, h.fecha)) ?? [];
  const proximas = h?.citas.filter((c) => !mismoDia(c.inicio, h.fecha)) ?? [];
  const pendientes = h?.dosis.filter((d) => d.estado === "pendiente").length ?? 0;

  return (
    <div className="pagina">
      <header className="cab-inicio">
        <div className="pagina-cab">
          <p className="suave chico-txt">{h ? fechaCorta(h.fecha) : " "}</p>
          <h1>{saludo}, {nombre}</h1>
        </div>
        <button className="icono" onClick={() => ir("ajustes")} aria-label="Ajustes"><Avatar texto={nombre} /></button>
      </header>

      <Estado cargando={cargando && !h} error={!h && error}>
        {h && (
          <>
            <Resumen>
              <div className="resumen-anillos">
                <div className="resumen-anillo">
                  <Anillo valor={n.totales.kcal} meta={n.metas.kcal} tamano={68} grosor={7}>
                    <small>{n.metas.kcal ? `${Math.round((100 * n.totales.kcal) / n.metas.kcal)}%` : "—"}</small>
                  </Anillo>
                  <span className="datos">
                    <span className="resumen-etiqueta">Calorías</span>
                    <b>{num(n.totales.kcal)}</b>
                    <small>{n.metas.kcal ? `de ${num(n.metas.kcal)}` : "sin meta"}</small>
                  </span>
                </div>
                <div className="resumen-anillo">
                  <Anillo valor={n.totales.proteina} meta={n.metas.proteina} tamano={68} grosor={7}>
                    <small>{n.metas.proteina ? `${Math.round((100 * n.totales.proteina) / n.metas.proteina)}%` : "—"}</small>
                  </Anillo>
                  <span className="datos">
                    <span className="resumen-etiqueta">Proteína</span>
                    <b>{num(n.totales.proteina)} g</b>
                    <small>{n.metas.proteina ? `de ${num(n.metas.proteina)} g` : "sin meta"}</small>
                  </span>
                </div>
              </div>
              <div className="resumen-pie">
                <div><small>Te quedan</small><b>{n.restante.kcal !== null ? `${num(Math.max(0, n.restante.kcal))} kcal` : "—"}</b></div>
                <div><small>Gastado en el mes</small><b>{clp(h.finanzas.total_clp)}</b></div>
                <div><small>Peso</small><b>{h.peso ? `${num(h.peso.tendencia, 1)} kg` : "—"}</b></div>
              </div>
            </Resumen>

            <div className="atajos">
              <button className="atajo" onClick={() => ir("chat", { camara: true })}><Ico i={Camera} size={20} />Foto de comida</button>
              <button className="atajo" onClick={() => ir("comida")}><Ico i={Plus} size={20} />Registrar</button>
              <button className="atajo" onClick={() => ir("chat")}><Ico i={MessageCircle} size={20} />Preguntar</button>
            </div>

            <Seccion titulo="Agenda de hoy" accion={pendientes > 0 && <Badge tono="acento">{pendientes} pendiente{pendientes > 1 ? "s" : ""}</Badge>}>
              <Card>
                <AgendaHoy dosis={h.dosis} rutina={h.rutina} citasHoy={citasHoy} alIr={ir} />
              </Card>
            </Seccion>

            {proximas.length > 0 && (
              <Seccion titulo="Próximas citas" accion={<button className="enlace ver" onClick={() => ir("salud")}>Ver<Ico i={ChevronRight} size={16} /></button>}>
                <Card>
                  <ul className="lista">
                    {proximas.slice(0, 3).map((c) => (
                      <li key={c.id} className="fila">
                        <FechaBloque iso={c.inicio} />
                        <span className="fila-txt">
                          <b>{c.titulo}</b>
                          <small className="suave">{fechaHora(c.inicio)}{c.lugar && ` · ${c.lugar}`}</small>
                          {c.preparacion && <small className="nota-estado serio">Preparación: {c.preparacion}</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Seccion>
            )}

            {nuevas.length > 0 && (
              <Seccion titulo="Novedades para ti" accion={<button className="enlace ver" onClick={() => ir("novedades")}>Ver<Ico i={ChevronRight} size={16} /></button>}>
                <Card>
                  <ul className="lista">
                    {nuevas.map((x) => (
                      <li key={x.id} className="fila clic" onClick={() => ir("novedades")}>
                        <IconoFila icono={Newspaper} tono="neutro" />
                        <span className="fila-txt"><b>{x.titulo}</b><small className="suave">{x.tema} · {x.fuente}</small></span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Seccion>
            )}

            {h.por_vencer.length > 0 && (
              <Seccion titulo="Atención">
                <Card>
                  <ul className="lista">
                    {h.por_vencer.map((p) => (
                      <li key={p.id} className="fila">
                        <IconoFila icono={AlertTriangle} tono="aviso" />
                        <span className="fila-txt"><b>{p.nombre}</b><small className="suave">Vence {fechaCorta(p.vence)} · {p.area}</small></span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Seccion>
            )}
          </>
        )}
      </Estado>
    </div>
  );
}
