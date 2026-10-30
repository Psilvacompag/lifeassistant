import { AlertTriangle, Check, CircleCheck } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useEffect, useState } from "react";
import { activarPush, api, avisarCambio, desactivarPush, pushSoportado, suscripcionActual } from "../api.js";
import { salir } from "../firebase.js";
import { Badge, Campo, Card, Estado, Formulario, fechaHora, limpiar, useApi } from "../ui.jsx";

const MENSAJES_GOOGLE = {
  ok: ["bueno", "Google conectado. Reviso tu correo cada 2 minutos."],
  cancelado: ["aviso", "Cancelaste la conexión con Google."],
  vencido: ["aviso", "El enlace venció; intenta conectar de nuevo."],
  error: ["serio", "Google no entregó el permiso. Intenta de nuevo."],
};

export default function Ajustes({ perfil: cuenta, query }) {
  const { data: p, error, cargando } = useApi("/perfil");
  const aviso = MENSAJES_GOOGLE[query?.get("google")];
  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Ajustes</h1></header>
      {aviso && <Card className={`aviso-card ${aviso[0]}`}><Ico i={aviso[0] === "bueno" ? CircleCheck : AlertTriangle} size={20} /><b>{aviso[1]}</b></Card>}

      <Notificaciones />
      <Google />

      <Estado cargando={cargando && !p} error={!p && error}>
        {p && (
          <Card titulo="Metas y perfil">
            <Formulario onEnviar={async (v) => {
              await api("/perfil", { method: "PUT", body: limpiar(v, ["meta_kcal", "meta_proteina", "meta_carbos", "meta_grasa", "altura_cm", "edad"]) });
              avisarCambio();
            }}>
              <div className="grid-2">
                <Campo label="Calorías al día" name="meta_kcal" type="number" min="800" max="8000" defaultValue={p.meta_kcal ?? ""} />
                <Campo label="Proteína (g)" name="meta_proteina" type="number" min="0" defaultValue={p.meta_proteina ?? ""} />
                <Campo label="Carbos (g)" name="meta_carbos" type="number" min="0" defaultValue={p.meta_carbos ?? ""} />
                <Campo label="Grasa (g)" name="meta_grasa" type="number" min="0" defaultValue={p.meta_grasa ?? ""} />
                <Campo label="Altura (cm)" name="altura_cm" type="number" step="0.1" defaultValue={p.altura_cm ?? ""} />
                <Campo label="Edad" name="edad" type="number" min="10" max="110" defaultValue={p.edad_actual ?? ""} />
              </div>
              <Campo label="Objetivo" name="objetivo" type="textarea" defaultValue={p.objetivo ?? ""}
                     placeholder="Bajar grasa sin perder músculo; me cuesta la comida porque soy mañoso" />
              <Campo label="Zona horaria" name="tz" defaultValue={p.tz} />
              <p className="suave chico-txt">No necesitas llenar esto: dile al chat tu edad, estatura, peso y objetivo, y él lo completa y te propone las metas.</p>
            </Formulario>
          </Card>
        )}
      </Estado>

      <Card titulo="Cuenta">
        <p>{cuenta?.name}<br /><small className="suave">{cuenta?.email}</small></p>
        <button className="secundario" onClick={salir}>Cerrar sesión</button>
      </Card>
    </div>
  );
}

