import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Check, ChevronDown, Package, PackageCheck, PackageX, Trash2 } from "lucide-react";
import { api, avisarCambio } from "../api.js";
import { Ico } from "../iconos.jsx";
import { Badge, Card, Estado, IconoFila, Seccion, VacioChat, dinero, fechaCorta, fechaHora, useApi } from "../ui.jsx";

export const ESTADO_PEDIDO = {
  comprado: "Comprado", preparando: "Preparando", en_camino: "En camino", en_reparto: "En reparto",
  entregado: "Entregado", cancelado: "Cancelado", problema: "Con problema",
};
// Progreso compacto: preparando cuenta como recién comprado.
const PASOS = ["Comprado", "En camino", "En reparto", "Entregado"];
const PASO = { comprado: 0, preparando: 0, en_camino: 1, en_reparto: 2, entregado: 3 };

export default function Pedidos({ ir }) {
  const { data: d, error, cargando } = useApi("/pedidos");
  const vacio = d && !d.activos.length && !d.recientes.length;
  async function noLlego(p) {
    await api(`/pedidos/${p.id}`, { method: "PATCH", body: { estado: "en_camino" } });
    avisarCambio();
  }

  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>Pedidos</h1>
        <p className="suave">Tus compras en camino, a partir de los correos de la tienda y del courier.</p>
      </header>

      <Estado cargando={cargando && !d} error={!d && error}>
        {vacio && (
          <VacioChat icono={Package} ir={ir} pedido="¿Dónde viene mi pedido?"
                     texto="Cuando compres en línea, los pedidos aparecen solos aquí: leo los correos de la tienda y del courier y te aviso si se atrasan." />
        )}
        {d && !vacio && (
          <>
            <Seccion titulo={`En camino${d.activos.length ? ` (${d.activos.length})` : ""}`}>
              {d.activos.length ? (
                <div className="lista-pedidos">
                  {d.activos.map((p) => <TarjetaPedido key={p.id} p={p} />)}
                </div>
              ) : (
                <Card><p className="suave chico-txt" style={{ margin: 0 }}>No tienes pedidos en camino.</p></Card>
              )}
            </Seccion>

            {d.recientes.length > 0 && (
              <Seccion titulo="Recientes">
                <Card>
                  <ul className="lista">
                    {d.recientes.map((p) => (
                      <li key={p.id} className="fila hecha">
                        <IconoFila icono={p.estado === "cancelado" ? PackageX : PackageCheck} tono="neutro" />
                        <span className="fila-txt">
                          <b>{p.descripcion}</b>
                          <small className="suave">
                            {p.tienda} · {ESTADO_PEDIDO[p.estado] ?? p.estado}
                            {p.eventos?.[0] && ` ${fechaCorta(p.eventos[0].fecha)}`}
                          </small>
                        </span>
                        {p.monto !== null && <span className="monto suave chico-txt">{dinero(p.monto, p.moneda)}</span>}
                        {p.estado === "entregado" && (
                          <button className="enlace chico-txt" onClick={() => noLlego(p)} aria-label={`No ha llegado: ${p.descripcion}`}>
                            No llegó
                          </button>
                        )}
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

function TarjetaPedido({ p }) {
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const fuera = p.estado === "cancelado" || p.estado === "problema"; // sin progreso: va como estado

  async function entregado() {
    setOcupado(true);
    setError("");
    try {
      await api(`/pedidos/${p.id}`, { method: "PATCH", body: { estado: "entregado" } });
      avisarCambio();
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }
  async function borrar() {
    if (!confirm(`¿Quitar el pedido de ${p.tienda}?`)) return;
    await api(`/pedidos/${p.id}`, { method: "DELETE" });
    avisarCambio();
  }

  return (
    <Card className="pedido">
      <div className="pedido-cab">
        <IconoFila icono={Package} tono={p.estado === "problema" ? "serio" : p.atrasado ? "aviso" : "acento"} />
        <span className="fila-txt">
          <b>{p.descripcion}</b>
          <small className="suave">{p.tienda}{p.numero && ` · N.° ${p.numero}`}</small>
        </span>
        {p.monto !== null && <b className="monto">{dinero(p.monto, p.moneda)}</b>}
      </div>

      {fuera ? (
        <div><Badge tono={p.estado === "problema" ? "serio" : "neutro"} icono={p.estado === "problema" ? AlertTriangle : PackageX}>{ESTADO_PEDIDO[p.estado]}</Badge></div>
      ) : (
        <PasosPedido estado={p.estado} />
      )}

      <div className="pedido-meta">
        {p.entrega_estimada && <span>Llega aprox. <b>{fechaCorta(p.entrega_estimada)}</b></span>}
        {p.courier && <span className="suave">{p.courier}{p.tracking && ` · ${p.tracking}`}</span>}
        {p.atrasado && <Badge tono="aviso" icono={AlertTriangle}>Atrasado</Badge>}
      </div>

      <div className="pedido-acciones">
        {p.url_seguimiento && (
          <a className="enlace-btn" href={p.url_seguimiento} target="_blank" rel="noopener noreferrer">
            Seguimiento<Ico i={ArrowUpRight} size={15} />
          </a>
        )}
        {p.eventos?.length > 0 && (
          <button className="enlace ver" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
            Historial ({p.eventos.length})<Ico i={ChevronDown} size={15} className={abierto ? "girado" : ""} />
          </button>
        )}
        {p.estado !== "cancelado" && (
          <button className="secundario chico empujar" disabled={ocupado} onClick={entregado}>
            <Ico i={Check} size={15} />Marcar entregado
          </button>
        )}
      </div>
      {error && <small className="error">{error}</small>}

      {abierto && (
        <div className="pedido-detalle">
          <ol className="eventos">
            {p.eventos.map((e, i) => (
              <li key={i} className={i === 0 ? "actual" : ""}>
                <span className="eventos-punto" aria-hidden />
                <span className="fila-txt">
                  <b>{ESTADO_PEDIDO[e.estado] ?? e.estado}</b>
                  {e.detalle && <small>{e.detalle}</small>}
                  <small className="suave">{fechaHora(e.fecha)}</small>
                </span>
              </li>
            ))}
          </ol>
          <button className="enlace peligro chico-txt" onClick={borrar}><Ico i={Trash2} size={15} />Quitar pedido</button>
        </div>
      )}
    </Card>
  );
}

/** Cuatro pasos con línea: hechos en acento, el actual destacado, los que faltan en gris. */
function PasosPedido({ estado }) {
  const actual = PASO[estado] ?? 0;
  return (
    <ol className="pasos-pedido" aria-label={`Estado: ${ESTADO_PEDIDO[estado] ?? estado}`}>
      {PASOS.map((t, i) => (
        <li key={t} className={i < actual ? "hecho" : i === actual ? "actual" : ""}>
          <span className="pasos-punto" aria-hidden>{i < actual && <Ico i={Check} size={10} />}</span>
          <small>{t}</small>
        </li>
      ))}
    </ol>
  );
}
