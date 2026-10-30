import { Apple, Camera, Coffee, CookingPot, Croissant, PenLine, Soup, Star, Trash2 } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import {
  Anillo, Badge, Campo, Card, Columnas, Estado, Formulario, Hoja, IconoFila, Resumen, diaSemana, fechaCorta, isoLocal, limpiar,
  num, useApi,
} from "../ui.jsx";

const COMIDAS = ["desayuno", "almuerzo", "once", "cena", "snack"];
const ICONO_COMIDA = { desayuno: Coffee, almuerzo: CookingPot, once: Croissant, cena: Soup, snack: Apple };
const comidaSugerida = () => {
  const h = new Date().getHours();
  return h < 11 ? "desayuno" : h < 16 ? "almuerzo" : h < 19 ? "once" : "cena";
};

export default function Comida({ ir }) {
  const [fecha, setFecha] = useState(isoLocal());
  const { data: d, error, cargando } = useApi(`/comida?fecha=${fecha}`);
  const favs = useApi("/comida/favoritas");
  const hoyData = useApi(`/comida?fecha=${isoLocal()}`);
  const semanaHoy = hoyData.data?.semana;
  const semanaMetas = hoyData.data?.metas;
  const dias = Array.from({ length: 7 }, (_, i) => {
    const f = new Date();
    f.setDate(f.getDate() - 6 + i);
    return isoLocal(f);
  });
  const [hoja, setHoja] = useState(null); // "manual" | "favoritas"
  const esHoy = fecha === isoLocal();

  async function borrar(id) {
    await api(`/comida/${id}`, { method: "DELETE" });
    avisarCambio();
  }

  return (
    <div className="pagina">
      <header className="pagina-cab">
        <p className="suave chico-txt">{esHoy ? "Hoy" : fechaCorta(fecha)}</p>
        <h1>Comida</h1>
      </header>

      <div className="tira-dias" role="tablist" aria-label="Día">
        {dias.map((f) => {
          const dato = semanaHoy?.find((x) => String(x.fecha).slice(0, 10) === f);
          const meta = semanaMetas?.kcal;
          const punto = !dato?.kcal ? "" : meta && dato.kcal >= meta * 0.9 && dato.kcal <= meta * 1.1 ? "ok" : "con";
          return (
            <button key={f} role="tab" aria-selected={f === fecha} className={f === fecha ? "activa" : ""} onClick={() => setFecha(f)}>
              <small>{diaSemana(f)}</small>
              <b>{Number(f.slice(8))}</b>
              <i className={punto} />
            </button>
          );
        })}
      </div>

      <Estado cargando={cargando && !d} error={!d && error}>
        {d && (
          <>
            <Resumen>
              <div className="resumen-fila">
                <Anillo valor={d.totales.kcal} meta={d.metas.kcal} tamano={112} grosor={10}>
                  <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                    <b style={{ fontSize: "1.35rem" }}>{num(d.totales.kcal)}</b>
                    <small>{d.metas.kcal ? `de ${num(d.metas.kcal)}` : "kcal"}</small>
                  </span>
                </Anillo>
                <div className="macros">
                  {[["Proteína", "proteina"], ["Carbos", "carbos"], ["Grasa", "grasa"]].map(([nombre, k]) => {
                    const meta = d.metas[k];
                    const v = d.totales[k];
                    return (
                      <div key={k} className="macro">
                        <div className="macro-txt"><span>{nombre}</span><b>{num(v)}{meta ? <small> / {num(meta)} g</small> : " g"}</b></div>
                        <div className="macro-pista"><span style={{ width: `${meta ? Math.min(100, (100 * v) / meta) : 0}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {!d.metas.kcal && (
                <div className="resumen-pie">
                  <button className="secundario chico" onClick={() => ir("ajustes")}>Definir mis metas</button>
                </div>
              )}
            </Resumen>

            <div className="atajos">
              <button className="atajo" onClick={() => ir("chat", { camara: true })}><Ico i={Camera} size={20} />Foto</button>
              <button className="atajo" onClick={() => setHoja("favoritas")}><Ico i={Star} size={20} />Favoritas</button>
              <button className="atajo" onClick={() => setHoja("manual")}><Ico i={PenLine} size={20} />Manual</button>
            </div>

            {COMIDAS.map((c) => {
              const items = d.items.filter((i) => i.comida === c);
              if (!items.length) return null;
              const kcal = items.reduce((s, i) => s + i.kcal, 0);
              return (
                <Card key={c}>
                  <div className="card-cab">
                    <span style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <IconoFila icono={ICONO_COMIDA[c]} tono="acento" />
                      <h2>{`${c[0].toUpperCase()}${c.slice(1)}`}</h2>
                    </span>
                    <span className="monto">{num(kcal)} <small className="suave">kcal</small></span>
                  </div>
                  <ul className="lista">
                    {items.map((i) => (
                      <li key={i.id} className="fila">
                        <span className="fila-txt">
                          <b>{i.descripcion}</b>
                          <small className="suave">
                            {num(i.kcal)} kcal · P {num(i.proteina)} · C {num(i.carbos)} · G {num(i.grasa)}
                          </small>
                        </span>
                        {i.estimado && <Badge icono={Camera}>estimado</Badge>}
                        <button className="icono chico" onClick={() => borrar(i.id)} aria-label="Borrar"><Ico i={Trash2} size={16} /></button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
            {!d.items.length && <p className="suave centro-txt">Nada registrado {esHoy ? "hoy" : "este día"}.</p>}

            <Card titulo="Calorías · últimos 7 días">
              <Columnas datos={d.semana} valor={(x) => x.kcal} meta={d.metas.kcal}
                        etiqueta={(x) => diaSemana(x.fecha)} formato={(v) => `${num(v)} kcal`} />
            </Card>
          </>
        )}
      </Estado>

      <Hoja titulo="Registrar a mano" abierta={hoja === "manual"} onCerrar={() => setHoja(null)}>
        <Formulario
          onEnviar={async (v) => {
            await api("/comida", { method: "POST", body: { ...limpiar(v, ["kcal", "proteina", "carbos", "grasa"]), fecha } });
            if (v.favorita) {
              await api("/comida/favoritas", { method: "POST", body: { nombre: v.descripcion.slice(0, 80),
                ...limpiar(v, ["kcal", "proteina", "carbos", "grasa"]) } });
            }
            avisarCambio();
            setHoja(null);
          }}
        >
          <Campo label="Comida" name="comida" type="select" defaultValue={comidaSugerida()}>
            {COMIDAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Campo>
          <Campo label="Qué comiste" name="descripcion" required placeholder="2 huevos y una marraqueta con palta" />
          <div className="grid-2">
            <Campo label="Calorías" name="kcal" type="number" min="0" required inputMode="numeric" />
            <Campo label="Proteína (g)" name="proteina" type="number" min="0" step="0.1" inputMode="decimal" />
            <Campo label="Carbos (g)" name="carbos" type="number" min="0" step="0.1" inputMode="decimal" />
            <Campo label="Grasa (g)" name="grasa" type="number" min="0" step="0.1" inputMode="decimal" />
          </div>
          <label className="check-linea"><input type="checkbox" name="favorita" /> Guardar también como favorita</label>
          <p className="suave chico-txt">¿No sabes los números? Escríbelo o mándale una foto al chat y él calcula.</p>
        </Formulario>
      </Hoja>

      <Hoja titulo="Favoritas" abierta={hoja === "favoritas"} onCerrar={() => setHoja(null)}>
        <Estado cargando={favs.cargando} error={favs.error}
                vacio={!favs.data?.length && "Aún no tienes favoritas. Guárdalas al registrar a mano o pídeselo al chat."}>
          <ul className="lista">
            {favs.data?.map((f) => (
              <li key={f.id} className="fila">
                <span className="fila-txt">
                  <b>{f.nombre}</b>
                  <small className="suave">{num(f.kcal)} kcal · P {num(f.proteina)} g</small>
                </span>
                <button className="chico" onClick={async () => {
                  await api(`/comida/favoritas/${f.id}/registrar`, { method: "POST", body: { comida: comidaSugerida(), fecha } });
                  avisarCambio();
                  setHoja(null);
                }}>Agregar</button>
                <button className="icono chico" aria-label="Borrar favorita" onClick={async () => {
                  await api(`/comida/favoritas/${f.id}`, { method: "DELETE" });
                  favs.recargar();
                }}><Ico i={Trash2} size={16} /></button>
              </li>
            ))}
          </ul>
        </Estado>
      </Hoja>
    </div>
  );
}
