import { useState } from "react";
import {
  ArrowLeft, Bookmark, Check, ChefHat, Clock, Flame, Lightbulb, LoaderCircle, Refrigerator, Sparkles, Timer, Trash2, Users,
} from "lucide-react";
import { api, avisarCambio } from "../api.js";
import { comidaDeAhora } from "../componentes.jsx";
import { Ico } from "../iconos.jsx";
import { Badge, Card, Estado, IconoFila, Seccion, num, useApi } from "../ui.jsx";

const ATAJOS = [
  "Pollo jugoso en la Crispi",
  "Algo elaborado con huevo para el fin de semana",
  "Meal prep para 3 almuerzos",
  "Snack alto en proteína sin cocinar",
];

export default function Recetas() {
  const lista = useApi("/recetas");
  const [abierta, setAbierta] = useState(null); // id de la receta abierta
  const [pedido, setPedido] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  async function crear(texto) {
    const t = (texto ?? pedido).trim();
    if (t.length < 3 || creando) return;
    setCreando(true);
    setError("");
    try {
      const r = await api("/recetas", { method: "POST", body: { pedido: t } });
      setPedido("");
      lista.recargar();
      setAbierta(r.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  }

  if (abierta) return <DetalleReceta id={abierta} onVolver={() => { setAbierta(null); lista.recargar(); }} />;

  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>Recetas</h1>
        <p className="suave">Sanas, altas en proteína y escritas para tu cocina. También puedes mandarle al chat un link o captura de una receta y la adapta.</p>
      </header>

      <Card className="nueva-receta">
        <label className="campo">
          <span>¿Qué quieres cocinar?</span>
          <textarea rows={2} value={pedido} onChange={(e) => setPedido(e.target.value)} disabled={creando}
                    placeholder="Ej.: trutros crujientes en la Crispi con algo verde, para 2" />
        </label>
        <div className="chips">
          {ATAJOS.map((a) => <button key={a} className="chip-btn" disabled={creando} onClick={() => crear(a)}>{a}</button>)}
        </div>
        <button disabled={creando || pedido.trim().length < 3} onClick={() => crear()}>
          {creando ? <><Ico i={LoaderCircle} size={16} className="girar" />Escribiendo tu receta…</> : <><Ico i={Sparkles} size={16} />Crear receta</>}
        </button>
        {creando && <p className="suave chico-txt">Toma unos 30-60 segundos. Puedes salir de la pantalla: igual queda guardada.</p>}
        {error && <p className="error chico-txt">{error}</p>}
      </Card>

      <Seccion titulo={`Tu recetario${lista.data?.length ? ` (${lista.data.length})` : ""}`}>
        <Estado cargando={lista.cargando && !lista.data} error={!lista.data && lista.error}
                vacio={lista.data && !lista.data.length && "Todavía no tienes recetas. Pide una arriba o desde el chat."}>
          <div className="lista-recetas">
            {lista.data?.map((r) => (
              <button key={r.id} className="receta-tarjeta" onClick={() => setAbierta(r.id)}>
                <IconoFila icono={ChefHat} tono={r.favorita ? "aviso" : "acento"} />
                <span className="fila-txt">
                  <b>{r.titulo}</b>
                  <small className="suave">
                    {r.minutos} min · {num(r.kcal)} kcal · {num(r.proteina)} g proteína / porción
                    {r.veces > 0 && ` · hecha ${r.veces} ${r.veces === 1 ? "vez" : "veces"}`}
                  </small>
                </span>
                {r.favorita && <Ico i={Bookmark} size={16} className="favorita-ico" />}
              </button>
            ))}
          </div>
        </Estado>
      </Seccion>
    </div>
  );
}

function Fuente({ fuente }) {
  let host = null;
  try { host = /^https?:\/\//.test(fuente) ? new URL(fuente).hostname.replace(/^www\./, "") : null; } catch { /* texto libre */ }
  return (
    <p className="suave chico-txt" style={{ margin: 0 }}>
      Adaptada de {host ? <a href={fuente} target="_blank" rel="noreferrer">{host}</a> : fuente === "foto" ? "una foto que mandaste" : "una receta que mandaste"}
    </p>
  );
}

function DetalleReceta({ id, onVolver }) {
  const { data: r, error, cargando, recargar } = useApi(`/recetas/${id}`);
  const [tengo, setTengo] = useState({}); // ingredientes marcados
  const [registrada, setRegistrada] = useState(false);
  const d = r?.datos;

  async function comi() {
    await api(`/recetas/${id}/comi`, { method: "POST", body: { comida: comidaDeAhora(), porciones: 1 } });
    setRegistrada(true);
    avisarCambio();
    recargar();
  }
  async function favorita() {
    await api(`/recetas/${id}`, { method: "PATCH", body: { favorita: !r.favorita } });
    recargar();
  }
  async function borrar() {
    if (!confirm("¿Borrar esta receta?")) return;
    await api(`/recetas/${id}`, { method: "DELETE" });
    onVolver();
  }

  return (
    <div className="pagina">
      <button className="enlace volver-interno" onClick={onVolver}><Ico i={ArrowLeft} size={17} />Recetas</button>
      <Estado cargando={cargando && !r} error={!r && error}>
        {d && (
          <>
            <header className="pagina-cab">
              <h1 style={{ fontSize: "1.45rem" }}>{d.titulo}</h1>
              <p className="suave">{d.descripcion}</p>
              {d.fuente && <Fuente fuente={d.fuente} />}
            </header>
            <div className="idea-datos">
              <Badge icono={Clock}>{d.minutos_total} min</Badge>
              {d.minutos_activos < d.minutos_total && <Badge>{d.minutos_activos} min activos</Badge>}
              <Badge icono={Users}>{d.porciones} {d.porciones === 1 ? "porción" : "porciones"}</Badge>
              <Badge>{d.dificultad}</Badge>
            </div>

            <div className="macros-receta">
              {[["kcal", d.por_porcion.kcal, ""], ["proteína", d.por_porcion.proteina, " g"], ["carbos", d.por_porcion.carbos, " g"], ["grasa", d.por_porcion.grasa, " g"]].map(([k, v, u]) => (
                <div key={k} className="dato-perfil"><b>{num(v)}{u}</b><small>{k}</small></div>
              ))}
            </div>
            <p className="suave chico-txt" style={{ margin: 0 }}>Por porción · valores estimados · {d.equipo}</p>

            <Seccion titulo="Ingredientes">
              <Card>
                <ul className="check-mini">
                  {d.ingredientes.map((x, i) => (
                    <li key={i} className={tengo[i] ? "hecha" : ""} onClick={() => setTengo((t) => ({ ...t, [i]: !t[i] }))}>
                      <span className={`caja ${tengo[i] ? "marcada" : ""}`} aria-hidden>{tengo[i] && <Ico i={Check} size={12} />}</span>
                      <span><b>{x.cantidad}</b> {x.item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Seccion>

            <Seccion titulo="Preparación">
              <Card>
                <ol className="pasos-receta">
                  {d.pasos.map((p, i) => (
                    <li key={i}>
                      <span className="paso-num">{i + 1}</span>
                      <div>
                        {p.modo && (
                          <span className="crispi-chip">
                            <Ico i={Flame} size={13} />{p.modo} · {p.minutos} min{p.recipiente && ` · recipiente ${p.recipiente}`}
                          </span>
                        )}
                        {!p.modo && p.minutos > 0 && <span className="paso-tiempo"><Ico i={Timer} size={13} />{p.minutos} min</span>}
                        <p>{p.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </Seccion>

            {(d.consejos?.length > 0 || d.conservacion) && (
              <Seccion titulo="Consejos">
                <Card>
                  {d.consejos.map((c) => <p key={c} className="chico-txt por-que"><Ico i={Lightbulb} size={15} /><span>{c}</span></p>)}
                  {d.conservacion && <p className="chico-txt por-que"><Ico i={Refrigerator} size={15} /><span>{d.conservacion}</span></p>}
                </Card>
              </Seccion>
            )}

            <div className="botonera">
              <button disabled={registrada} onClick={comi}>
                <Ico i={Check} size={16} />{registrada ? "Registrada" : "La comí (1 porción)"}
              </button>
              <button className="secundario" onClick={favorita}><Ico i={Bookmark} size={16} />{r.favorita ? "Favorita" : "Guardar como favorita"}</button>
              <button className="icono peligro" aria-label="Borrar receta" onClick={borrar}><Ico i={Trash2} size={18} /></button>
            </div>
          </>
        )}
      </Estado>
    </div>
  );
}
