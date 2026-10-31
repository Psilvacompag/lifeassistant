import { useState } from "react";
import { CalendarCheck, ChevronDown, FileText, FlaskConical, HandCoins, Inbox, Receipt, ShieldCheck, Trash2 } from "lucide-react";
import { api, avisarCambio } from "../api.js";
import { Ico } from "../iconos.jsx";
import { Card, Estado, IconoFila, VacioChat, fechaCorta, num, useApi } from "../ui.jsx";

// tipo → [chip, ícono, nombre en plural para el vacío del filtro]
const TIPOS = {
  resultado_examen: ["Resultados", FlaskConical, "resultados de exámenes"],
  reembolso: ["Reembolsos", HandCoins, "reembolsos"],
  reserva: ["Reservas", CalendarCheck, "reservas"],
  boleta: ["Boletas", Receipt, "boletas"],
  garantia: ["Garantías", ShieldCheck, "garantías"],
  otro: ["Otros", FileText, "otros documentos"],
};

/** "fecha_examen" → "Fecha examen". */
const humano = (k) => {
  const t = k.replace(/_/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function Documentos({ ir }) {
  const [tipo, setTipo] = useState(null);
  const { data: docs, error, cargando } = useApi(`/documentos${tipo ? `?tipo=${tipo}` : ""}`);

  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>Del correo</h1>
        <p className="suave">Lo importante que llega a tu Gmail, ordenado y a mano.</p>
      </header>

      <div className="chips" role="group" aria-label="Filtrar por tipo">
        <button className={!tipo ? "chip-btn activa" : "chip-btn"} aria-pressed={!tipo} onClick={() => setTipo(null)}>Todos</button>
        {Object.entries(TIPOS).map(([k, [chip]]) => (
          <button key={k} className={tipo === k ? "chip-btn activa" : "chip-btn"} aria-pressed={tipo === k} onClick={() => setTipo(k)}>{chip}</button>
        ))}
      </div>

      <Estado cargando={cargando && !docs} error={!docs && error}>
        {docs && !docs.length && !tipo && (
          <VacioChat icono={Inbox} ir={ir} pedido="Busca en mi correo la boleta de "
                     texto="Aquí llegan solos los resultados de exámenes, reembolsos, reservas, boletas y garantías que detecto en tu Gmail. También puedes pedirme que busque uno." />
        )}
        {docs && !docs.length && tipo && (
          <Card><p className="suave chico-txt" style={{ margin: 0 }}>Todavía no hay {TIPOS[tipo][2]} aquí.</p></Card>
        )}
        {docs?.length > 0 && (
          <div className="lista-docs">
            {docs.map((d) => <TarjetaDoc key={d.id} d={d} />)}
          </div>
        )}
      </Estado>
    </div>
  );
}

function TarjetaDoc({ d }) {
  const [abierto, setAbierto] = useState(false);
  const [, icono] = TIPOS[d.tipo] ?? TIPOS.otro;
  const datos = Object.entries(d.datos ?? {}).filter(([, v]) => v !== null && v !== "");

  async function borrar() {
    if (!confirm(`¿Borrar "${d.titulo}"?`)) return;
    await api(`/documentos/${d.id}`, { method: "DELETE" });
    avisarCambio();
  }

  return (
    <Card className="doc">
      <button className="doc-cab" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
        <IconoFila icono={icono} tono={d.tipo === "resultado_examen" ? "aviso" : "acento"} />
        <span className="fila-txt">
          <b>{d.titulo}</b>
          <small className="suave">{[d.fecha && fechaCorta(d.fecha), d.remitente].filter(Boolean).join(" · ")}</small>
        </span>
        <Ico i={ChevronDown} size={17} className={`chevron ${abierto ? "girado" : ""}`} />
      </button>
      {d.resumen && <p className={`doc-resumen ${abierto ? "" : "corto"}`}>{d.resumen}</p>}
      {abierto && (
        <div className="doc-detalle">
          {datos.length > 0 && (
            <dl className="datos-doc">
              {datos.map(([k, v]) => (
                <div key={k}>
                  <dt>{humano(k)}</dt>
                  <dd>{typeof v === "number" ? num(v, 2) : String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
          <button className="enlace peligro chico-txt" onClick={borrar}><Ico i={Trash2} size={15} />Borrar</button>
        </div>
      )}
    </Card>
  );
}
