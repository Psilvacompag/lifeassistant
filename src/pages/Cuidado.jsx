import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import { DosisLista, RutinaLista } from "../componentes.jsx";
import { Badge, Campo, Card, Estado, Formulario, Hoja, fechaCorta, limpiar, useApi } from "../ui.jsx";

const AREAS = { cara: "Cara", pelo: "Pelo", barba: "Barba", cuerpo: "Cuerpo" };
const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

export default function Cuidado({ ir }) {
  const { data: c, error, cargando } = useApi("/cuidado");
  const [hoja, setHoja] = useState(null); // "producto" | "paso" | {producto}
  const [area, setArea] = useState("cara");

  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Cuidado personal</h1></header>
      <Estado cargando={cargando && !c} error={!c && error}>
        {c && (
          <>
            <Card titulo="Hoy">
              {c.dosis_hoy.length > 0 && (<><h3>Tratamientos</h3><DosisLista dosis={c.dosis_hoy} /></>)}
              <h3>Mañana</h3>
              <RutinaLista pasos={c.hoy.am} vacio="Sin pasos AM para hoy." />
              <h3>Noche</h3>
              <RutinaLista pasos={c.hoy.pm} vacio="Sin pasos PM para hoy." />
              {!c.dosis_hoy.length && (
                <p className="suave chico-txt">
                  ¿Minoxidil? Agrégalo en <button className="enlace" onClick={() => ir("salud")}>Salud</button> como tipo
                  "cuidado" y aparece aquí con sus recordatorios.
                </p>
              )}
            </Card>

            {c.por_vencer.length > 0 && (
              <Card titulo="Por vencer">
                <ul className="lista">
                  {c.por_vencer.map((p) => (
                    <li key={p.id} className="fila">
                      <span className="fila-txt"><b>{p.nombre}</b><small className="suave">abierto {fechaCorta(p.abierto_el)}</small></span>
                      <Badge tono="aviso">vence {fechaCorta(p.vence)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="tabs" role="tablist">
              {Object.entries(AREAS).map(([k, v]) => (
                <button key={k} role="tab" aria-selected={area === k} className={area === k ? "activa" : ""} onClick={() => setArea(k)}>{v}</button>
              ))}
            </div>

            <Card titulo={`Productos · ${AREAS[area]}`} accion={<button className="chico" onClick={() => setHoja("producto")}>+ Producto</button>}>
              {!c.productos.some((p) => p.area === area) && (
                <p className="suave">Agrega lo que usas, o mándale al chat una foto del envase y él lo carga con sus ingredientes.</p>
              )}
              <ul className="lista">
                {c.productos.filter((p) => p.area === area).map((p) => (
                  <li key={p.id} className={`fila clic ${p.en_uso ? "" : "hecha"}`} onClick={() => setHoja({ producto: p })}>
                    <span className="fila-txt">
                      <b>{p.nombre}</b>
                      <small className="suave">{[p.marca, p.activos].filter(Boolean).join(" · ")}</small>
                    </span>
                    {!p.en_uso && <Badge>no lo uso</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card titulo={`Rutina · ${AREAS[area]}`} accion={<button className="chico" onClick={() => setHoja("paso")}>+ Paso</button>}>
              {["am", "pm"].map((mom) => {
                const pasos = c.pasos.filter((p) => p.area === area && p.momento === mom);
                if (!pasos.length) return null;
                return (
                  <div key={mom}>
                    <h3>{mom === "am" ? "Mañana" : "Noche"}</h3>
                    <ul className="lista">
                      {pasos.map((p) => (
                        <li key={p.id} className="fila">
                          <span className="hora">{p.orden}</span>
                          <span className="fila-txt">
                            <b>{p.paso}</b>
                            <small className="suave">{[p.producto, p.dias.length === 7 ? "todos los días" : p.dias.join(" ")].filter(Boolean).join(" · ")}</small>
                          </span>
                          <button className="icono chico" aria-label="Quitar paso" onClick={async () => {
                            await api(`/pasos/${p.id}`, { method: "DELETE" });
                            avisarCambio();
                          }}>✕</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {!c.pasos.some((p) => p.area === area) && <p className="suave">Sin rutina. Pídele al chat que te la arme con tus productos.</p>}
            </Card>
          </>
        )}
      </Estado>

      <Hoja titulo={`Nuevo producto · ${AREAS[area]}`} abierta={hoja === "producto"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          await api("/productos", { method: "POST", body: { ...limpiar(v, ["pao_meses"]), area } });
          avisarCambio();
          setHoja(null);
        }}>
          <Campo label="Nombre" name="nombre" required placeholder="Sea salt spray" />
          <Campo label="Marca" name="marca" />
          <Campo label="Ingredientes activos" name="activos" placeholder="ácido salicílico 2 %, niacinamida" />
          <div className="grid-2">
            <Campo label="Abierto el" name="abierto_el" type="date" />
            <Campo label="Dura abierto (meses)" name="pao_meses" type="number" min="1" max="60" ayuda="El símbolo del frasco abierto: 6M, 12M…" />
          </div>
          <Campo label="Notas" name="notas" type="textarea" placeholder="Cómo lo uso, qué tal me funciona" />
        </Formulario>
      </Hoja>

      <Hoja titulo={hoja?.producto?.nombre ?? ""} abierta={!!hoja?.producto} onCerrar={() => setHoja(null)}>
        {hoja?.producto && (
          <Formulario onEnviar={async (v) => {
            await api(`/productos/${hoja.producto.id}`, { method: "PATCH",
              body: { ...limpiar(v, ["pao_meses"]), en_uso: v.en_uso === "on" } });
            avisarCambio();
            setHoja(null);
          }}>
            <Campo label="Activos" name="activos" defaultValue={hoja.producto.activos ?? ""} />
            <div className="grid-2">
              <Campo label="Abierto el" name="abierto_el" type="date" defaultValue={hoja.producto.abierto_el ?? ""} />
              <Campo label="Dura abierto (meses)" name="pao_meses" type="number" defaultValue={hoja.producto.pao_meses ?? ""} />
            </div>
            <Campo label="Notas" name="notas" type="textarea" defaultValue={hoja.producto.notas ?? ""} />
            <label className="check-linea"><input type="checkbox" name="en_uso" defaultChecked={hoja.producto.en_uso} /> Lo estoy usando</label>
            <button type="button" className="secundario peligro" onClick={async () => {
              if (!confirm(`¿Borrar ${hoja.producto.nombre}?`)) return;
              await api(`/productos/${hoja.producto.id}`, { method: "DELETE" });
              avisarCambio();
              setHoja(null);
            }}>Borrar producto</button>
          </Formulario>
        )}
      </Hoja>

      <Hoja titulo={`Nuevo paso · ${AREAS[area]}`} abierta={hoja === "paso"} onCerrar={() => setHoja(null)}>
        <Formulario onEnviar={async (v) => {
          const dias = DIAS.filter((d) => v[`dia_${d}`]);
          await api("/pasos", { method: "POST", body: {
            area, momento: v.momento, paso: v.paso, orden: Number(v.orden) || 1,
            producto_id: v.producto_id ? Number(v.producto_id) : null, dias: dias.length ? dias : DIAS } });
          avisarCambio();
          setHoja(null);
        }}>
          <div className="grid-2">
            <Campo label="Momento" name="momento" type="select" defaultValue="pm">
              <option value="am">mañana</option><option value="pm">noche</option>
            </Campo>
            <Campo label="Orden" name="orden" type="number" min="1" defaultValue="1" />
          </div>
          <Campo label="Paso" name="paso" required placeholder="Limpiador / BHA / Hidratante" />
          <Campo label="Producto" name="producto_id" type="select" defaultValue="">
            <option value="">—</option>
            {c?.productos.filter((p) => p.area === area && p.en_uso).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Campo>
          <fieldset className="dias">
            <legend>Días (ninguno = todos)</legend>
            {DIAS.map((d) => <label key={d}><input type="checkbox" name={`dia_${d}`} /> {d}</label>)}
          </fieldset>
        </Formulario>
      </Hoja>
    </div>
  );
}
