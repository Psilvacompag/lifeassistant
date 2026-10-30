import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import { Badge, BarrasH, Campo, Card, Estado, Formulario, Hoja, clp, fechaCorta, fechaHora, isoLocal, limpiar, useApi } from "../ui.jsx";

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

  return (
    <div className="pagina">
      <header className="pagina-cab fila-nav">
        <button className="icono" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
        <h1>{MESES[mes.mes - 1]} {mes.anio}</h1>
        <button className="icono" onClick={() => mover(1)} disabled={esActual} aria-label="Mes siguiente">›</button>
      </header>

      {google.data && !google.data.conectado && (
        <Card className="aviso-card">
          <b>📧 Cobros automáticos de BCI y Santander</b>
          <p className="suave chico-txt">Conecta tu Gmail y los cobros de tus tarjetas entran solos, con aviso al celular.</p>
          <button className="chico" onClick={() => ir("ajustes")}>Conectar Gmail</button>
        </Card>
      )}
      {google.data?.conectado && (
        <p className="suave chico-txt">
          📧 Gmail {google.data.error ? <span className="error">con error: {google.data.error}</span> : "conectado"} · revisado{" "}
          {google.data.ultimo_sync ? fechaHora(google.data.ultimo_sync) : "aún no"}
        </p>
      )}

      <Estado cargando={cargando && !f} error={!f && error}>
        {f && (
          <>
            <div className="tiles">
              <div className="tile">
                <small className="suave">Total del mes</small>
                <b className="grande">{clp(f.total_clp)}</b>
                {f.por_confirmar > 0 && <Badge tono="aviso">{f.por_confirmar} por confirmar</Badge>}
              </div>
              <button className="tile accion" onClick={() => setHoja("nuevo")}>
                <b>+ Gasto</b><small className="suave">efectivo, transferencia…</small>
              </button>
            </div>

            {f.estados?.length > 0 && (
              <Card titulo="Tarjetas">
                <ul className="lista">
                  {f.estados.map((s) => {
                    const monto = s.moneda === "CLP" ? clp(s.monto_facturado) : `US$${Number(s.monto_facturado).toFixed(2)}`;
                    const vencido = s.fecha_pago && s.fecha_pago < isoLocal();
                    return (
                      <li key={s.id} className="fila">
                        <span className="fila-txt">
                          <b>{s.tarjeta}</b>
                          <small className="suave">
                            Estado al {fechaCorta(s.periodo_hasta)} · {s.movimientos} cargos
                            {s.fecha_pago && ` · pagar hasta ${fechaCorta(s.fecha_pago)}`}
                          </small>
                        </span>
                        {Number(s.monto_facturado) <= 0 ? <Badge tono="bueno">✓ nada que pagar</Badge>
                          : vencido ? <Badge>{monto} · vencido</Badge> : <Badge tono="aviso">{monto}</Badge>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {f.por_categoria.length > 0 && (
              <Card titulo="Por categoría">
                <BarrasH datos={f.por_categoria} valor={(c) => c.monto} etiqueta={(c) => c.categoria} formato={clp} />
              </Card>
            )}

            <Card titulo={`Gastos (${f.gastos.length})`}>
              {!f.gastos.length && <p className="suave">Sin gastos este mes.</p>}
              <ul className="lista">
                {f.gastos.map((g) => (
                  <li key={g.id} className="fila clic" onClick={() => setHoja({ gasto: g })}>
                    <span className="fila-txt">
                      <b>{g.comercio}</b>
                      <small className="suave">{fechaCorta(g.fecha)} · {g.categoria} · {MEDIOS[g.medio]}{g.cuotas > 1 && ` · ${g.cuotas} cuotas`}</small>
                    </span>
                    {g.estado === "por_confirmar" && <Badge tono="aviso">confirmar</Badge>}
                    <b className="monto">{g.moneda === "CLP" ? clp(g.monto) : `${g.moneda} ${g.monto}`}</b>
                  </li>
                ))}
              </ul>
            </Card>
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
