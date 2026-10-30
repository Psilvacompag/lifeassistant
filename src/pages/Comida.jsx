import { useState } from "react";
import { api, avisarCambio } from "../api.js";
import {
  Badge, Campo, Card, Columnas, Estado, Formulario, Hoja, Progreso, diaSemana, fechaCorta, isoLocal, limpiar, num, useApi,
} from "../ui.jsx";

const COMIDAS = ["desayuno", "almuerzo", "once", "cena", "snack"];
const comidaSugerida = () => {
  const h = new Date().getHours();
  return h < 11 ? "desayuno" : h < 16 ? "almuerzo" : h < 19 ? "once" : "cena";
};

export default function Comida({ ir }) {
  const [fecha, setFecha] = useState(isoLocal());
  const { data: d, error, cargando } = useApi(`/comida?fecha=${fecha}`);
  const favs = useApi("/comida/favoritas");
  const [hoja, setHoja] = useState(null); // "manual" | "favoritas"
  const esHoy = fecha === isoLocal();

  function mover(dias) {
    const f = new Date(`${fecha}T12:00:00`);
    f.setDate(f.getDate() + dias);
    setFecha(isoLocal(f));
  }
  async function borrar(id) {
    await api(`/comida/${id}`, { method: "DELETE" });
    avisarCambio();
  }

  return (
    <div className="pagina">
      <header className="pagina-cab fila-nav">
        <button className="icono" onClick={() => mover(-1)} aria-label="Día anterior">‹</button>
        <h1>{esHoy ? "Comida de hoy" : fechaCorta(fecha)}</h1>
        <button className="icono" onClick={() => mover(1)} disabled={esHoy} aria-label="Día siguiente">›</button>
      </header>

      <div className="atajos">
        <button className="atajo" onClick={() => ir("chat", { camara: true })}>📷 Foto</button>
        <button className="atajo" onClick={() => setHoja("favoritas")}>⭐ Favoritas</button>
        <button className="atajo" onClick={() => setHoja("manual")}>✏️ Manual</button>
      </div>

      <Estado cargando={cargando && !d} error={!d && error}>
        {d && (
          <>
            <Card>
              <Progreso etiqueta="Calorías" valor={d.totales.kcal} meta={d.metas.kcal} unidad="kcal" />
              <Progreso etiqueta="Proteína" valor={d.totales.proteina} meta={d.metas.proteina} unidad="g" exceso="bueno" />
              <p className="suave chico-txt">
                Carbos {num(d.totales.carbos)} g · Grasa {num(d.totales.grasa)} g
                {!d.metas.kcal && <> · <button className="enlace" onClick={() => ir("ajustes")}>definir metas</button></>}
              </p>
            </Card>

            {COMIDAS.map((c) => {
              const items = d.items.filter((i) => i.comida === c);
              if (!items.length) return null;
              const kcal = items.reduce((s, i) => s + i.kcal, 0);
              return (
                <Card key={c} titulo={`${c[0].toUpperCase()}${c.slice(1)}`} accion={<span className="suave">{num(kcal)} kcal</span>}>
                  <ul className="lista">
                    {items.map((i) => (
                      <li key={i.id} className="fila">
                        <span className="fila-txt">
                          <b>{i.descripcion}</b>
                          <small className="suave">
                            {num(i.kcal)} kcal · P {num(i.proteina)} · C {num(i.carbos)} · G {num(i.grasa)}
                          </small>
                        </span>
                        {i.estimado && <Badge tono="neutro">≈ foto</Badge>}
                        <button className="icono chico" onClick={() => borrar(i.id)} aria-label="Borrar">✕</button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
            {!d.items.length && <p className="suave centro-txt">Nada registrado {esHoy ? "hoy" : "este día"}.</p>}

            <Card titulo="Últimos 7 días · calorías">
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
                }}>✕</button>
              </li>
            ))}
          </ul>
        </Estado>
      </Hoja>
    </div>
  );
}
