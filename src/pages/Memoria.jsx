import { Trash2 } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { api, avisarCambio } from "../api.js";
import { Campo, Card, Estado, Formulario, fechaCorta, useApi } from "../ui.jsx";

const TEMAS = ["preferencias", "comida", "salud", "cuidado", "fitness", "finanzas", "general"];

export default function Memoria() {
  const { data, error, cargando } = useApi("/memoria");
  return (
    <div className="pagina">
      <header className="pagina-cab">
        <h1>Lo que sé de ti</h1>
        <p className="suave">Esto es lo que el asistente recuerda entre conversaciones. Puedes corregirlo o borrarlo.</p>
      </header>
      <Card titulo="Agregar">
        <Formulario boton="Recordar" reiniciar onEnviar={async (v) => {
          await api("/memoria", { method: "POST", body: v });
          avisarCambio();
        }}>
          <Campo label="Tema" name="tema" type="select" defaultValue="comida">
            {TEMAS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Campo>
          <Campo label="Qué debo recordar" name="texto" required maxLength={300} placeholder="No como pescado ni mariscos" />
        </Formulario>
      </Card>
      <Estado cargando={cargando && !data} error={!data && error} vacio={data && !data.length && "Todavía no recuerdo nada. Se va llenando mientras conversamos."}>
        {TEMAS.map((t) => {
          const items = data?.filter((h) => h.tema === t) ?? [];
          if (!items.length) return null;
          return (
            <Card key={t} titulo={t}>
              <ul className="lista">
                {items.map((h) => (
                  <li key={h.id} className="fila">
                    <span className="fila-txt">{h.texto}<small className="suave">{fechaCorta(h.created_at)}</small></span>
                    <button className="icono chico" aria-label="Olvidar" onClick={async () => {
                      await api(`/memoria/${h.id}`, { method: "DELETE" });
                      avisarCambio();
                    }}><Ico i={Trash2} size={16} /></button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </Estado>
    </div>
  );
}
