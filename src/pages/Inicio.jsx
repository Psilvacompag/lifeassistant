import { useState } from "react";
import {
  AlertTriangle, Calendar, Camera, Check, ChevronRight, Dumbbell, Moon, Newspaper, Pill, Sparkles, Star, Sun, TrendingDown,
  TrendingUp, Utensils, Wallet,
} from "lucide-react";
import { api, avisarCambio } from "../api.js";
import { comidaDeAhora } from "../componentes.jsx";
import { Ico } from "../iconos.jsx";
import { Anillo, Avatar, Estado, FechaBloque, IconoFila, MiniBarras, Resumen, clp, fechaCorta, fechaHora, num, useApi } from "../ui.jsx";

const COMIDAS = ["desayuno", "almuerzo", "once", "cena", "snack"];

/** Tarjeta del panel: cabecera tocable (lleva al detalle) y cuerpo interactivo. */
function Widget({ icono, tono = "acento", titulo, contador, onAbrir, ancho, children }) {
  return (
    <section className={`widget ${ancho ? "ancho" : ""}`}>
      <button className="widget-cab" onClick={onAbrir} aria-label={`Abrir ${titulo}`}>
        <IconoFila icono={icono} tono={tono} />
        <span className="titulo">{titulo}</span>
        {contador && <span className="contador">{contador}</span>}
        <Ico i={ChevronRight} size={16} className="chevron" />
      </button>
      {children}
    </section>
  );
}

function VacioChat({ texto, pedido, ir }) {
  return (
    <>
      <p className="widget-vacio">{texto}</p>
      <button className="secundario chico widget-pie" onClick={() => ir("chat", { texto: pedido })}>
        <Ico i={Sparkles} size={15} />Pedir al chat
      </button>
    </>
  );
}

export default function Inicio({ nombre, ir }) {
  const { data: h, error, cargando } = useApi("/hoy");
  const saludo = (() => {
    const hora = new Date().getHours();
    return hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  })();

  return (
    <div className="pagina">
      <header className="cab-inicio">
        <div className="pagina-cab">
          <p className="suave chico-txt">{h ? fechaCorta(h.fecha) : " "}</p>
          <h1>{saludo}, {nombre}</h1>
        </div>
        <button className="icono" onClick={() => ir("perfil")} aria-label="Perfil"><Avatar texto={nombre} /></button>
      </header>

      <Estado cargando={cargando && !h} error={!h && error}>
        {h && (
          <>
            <ResumenDia h={h} ir={ir} />
            <div className="panel">
              <WidgetSkincare h={h} ir={ir} />
              <WidgetMedicacion h={h} ir={ir} />
              <WidgetComida h={h} ir={ir} />
              <WidgetEntreno h={h} ir={ir} />
              <WidgetFinanzas h={h} ir={ir} />
              {h.citas.length > 0 && <WidgetCitas h={h} ir={ir} />}
              <WidgetNovedades h={h} ir={ir} />
            </div>
          </>
        )}
      </Estado>
    </div>
  );
}