function Notificaciones() {
  const estado = useApi("/push/estado");
  const [activa, setActiva] = useState(null); // este dispositivo
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, texto}
  const permiso = pushSoportado() ? Notification.permission : "no-soportado";

  useEffect(() => {
    suscripcionActual().then((s) => setActiva(Boolean(s))).catch(() => setActiva(false));
  }, []);

  /** Devuelve true si salió bien (para no encadenar pasos después de un error). */
  async function hacer(fn, ok) {
    setOcupado(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, texto: ok });
      return true;
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
      return false;
    } finally {
      setActiva(Boolean(await suscripcionActual().catch(() => null)));
      estado.recargar();
      setOcupado(false);
    }
  }

  return (
    <Card titulo="Notificaciones" accion={activa ? <Badge tono="bueno" icono={Check}>activas aquí</Badge> : <Badge>apagadas aquí</Badge>}>
      <p className="suave chico-txt">
        Remedios (a la hora, a los 15 y a los 45 min, con botón "Tomé"), citas el día antes y 2 h antes, stock bajo,
        rutina de noche, cobros de tarjeta y novedades.
      </p>
      {permiso === "no-soportado" && <p className="error">Este navegador no soporta notificaciones. En Android usa Chrome.</p>}
      {(permiso === "denied" || (permiso === "default" && msg && !msg.ok)) && (
        <div className="aviso-card serio card chico-txt">
          <Ico i={AlertTriangle} size={18} />
          <span><b>Chrome no dio el permiso.</b> En Chrome: menú ⋮ → Configuración → Configuración de sitios →
          <b> Notificaciones</b> → <b>Permitir</b>. Después recarga y toca "Activar" de nuevo.</span>
        </div>
      )}
      <div className="botonera">
        {!activa && permiso !== "no-soportado" && (
          <button disabled={ocupado} onClick={async () => {
            if (await hacer(activarPush, "Listo. Te mandé una notificación de prueba.")) await api("/push/probar", { method: "POST" }).catch(() => {});
          }}>
            Activar en este dispositivo
          </button>
        )}
        {activa && (
          <>
            <button className="secundario" disabled={ocupado}
                    onClick={() => hacer(() => api("/push/probar", { method: "POST" }), "Enviada: debería llegarte en segundos.")}>
              Probar
            </button>
            <button className="secundario" disabled={ocupado} onClick={() => hacer(desactivarPush, "Desactivadas en este dispositivo.")}>
              Desactivar
            </button>
          </>
        )}
      </div>
      {msg && <p className={`chico-txt ${msg.ok ? "" : "error"}`}>{msg.texto}</p>}
      {estado.data && (
        <p className="suave chico-txt">
          {estado.data.dispositivos} dispositivo{estado.data.dispositivos === 1 ? "" : "s"} suscrito{estado.data.dispositivos === 1 ? "" : "s"}
          {estado.data.ultimos[0] && <> · último aviso: {estado.data.ultimos[0].titulo} ({fechaHora(estado.data.ultimos[0].enviado)})</>}
        </p>
      )}
    </Card>
  );
}

function Google() {
  const g = useApi("/google/estado");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  async function conectar() {
    setOcupado(true);
    setMsg("");
    try {
      const { url } = await api("/google/conectar");
      location.href = url;
    } catch (e) {
      setMsg(e.status === 503 ? "Falta un paso de configuración de mi lado (cliente OAuth). Te aviso cuando esté." : e.message);
      setOcupado(false);
    }
  }
  async function desconectar() {
    if (!confirm("¿Desconectar Google? Dejo de leer tus correos y revoco el permiso.")) return;
    await api("/google", { method: "DELETE" });
    g.recargar();
  }

  return (
    <Card titulo="Google" accion={g.data?.conectado ? <Badge tono={g.data.error ? "serio" : "bueno"} icono={g.data.error ? AlertTriangle : Check}>{g.data.error ? "con error" : "conectado"}</Badge> : null}>
      <Estado cargando={g.cargando && !g.data} error={!g.data && g.error}>
        {g.data?.conectado ? (
          <>
            <p className="chico-txt">
              <b>{g.data.email}</b><br />
              <span className="suave">
                Revisado {g.data.ultimo_sync ? fechaHora(g.data.ultimo_sync) : "aún no"} · {g.data.importados?.gastos ?? 0} cobros y{" "}
                {g.data.importados?.citas ?? 0} citas importados
              </span>
            </p>
            {g.data.error && <p className="error chico-txt">{g.data.error}</p>}
            <button className="secundario" onClick={desconectar}>Desconectar</button>
          </>
        ) : (
          <>
            <p className="suave chico-txt">
              Leo solo los correos de BCI, Santander y clínicas: los cobros de tus tarjetas entran solos a Finanzas y las horas
              médicas a Salud. El resto de tu correo no se procesa ni se guarda.
            </p>
            <button disabled={ocupado} onClick={conectar}>Conectar Gmail</button>
          </>
        )}
        {msg && <p className="chico-txt">{msg}</p>}
      </Estado>
    </Card>
  );
}
