import { Check, ChevronLeft, ChevronRight, CreditCard, Mail, Plus } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import {
  Avatar, Badge, BarrasH, Campo, Card, Estado, Formulario, Hoja, IconoFila, MiniBarras, Resumen, Seccion, clp, fechaCorta, isoLocal,
  limpiar, useApi,
} from "../ui.jsx";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CATEGORIAS = ["supermercado", "comida", "delivery", "transporte", "salud", "cuidado personal", "suplementos",
  "deporte", "suscripciones", "hogar", "ropa", "tecnología", "entretenimiento", "viajes", "cuentas", "otros"];
const MEDIOS = { tarjeta_credito: "tarjeta de crédito", tarjeta_debito: "débito", efectivo: "efectivo", transferencia: "transferencia", otro: "otro" };

export default function Finanzas({ ir }) {
  const google = useApi("/google/estado");
  const hoy = new Date();
  const [mes, setMes] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const { data: f, error, cargando } = useApi(`/finanzas?anio=${mes.anio}&mes=${mes.mes}`);
  const [hoja, setHoja] = useState(null); // "nuevo" | {gasto}
  const esActual = mes.anio === hoy.getFullYear() && mes.mes === hoy.getMonth() + 1;

  function mover(d) {
    const m = new Date(mes.anio, mes.mes - 1 + d, 1);
    setMes({ anio: m.getFullYear(), mes: m.getMonth() + 1 });
  }

  // Gasto por día del mes (CLP) para el mini gráfico, y gastos agrupados por fecha para la lista.
  const diasMes = new Date(mes.anio, mes.mes, 0).getDate();
  const porDia = Array.from({ length: diasMes }, (_, i) => ({ dia: i + 1, monto: 0 }));
  const grupos = [];
  for (const g of f?.gastos ?? []) {
    if (g.moneda === "CLP") porDia[Number(String(g.fecha).slice(8, 10)) - 1].monto += Number(g.monto);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.fecha === g.fecha) ultimo.items.push(g);
    else grupos.push({ fecha: g.fecha, items: [g] });
  }
  const usd = (f?.otras_monedas ?? []).filter((g) => g.moneda === "USD").reduce((s, g) => s + Number(g.monto), 0);
  const diasConDatos = esActual ? new Date().getDate() : diasMes;

  return (
    <div className="pagina">
      <header className="pagina-cab fila-nav">
        <button className="icono" onClick={() => mover(-1)} aria-label="Mes anterior"><Ico i={ChevronLeft} size={20} /></button>
        <h1>{MESES[mes.mes - 1]} {mes.anio}</h1>
        <button className="icono" onClick={() => mover(1)} disabled={esActual} aria-label="Mes siguiente"><Ico i={ChevronRight} size={20} /></button>
      </header>

      {google.data && !google.data.conectado && (
        <Card className="aviso-card">
          <Ico i={Mail} size={20} />
          <div>
            <b>Cobros automáticos de BCI y Santander</b>
            <p className="suave chico-txt">Conecta tu Gmail y los cobros de tus tarjetas entran solos, con aviso al celular.</p>
            <button className="chico" onClick={() => ir("ajustes")}>Conectar Gmail</button>
          </div>
        </Card>
      )}

      <Estado cargando={cargando && !f} error={!f && error}>
        {f && (
          <>
            <Resumen>
              <span className="resumen-etiqueta">Gastado en {MESES[mes.mes - 1]}</span>
              <div className="resumen-cifra">{clp(f.total_clp)}</div>
              {usd > 0 && <small>+ US${usd.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} en dólares</small>}
              <div style={{ marginTop: "0.9rem" }}>
                <MiniBarras datos={porDia} valor={(d) => d.monto} etiqueta={(d) => `${d.dia}: ${clp(d.monto)}`} alto={48} />
              </div>
              <div className="resumen-pie">
                <div><small>Movimientos</small><b>{f.gastos.length}</b></div>
                <div><small>Promedio diario</small><b>{clp(f.total_clp / Math.max(1, diasConDatos))}</b></div>
                {google.data?.conectado && (
                  <div><small>Gmail</small><b>{google.data.error ? "con error" : "conectado"}</b></div>
                )}
              </div>
            </Resumen>

            <button className="secundario" onClick={() => setHoja("nuevo")}>
              <Ico i={Plus} size={18} /> Agregar gasto
            </button>

            {f.estados?.length > 0 && (
              <Seccion titulo="Tarjetas">
                <Card>
                  <ul className="lista">
                    {f.estados.map((s) => {
                      const monto = s.moneda === "CLP" ? clp(s.monto_facturado) : `US$${Number(s.monto_facturado).toFixed(2)}`;
                      const vencido = s.fecha_pago && s.fecha_pago < isoLocal();
                      return (
                        <li key={s.id} className="fila">
                          <IconoFila icono={CreditCard} tono={Number(s.monto_facturado) > 0 && !vencido ? "aviso" : "neutro"} />
                          <span className="fila-txt">
                            <b>{s.tarjeta} <small className="suave">· {s.moneda === "CLP" ? "nacional" : "internacional"}</small></b>
                            <small className="suave">
                              {s.movimientos} cargos{s.fecha_pago && ` · pagar hasta ${fechaCorta(s.fecha_pago)}`}
                            </small>
                          </span>
                          {Number(s.monto_facturado) <= 0 ? <Badge tono="bueno" icono={Check}>nada que pagar</Badge>
                            : <b className="monto">{monto}</b>}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </Seccion>
            )}

            {f.por_categoria.length > 0 && (
              <Seccion titulo="Por categoría">
                <Card>
                  <BarrasH datos={f.por_categoria} valor={(c) => c.monto} etiqueta={(c) => c.categoria} formato={clp} />
                </Card>
              </Seccion>
            )}

            <Seccion titulo={`Movimientos (${f.gastos.length})`}>
              {!f.gastos.length && <Card><p className="suave" style={{ margin: 0 }}>Sin gastos este mes.</p></Card>}
              {grupos.length > 0 && (
                <Card>
                  {grupos.map((gr) => (
                  <div key={gr.fecha} className="grupo-dia">
                  <div className="grupo-dia-cab">
                    <span>{fechaCorta(gr.fecha)}</span>
                    <span className="monto">
                      {clp(gr.items.filter((g) => g.moneda === "CLP").reduce((s, g) => s + Number(g.monto), 0))}
                    </span>
                  </div>
                  <ul className="lista">
                    {gr.items.map((g) => (
                      <li key={g.id} className="fila clic" onClick={() => setHoja({ gasto: g })}>
                        <Avatar texto={g.comercio} />
                        <span className="fila-txt">
                          <b>{g.comercio}</b>
                          <small className="suave">
                            {g.categoria}{g.tarjeta ? ` · ${g.tarjeta}` : ` · ${MEDIOS[g.medio]}`}{g.cuotas > 1 && ` · ${g.cuotas} cuotas`}
                          </small>
                        </span>
                        {g.estado === "por_confirmar" && <Badge tono="aviso">confirmar</Badge>}
                        <b className="monto">{g.moneda === "CLP" ? clp(g.monto) : `US$${Number(g.monto).toFixed(2)}`}</b>
                      </li>
                    ))}
                  </ul>
                  </div>
                  ))}
                </Card>
              )}
            </Seccion>
          </>
        )}
      </Estado>

      <Hoja titulo="Nuevo gasto" abierta={hoja === "nuevo"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          await api("/gastos", { method: "POST", body: limpiar(v, ["monto", "cuotas"]) });
          avisarCambio();
          setHoja(null);
        }}>
          <div className="grid-2">
            <Campo label="Monto" name="monto" type="number" min="1" step="1" required inputMode="numeric" />
            <Campo label="Fecha" name="fecha" type="date" defaultValue={isoLocal()} />
          </div>
          <Campo label="Dónde / qué" name="comercio" required placeholder="Feria, Uber, transferencia a Rado…" />
          <div className="grid-2">
            <Campo label="Categoría" name="categoria" type="select" defaultValue="otros">
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Campo>
            <Campo label="Medio" name="medio" type="select" defaultValue="efectivo">
              {Object.entries(MEDIOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Campo>
          </div>
          <Campo label="Notas" name="notas" />
        </Formulario>
      </Hoja>

      <Hoja titulo={hoja?.gasto?.comercio ?? ""} abierta={!!hoja?.gasto} onCerrar={() => setHoja(null)}>
        {hoja?.gasto && (
          <Formulario boton="Guardar" onEnviar={async (v) => {
            await api(`/gastos/${hoja.gasto.id}`, { method: "PATCH", body: { ...limpiar(v, ["monto"]), estado: "confirmado" } });
            avisarCambio();
            setHoja(null);
          }}>
            <div className="grid-2">
              <Campo label="Monto" name="monto" type="number" min="1" defaultValue={hoja.gasto.monto} />
              <Campo label="Fecha" name="fecha" type="date" defaultValue={hoja.gasto.fecha} />
            </div>
            <Campo label="Categoría" name="categoria" type="select" defaultValue={hoja.gasto.categoria}>
              {[...new Set([hoja.gasto.categoria, ...CATEGORIAS])].map((c) => <option key={c} value={c}>{c}</option>)}
            </Campo>
            <Campo label="Notas" name="notas" defaultValue={hoja.gasto.notas ?? ""} />
            <p className="suave chico-txt">
              Origen: {hoja.gasto.origen === "gmail" ? "correo del banco" : hoja.gasto.origen}{hoja.gasto.tarjeta && ` · ${hoja.gasto.tarjeta}`}
              {hoja.gasto.origen === "gmail" && " · si cambias la categoría, la recuerdo para este comercio"}
            </p>
            <button type="button" className="secundario peligro" onClick={async () => {
              if (!confirm("¿Borrar este gasto?")) return;
              await api(`/gastos/${hoja.gasto.id}`, { method: "DELETE" });
              avisarCambio();
              setHoja(null);
            }}>Borrar gasto</button>
          </Formulario>
        )}
      </Hoja>
    </div>
  );
}