function ResumenDia({ h, ir }) {
  const n = h.nutricion;
  const pct = (v, m) => (m ? `${Math.round((100 * v) / m)}%` : "—");
  return (
    <Resumen>
      <button className="resumen-anillos" style={{ all: "unset", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", cursor: "pointer", width: "100%" }}
              onClick={() => ir("comida")} aria-label="Ver comida de hoy">
        {[["Calorías", n.totales.kcal, n.metas.kcal, ""], ["Proteína", n.totales.proteina, n.metas.proteina, " g"]].map(([t, v, m, u]) => (
          <span key={t} className="resumen-anillo">
            <Anillo valor={v} meta={m} tamano={68} grosor={7}><small>{pct(v, m)}</small></Anillo>
            <span className="datos">
              <span className="resumen-etiqueta">{t}</span>
              <b>{num(v)}{u}</b>
              <small>{m ? `de ${num(m)}${u}` : "sin meta"}</small>
            </span>
          </span>
        ))}
      </button>
      {!n.metas.kcal && (
        <div className="resumen-pie">
          <button className="secundario chico" onClick={() => ir("chat", { texto: "Ayúdame a definir mis metas de calorías y proteína." })}>
            <Ico i={Sparkles} size={15} />Definir mis metas con el chat
          </button>
        </div>
      )}
    </Resumen>
  );
}

function WidgetSkincare({ h, ir }) {
  const hora = new Date().getHours();
  const preferido = hora < 15 ? "am" : "pm";
  const momento = h.rutina[preferido].length ? preferido : h.rutina[preferido === "am" ? "pm" : "am"].length ? (preferido === "am" ? "pm" : "am") : preferido;
  const pasos = h.rutina[momento];
  const hechos = pasos.filter((p) => p.hecho).length;
  const [error, setError] = useState("");
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
    <Widget icono={momento === "am" ? Sun : Moon} titulo="Skincare"
            contador={pasos.length ? `${hechos}/${pasos.length}` : null} onAbrir={() => ir("cuidado")}>
      {!pasos.length ? (
        <VacioChat texto="Aún no tienes rutina." pedido="Ármame una rutina de skincare de mañana y de noche para puntos negros, con productos que se vendan en Chile." ir={ir} />
      ) : (
        <>
          <small className="widget-sub">Rutina de {momento === "am" ? "mañana" : "noche"}</small>
          <div className="barra-progreso"><span style={{ width: `${(100 * hechos) / pasos.length}%` }} /></div>
          <ul className="check-mini">
            {pasos.map((p) => (
              <li key={p.id} className={p.hecho ? "hecha" : ""} onClick={() => marcar(p)}>
                <span className={`caja ${p.hecho ? "marcada" : ""}`} aria-hidden>{p.hecho && <Ico i={Check} size={12} />}</span>
                <span>{p.paso}</span>
              </li>
            ))}
          </ul>
          {h.por_vencer.length > 0 && (
            <small className="nota-estado serio" style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
              <Ico i={AlertTriangle} size={13} />{h.por_vencer[0].nombre} vence pronto
            </small>
          )}
          {error && <small className="error">{error}</small>}
        </>
      )}
    </Widget>
  );
}

function WidgetMedicacion({ h, ir }) {
  const hechas = h.dosis.filter((d) => d.estado !== "pendiente").length;
  const proxima = h.dosis.find((d) => d.estado === "pendiente");
  const [ocupado, setOcupado] = useState(false);
  async function tomar() {
    setOcupado(true);
    try {
      await api("/dosis", { method: "POST", body: { med_id: proxima.med_id, horario: proxima.horario, estado: "tomada" } });
      avisarCambio();
    } finally {
      setOcupado(false);
    }
  }
  return (
    <Widget icono={Pill} tono={proxima?.atrasada ? "serio" : "acento"} titulo="Medicación" contador={h.dosis.length ? `${hechas}/${h.dosis.length}` : null}
            onAbrir={() => ir("salud")}>
      {!h.dosis.length ? (
        <VacioChat texto="Sin remedios ni suplementos." pedido="Quiero cargar mis remedios y suplementos con sus horarios." ir={ir} />
      ) : proxima ? (
        <>
          <div className="toma">
            <small className={proxima.atrasada ? "nota-estado serio" : "widget-sub"}>{proxima.atrasada ? "Atrasada · " : "Próxima · "}{proxima.horario}</small>
            <b>{proxima.nombre}</b>
            <small className="widget-sub">{proxima.dosis}</small>
          </div>
          <button className="chico widget-pie" disabled={ocupado} onClick={tomar}><Ico i={Check} size={15} />Tomé</button>
        </>
      ) : (
        <p className="widget-vacio" style={{ display: "flex", gap: "0.35rem", alignItems: "center", color: "var(--bueno)" }}>
          <Ico i={Check} size={16} />Todo tomado hoy
        </p>
      )}
    </Widget>
  );
}

function WidgetComida({ h, ir }) {
  const n = h.nutricion;
  const comida = comidaDeAhora();
  const ideas = useApi(`/comida/sugerencias?comida=${comida}`);
  const idea = ideas.data?.ideas?.[0];
  const porComida = COMIDAS.map((c) => [c, n.items.filter((i) => i.comida === c).reduce((s, i) => s + i.kcal, 0)]).filter(([, k]) => k);
  return (
    <Widget icono={Utensils} titulo="Comidas de hoy" ancho onAbrir={() => ir("comida")}
            contador={n.restante.kcal !== null ? `quedan ${num(Math.max(0, n.restante.kcal))} kcal` : null}>
      {porComida.length ? (
        <div className="comidas-mini">
          {porComida.map(([c, k]) => <span key={c}>{c[0].toUpperCase() + c.slice(1)} <b>{num(k)}</b></span>)}
        </div>
      ) : (
        <p className="widget-vacio">Nada registrado hoy. Una foto del plato basta.</p>
      )}
      {idea && (
        <div className="idea-mini" role="button" tabIndex={0} onClick={() => ir("comida")} onKeyDown={(e) => e.key === "Enter" && ir("comida")}>
          <small>Idea para {comida === "once" ? "la once" : comida === "cena" ? "la cena" : `el ${comida}`} · {idea.minutos} min</small>
          <b style={{ fontSize: "0.92rem" }}>{idea.nombre}</b>
          <small>{num(idea.kcal)} kcal · {num(idea.proteina)} g proteína · ver más ideas</small>
        </div>
      )}
      <div className="botonera">
        <button className="secundario" onClick={() => ir("chat", { camara: true })}><Ico i={Camera} size={16} />Foto</button>
        <button className="secundario" onClick={() => ir("comida", { hoja: "favoritas" })}><Ico i={Star} size={16} />Favorita</button>
      </div>
    </Widget>
  );
}

function WidgetEntreno({ h, ir }) {
  const e = h.ultimo_entreno;
  const dias = e ? Math.round((new Date(h.fecha) - new Date(e.fecha)) / 864e5) : null;
  return (
    <Widget icono={Dumbbell} titulo="Entreno" onAbrir={() => ir("progreso")}>
      <div>
        <div className="widget-cifra">{h.peso ? `${num(h.peso.tendencia, 1)} kg` : "—"}</div>
        {h.kg_semana !== null && h.kg_semana !== undefined ? (
          <small className="widget-sub" style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
            <Ico i={h.kg_semana <= 0 ? TrendingDown : TrendingUp} size={13} />{h.kg_semana > 0 ? "+" : ""}{num(h.kg_semana, 2)} kg/sem
          </small>
        ) : <small className="widget-sub">peso de tendencia</small>}
      </div>
      <small className="widget-sub widget-pie">
        {e ? `${e.nombre} · ${dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`}` : "Sin entrenos registrados"}
      </small>
    </Widget>
  );
}

function WidgetFinanzas({ h, ir }) {
  const pago = h.pago_tarjeta;
  return (
    <Widget icono={Wallet} titulo="Finanzas" onAbrir={() => ir("finanzas")}>
      <div>
        <div className="widget-cifra">{clp(h.finanzas.total_clp)}</div>
        <small className="widget-sub">este mes</small>
      </div>
      <MiniBarras datos={h.gasto_diario} valor={(d) => d.monto} etiqueta={(d) => `${fechaCorta(d.fecha)}: ${clp(d.monto)}`} alto={30} />
      {pago && (
        <small className="nota-estado serio">Pagar {pago.moneda === "CLP" ? clp(pago.monto_facturado) : `US$${Number(pago.monto_facturado).toFixed(0)}`} · {fechaCorta(pago.fecha_pago)}</small>
      )}
    </Widget>
  );
}

function WidgetCitas({ h, ir }) {
  const c = h.citas[0];
  return (
    <Widget icono={Calendar} tono="aviso" titulo="Próxima cita" ancho contador={h.citas.length > 1 ? `+${h.citas.length - 1}` : null} onAbrir={() => ir("salud")}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <FechaBloque iso={c.inicio} />
        <span className="fila-txt">
          <b>{c.titulo}</b>
          <small className="suave">{fechaHora(c.inicio)}{c.lugar && ` · ${c.lugar}`}</small>
          {c.preparacion && <small className="nota-estado serio">Preparación: {c.preparacion}</small>}
        </span>
      </div>
    </Widget>
  );
}

function WidgetNovedades({ h, ir }) {
  const nov = useApi("/novedades");
  const nuevas = nov.data?.items.filter((x) => !x.leido).slice(0, 2) ?? [];
  return (
    <Widget icono={Newspaper} tono="neutro" titulo="Novedades para ti" ancho onAbrir={() => ir("novedades")}
            contador={h.novedades_sin_leer ? `${h.novedades_sin_leer} nuevas` : null}>
      {nuevas.length ? (
        <ul className="lista">
          {nuevas.map((x) => (
            <li key={x.id} className="fila clic" onClick={() => ir("novedades")}>
              <span className="fila-txt"><b style={{ fontSize: "0.9rem" }}>{x.titulo}</b><small className="suave">{x.tema} · {x.fuente}</small></span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="widget-vacio">Busco novedades de tus temas a las 8:00 y a las 18:00.</p>
      )}
    </Widget>
  );
}
