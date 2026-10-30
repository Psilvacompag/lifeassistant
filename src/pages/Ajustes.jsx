import { api, avisarCambio } from "../api.js";
import { salir } from "../firebase.js";
import { Campo, Card, Estado, Formulario, limpiar, useApi } from "../ui.jsx";

export default function Ajustes({ perfil: cuenta }) {
  const { data: p, error, cargando } = useApi("/perfil");
  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Ajustes</h1></header>
      <Estado cargando={cargando && !p} error={!p && error}>
        {p && (
          <Card titulo="Metas y perfil">
            <Formulario onEnviar={async (v) => {
              await api("/perfil", { method: "PUT", body: limpiar(v, ["meta_kcal", "meta_proteina", "meta_carbos", "meta_grasa", "altura_cm"]) });
              avisarCambio();
            }}>
              <div className="grid-2">
                <Campo label="Calorías al día" name="meta_kcal" type="number" min="800" max="8000" defaultValue={p.meta_kcal ?? ""} />
                <Campo label="Proteína (g)" name="meta_proteina" type="number" min="0" defaultValue={p.meta_proteina ?? ""} />
                <Campo label="Carbos (g)" name="meta_carbos" type="number" min="0" defaultValue={p.meta_carbos ?? ""} />
                <Campo label="Grasa (g)" name="meta_grasa" type="number" min="0" defaultValue={p.meta_grasa ?? ""} />
                <Campo label="Altura (cm)" name="altura_cm" type="number" step="0.1" defaultValue={p.altura_cm ?? ""} />
                <Campo label="Nacimiento" name="nacimiento" type="date" defaultValue={p.nacimiento ?? ""} />
              </div>
              <Campo label="Objetivo" name="objetivo" type="textarea" defaultValue={p.objetivo ?? ""}
                     placeholder="Bajar grasa sin perder músculo; me cuesta la comida porque soy mañoso" />
              <Campo label="Zona horaria" name="tz" defaultValue={p.tz} />
              <p className="suave chico-txt">¿No sabes qué metas poner? Pregúntale al chat: te propone calorías y proteína según tu peso y objetivo.</p>
            </Formulario>
          </Card>
        )}
      </Estado>

      <Card titulo="Conexiones">
        <ul className="lista">
          <li className="fila"><span className="fila-txt"><b>Gmail</b><small className="suave">Cobros de BCI y Santander, citas médicas</small></span><span className="badge neutro">próximamente</span></li>
          <li className="fila"><span className="fila-txt"><b>Google Calendar</b><small className="suave">Citas, entrenos y recordatorios</small></span><span className="badge neutro">próximamente</span></li>
          <li className="fila"><span className="fila-txt"><b>Galaxy Watch</b><small className="suave">Sueño, pasos y peso (app Android)</small></span><span className="badge neutro">más adelante</span></li>
        </ul>
      </Card>

      <Card titulo="Cuenta">
        <p>{cuenta?.name}<br /><small className="suave">{cuenta?.email}</small></p>
        <button className="secundario" onClick={salir}>Cerrar sesión</button>
      </Card>
    </div>
  );
}
