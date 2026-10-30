import { ArrowUpRight, Bookmark, Lightbulb, Trash2 } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import { Badge, Campo, Card, Estado, Formulario, Hoja, fechaCorta, fechaHora, useApi } from "../ui.jsx";

export default function Novedades() {
  const [tema, setTema] = useState(null);
  const { data: d, error, cargando } = useApi(`/novedades${tema ? `?tema=${tema}` : ""}`);
  const [hoja, setHoja] = useState(false);
  const [msg, setMsg] = useState("");

  async function marcar(n, cambios) {
    await api(`/novedades/${n.id}`, { method: "PATCH", body: cambios });
    avisarCambio();
  }
  async function buscar() {
    setMsg("");
    try {
      const r = await api("/novedades/buscar", { method: "POST" });
      setMsg(r.mensaje);
      avisarCambio();
    } catch (e) {
      setMsg(e.message);
    }
  }

  const sinLeer = d?.temas.reduce((s, t) => s + Number(t.sin_leer), 0) ?? 0;
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>Novedades</h1>
        <p className="suave">Lo nuevo de tus temas, filtrado para ti. Se actualiza a las 8:00 y a las 18:00.</p>
      </header>
      <Estado cargando={cargando && !d} error={!d && error}>
        {d && (
          <>
            <div className="chips">
              <button className={!tema ? "chip-btn activa" : "chip-btn"} onClick={() => setTema(null)}>
                Todo {sinLeer > 0 && <b>{sinLeer}</b>}
              </button>
              {d.temas.filter((t) => t.activo).map((t) => (
                <button key={t.id} className={tema === t.id ? "chip-btn activa" : "chip-btn"} onClick={() => setTema(t.id)}>
                  {t.tema} {Number(t.sin_leer) > 0 && <b>{t.sin_leer}</b>}
                </button>
              ))}
            </div>
            <div className="botonera">
              <button className="secundario chico" disabled={d.buscando} onClick={buscar}>{d.buscando ? "Buscando…" : "Buscar ahora"}</button>
              {sinLeer > 0 && (
                <button className="secundario chico" onClick={async () => { await api("/novedades/leidas", { method: "POST" }); avisarCambio(); }}>
                  Marcar todo leído
                </button>
              )}
              <button className="secundario chico" onClick={() => setHoja(true)}>Temas</button>
            </div>
            {msg && <p className="chico-txt">{msg}</p>}
            {d.ultima_busqueda && <p className="suave chico-txt">Última búsqueda: {fechaHora(d.ultima_busqueda.created_at)}</p>}

            {!d.items.length && (
              <p className="suave centro-txt">Aún no hay novedades. La primera búsqueda es hoy a las 18:00, o toca "Buscar ahora" (tarda unos minutos).</p>
            )}
            {d.items.map((n) => (
              <Card key={n.id} className={`novedad ${n.leido ? "leida" : ""}`}>
                <div className="novedad-meta">
                  <Badge>{n.tema ?? "—"}</Badge>
                  <Badge tono={n.relevancia >= 8 ? "bueno" : "neutro"}>relevancia {n.relevancia}/10</Badge>
                  {!n.leido && <span className="punto-nuevo" aria-label="sin leer" />}
                </div>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="novedad-titulo"
                   onClick={() => !n.leido && marcar(n, { leido: true })}>
                  {n.titulo} <Ico i={ArrowUpRight} size={16} />
                </a>
                <p className="chico-txt">{n.resumen}</p>
                {n.por_que && <p className="chico-txt por-que"><Ico i={Lightbulb} size={15} /><span>{n.por_que}</span></p>}
                <div className="novedad-pie">
                  <small className="suave">{n.fuente}{n.publicado && ` · ${fechaCorta(n.publicado)}`}</small>
                  <span className="acciones">
                    <button className="chico enlace" onClick={() => marcar(n, { guardado: !n.guardado })}><Ico i={Bookmark} size={15} />{n.guardado ? "guardada" : "guardar"}</button>
                    {!n.leido && <button className="chico enlace" onClick={() => marcar(n, { leido: true })}>leída</button>}
                  </span>
                </div>
              </Card>
            ))}
          </>
        )}
      </Estado>

      <Hoja titulo="Temas que sigo" abierta={hoja} onCerrar={() => setHoja(false)}>
        <ul className="lista">
          {d?.temas.map((t) => (
            <li key={t.id} className={`fila ${t.activo ? "" : "hecha"}`}>
              <span className="fila-txt"><b>{t.tema}</b><small className="suave">{t.descripcion}</small></span>
              <span className="acciones">
                <button className="chico secundario" onClick={async () => { await api(`/temas/${t.id}`, { method: "PATCH", body: { activo: !t.activo } }); avisarCambio(); }}>
                  {t.activo ? "Pausar" : "Activar"}
                </button>
                <button className="icono chico" aria-label="Borrar tema" onClick={async () => {
                  if (!confirm(`¿Dejar de seguir "${t.tema}"?`)) return;
                  await api(`/temas/${t.id}`, { method: "DELETE" });
                  avisarCambio();
                }}><Ico i={Trash2} size={16} /></button>
              </span>
            </li>
          ))}
        </ul>
        <h3>Nuevo tema</h3>
        <Formulario boton="Agregar tema" reiniciar onEnviar={async (v) => { await api("/temas", { method: "POST", body: v }); avisarCambio(); }}>
          <Campo label="Nombre" name="tema" required placeholder="Sueño" />
          <Campo label="Qué buscar y para qué" name="descripcion" type="textarea" required minLength={10}
                 placeholder="Cómo dormir mejor entrenando fuerte: estudios, hábitos, suplementos con evidencia." />
        </Formulario>
      </Hoja>
    </div>
  );
}
