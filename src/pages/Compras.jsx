import { useState } from "react";
import {
  ArrowUpRight, Check, ChevronDown, House, Pill, Plus, Shirt, ShoppingBag, ShoppingBasket, Smartphone, Sparkles, Trash2,
} from "lucide-react";
import { api, avisarCambio } from "../api.js";
import { Ico } from "../iconos.jsx";
import { Card, Estado, Seccion, VacioChat, dinero, useApi } from "../ui.jsx";

// categoría → [título, ícono]; en este orden se muestran los grupos.
export const CATEGORIAS = {
  supermercado: ["Supermercado", ShoppingBasket],
  farmacia: ["Farmacia", Pill],
  cuidado: ["Cuidado personal", Sparkles],
  hogar: ["Hogar", House],
  tecnologia: ["Tecnología", Smartphone],
  ropa: ["Ropa", Shirt],
  otro: ["Otros", ShoppingBag],
};

export default function Compras({ ir }) {
  const { data: d, error, cargando } = useApi("/compras");
  const [verComprados, setVerComprados] = useState(false);
  const vacio = d && !d.pendientes.length && !d.comprados.length;
  const grupos = d ? Object.keys(CATEGORIAS).map((k) => [k, d.pendientes.filter((x) => x.categoria === k)]).filter(([, xs]) => xs.length) : [];

  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>Compras</h1>
        <p className="suave">Lo que tienes que comprar. Lo anotas tú o el chat cuando te recomienda algo.</p>
      </header>

      <Agregar />

      <Estado cargando={cargando && !d} error={!d && error}>
        {vacio && (
          <VacioChat icono={ShoppingBag} ir={ir} pedido="Anota en mi lista de compras: "
                     texto="Tu lista está vacía. Escribe arriba lo que necesitas, o díselo al chat: también anota aquí los productos que te recomienda." />
        )}
        {grupos.map(([k, xs]) => (
          <Seccion key={k} titulo={`${CATEGORIAS[k][0]} (${xs.length})`}>
            <Card>
              <ul className="lista">
                {xs.map((x) => <FilaCompra key={x.id} x={x} />)}
              </ul>
            </Card>
          </Seccion>
        ))}
        {d?.pendientes.length > 0 && (
          <button className="secundario chico" style={{ alignSelf: "flex-start" }}
                  onClick={() => ir("chat", { texto: "Busca precios de lo que tengo pendiente en la lista de compras" })}>
            <Ico i={Sparkles} size={15} />Buscar precios con el chat
          </button>
        )}
        {d?.comprados.length > 0 && (
          <Seccion titulo="Comprado" accion={
            <button className="enlace ver" onClick={() => setVerComprados(!verComprados)} aria-expanded={verComprados}>
              {verComprados ? "Ocultar" : `Ver (${d.comprados.length})`}<Ico i={ChevronDown} size={15} className={verComprados ? "girado" : ""} />
            </button>}>
            {verComprados && (
              <Card>
                <ul className="lista">
                  {d.comprados.map((x) => <FilaCompra key={x.id} x={x} />)}
                </ul>
              </Card>
            )}
          </Seccion>
        )}
      </Estado>
    </div>
  );
}

function Agregar() {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("supermercado");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  async function enviar(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setOcupado(true);
    setError("");
    try {
      await api("/compras", { method: "POST", body: { nombre: nombre.trim(), categoria } });
      setNombre("");
      avisarCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <Card>
      <form className="agregar-compra" onSubmit={enviar}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Agregar algo, ej. 2 kg de pechuga"
               aria-label="Qué necesitas comprar" maxLength={200} />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
          {Object.entries(CATEGORIAS).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <button type="submit" disabled={ocupado || !nombre.trim()}><Ico i={Plus} size={16} />Agregar</button>
      </form>
      {error && <small className="error">{error}</small>}
    </Card>
  );
}

function FilaCompra({ x }) {
  const [ocupado, setOcupado] = useState(false);
  async function cambiar(cuerpo, metodo = "PATCH") {
    setOcupado(true);
    try {
      await api(`/compras/${x.id}`, { method: metodo, body: cuerpo });
      avisarCambio();
    } finally {
      setOcupado(false);
    }
  }
  const borrar = () => confirm(`¿Quitar "${x.nombre}" de la lista?`) && cambiar(undefined, "DELETE");
  const sub = [x.cantidad, x.detalle].filter(Boolean).join(" · ");

  return (
    <li className={`fila compra ${x.comprado ? "hecha" : ""}`}>
      <button className="compra-caja" disabled={ocupado} onClick={() => cambiar({ comprado: !x.comprado })}
              aria-label={x.comprado ? `Marcar como no comprado: ${x.nombre}` : `Marcar como comprado: ${x.nombre}`}
              aria-pressed={x.comprado}>
        <span className={`caja ${x.comprado ? "marcada" : ""}`} aria-hidden>{x.comprado && <Ico i={Check} size={14} />}</span>
      </button>
      <span className="fila-txt">
        <b>{x.nombre}</b>
        {sub && <small className="suave">{sub}</small>}
        {x.para && <small className="compra-para">Para: {x.para}</small>}
        {x.precio !== null && !x.comprado && (
          <small>
            {x.url ? (
              <a href={x.url} target="_blank" rel="noopener noreferrer" className="enlace-precio">
                {dinero(x.precio)}{x.tienda && ` en ${x.tienda}`}<Ico i={ArrowUpRight} size={13} />
              </a>
            ) : <>{dinero(x.precio)}{x.tienda && ` en ${x.tienda}`}</>}
          </small>
        )}
      </span>
      <button className="icono chico" disabled={ocupado} onClick={borrar} aria-label={`Quitar ${x.nombre}`}>
        <Ico i={Trash2} size={16} />
      </button>
    </li>
  );
}
