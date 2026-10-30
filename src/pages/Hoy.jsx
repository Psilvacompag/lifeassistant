import { DosisLista, RutinaLista } from "../componentes.jsx";
import { Badge, Card, Estado, Progreso, clp, fechaCorta, fechaHora, num, useApi } from "../ui.jsx";

export default function Hoy({ nombre, ir }) {
  const { data: h, error, cargando } = useApi("/hoy");
  const nov = useApi("/novedades");
  const nuevas = nov.data?.items.filter((n) => !n.leido).slice(0, 3) ?? [];
  const saludo = (() => {
    const hora = new Date().getHours();
    return hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  })();
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>{saludo}, {nombre}</h1>
        {h && <p className="suave">{fechaCorta(h.fecha)} · {h.hora}</p>}
      </header>
      <Estado cargando={cargando && !h} error={!h && error}>
        {h && (
          <>
            <div className="atajos">
              <button className="atajo" onClick={() => ir("chat", { camara: true })}>📷 Foto de comida</button>
              <button className="atajo" onClick={() => ir("comida")}>🍽️ Registrar</button>
              <button className="atajo" onClick={() => ir("chat")}>💬 Preguntar</button>
            </div>

            <Card titulo="Comida de hoy" accion={<button className="enlace" onClick={() => ir("comida")}>ver →</button>}>
              {!h.nutricion.metas.kcal && (
                <p className="suave">
                  Define tus metas en <button className="enlace" onClick={() => ir("ajustes")}>Ajustes</button> para ver cuánto te falta.
                </p>
              )}
              <Progreso etiqueta="Calorías" valor={h.nutricion.totales.kcal} meta={h.nutricion.metas.kcal} unidad="kcal" />
              <Progreso etiqueta="Proteína" valor={h.nutricion.totales.proteina} meta={h.nutricion.metas.proteina}
                        unidad="g" exceso="bueno" />
            </Card>

            {h.dosis.length > 0 && (
              <Card titulo="Remedios y tratamientos">
                <DosisLista dosis={h.dosis} />
              </Card>
            )}

            {(h.rutina.am.length > 0 || h.rutina.pm.length > 0) && (
              <Card titulo="Rutina de cuidado" accion={<button className="enlace" onClick={() => ir("cuidado")}>ver →</button>}>
                {h.rutina.am.length > 0 && (<><h3>Mañana</h3><RutinaLista pasos={h.rutina.am} /></>)}
                {h.rutina.pm.length > 0 && (<><h3>Noche</h3><RutinaLista pasos={h.rutina.pm} /></>)}
              </Card>
            )}

            {h.citas.length > 0 && (
              <Card titulo="Próximas citas" accion={<button className="enlace" onClick={() => ir("salud")}>ver →</button>}>
                <ul className="lista">
                  {h.citas.slice(0, 3).map((c) => (
                    <li key={c.id} className="fila">
                      <span className="fila-txt">
                        <b>{c.titulo}</b>
                        <small className="suave">{fechaHora(c.inicio)}{c.lugar && ` · ${c.lugar}`}</small>
                        {c.preparacion && <small>⚠️ {c.preparacion}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="tiles">
              <button className="tile" onClick={() => ir("finanzas")}>
                <small className="suave">Gastado este mes</small>
                <b>{clp(h.finanzas.total_clp)}</b>
                {h.finanzas.por_confirmar > 0 && <Badge tono="aviso">{h.finanzas.por_confirmar} por confirmar</Badge>}
              </button>
              <button className="tile" onClick={() => ir("fitness")}>
                <small className="suave">Peso (tendencia)</small>
                <b>{h.peso ? `${num(h.peso.tendencia, 1)} kg` : "—"}</b>
                {!h.peso && <small className="suave">registra tu peso</small>}
              </button>
            </div>

            {nuevas.length > 0 && (
              <Card titulo="Novedades para ti" accion={<button className="enlace" onClick={() => ir("novedades")}>ver →</button>}>
                <ul className="lista">
                  {nuevas.map((n) => (
                    <li key={n.id} className="fila clic" onClick={() => ir("novedades")}>
                      <span className="fila-txt"><b>{n.titulo}</b><small className="suave">{n.tema} · {n.fuente}</small></span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {h.por_vencer.length > 0 && (
              <Card titulo="Productos por vencer">
                <ul className="lista">
                  {h.por_vencer.map((p) => (
                    <li key={p.id} className="fila">
                      <span className="fila-txt"><b>{p.nombre}</b><small className="suave">{p.area}</small></span>
                      <Badge tono="aviso">vence {fechaCorta(p.vence)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </Estado>
    </div>
  );
}
