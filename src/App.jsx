import { useCallback, useEffect, useState } from "react";
import { ChartLine, ChevronLeft, CircleUser, HeartPulse, House, MessageCircle } from "lucide-react";
import { me } from "./api.js";
import { Ico } from "./iconos.jsx";
import { alCambiarSesion, entrar, salir } from "./firebase.js";
import Ajustes from "./pages/Ajustes.jsx";
import Chat from "./pages/Chat.jsx";
import Comida from "./pages/Comida.jsx";
import Cuidado from "./pages/Cuidado.jsx";
import Finanzas from "./pages/Finanzas.jsx";
import Fitness from "./pages/Fitness.jsx";
import Inicio from "./pages/Inicio.jsx";
import Perfil from "./pages/Perfil.jsx";
import Memoria from "./pages/Memoria.jsx";
import Novedades from "./pages/Novedades.jsx";
import Salud from "./pages/Salud.jsx";

const NAV = [
  ["inicio", House, "Inicio"],
  ["progreso", ChartLine, "Progreso"],
  ["chat", MessageCircle, "Chat"],
  ["salud", HeartPulse, "Salud"],
  ["perfil", CircleUser, "Perfil"],
];
const EN_NAV = NAV.map(([id]) => id);
// Rutas viejas que pueden venir de notificaciones o enlaces guardados.
const ALIAS = { hoy: "inicio", mas: "perfil", fitness: "progreso" };
// "#/ajustes?google=ok" → ruta "ajustes" + query
const leerHash = () => {
  const [ruta, q = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const r = ruta || "inicio";
  return { ruta: ALIAS[r] ?? r, query: new URLSearchParams(q) };
};

export default function App() {
  const [estado, setEstado] = useState("cargando"); // cargando | fuera | denegado | dentro
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState("");

  useEffect(
    () =>
      alCambiarSesion(async (user) => {
        setError("");
        if (!user) return setEstado("fuera");
        try {
          setPerfil(await me());
          setEstado("dentro");
        } catch (e) {
          if (e.status === 403) setEstado("denegado");
          else {
            setError(`No pude conectar con tu asistente: ${e.message}`);
            setEstado("fuera");
          }
        }
      }),
    [],
  );

  if (estado === "cargando") return <Pantalla><p className="suave">Cargando…</p></Pantalla>;
  if (estado === "denegado")
    return (
      <Pantalla>
        <p>Esta cuenta no tiene acceso todavía.</p>
        <button className="secundario" onClick={salir}>Usar otra cuenta</button>
      </Pantalla>
    );
  if (estado === "fuera")
    return (
      <Pantalla>
        <p className="suave">Nutrición, entrenamiento, salud, cuidado personal y finanzas, en un solo lugar.</p>
        <button onClick={() => entrar().catch((e) => setError(e.message))}>Continuar con Google</button>
        {error && <p className="error">{error}</p>}
      </Pantalla>
    );
  return <Shell perfil={perfil} />;
}

function Pantalla({ children }) {
  return (
    <main className="pantalla">
      <img src="./icon.svg" alt="" className="logo" />
      <h1>LifeAssistant</h1>
      {children}
    </main>
  );
}

function Shell({ perfil }) {
  const [{ ruta, query }, setHash] = useState(leerHash);
  const [opciones, setOpciones] = useState({}); // {camara, texto, hoja}: lo que pide la pantalla que navegó
  const nombre = perfil?.name?.split(" ")[0] ?? "";

  useEffect(() => {
    const cambio = () => {
      setHash(leerHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", cambio);
    return () => window.removeEventListener("hashchange", cambio);
  }, []);

  const ir = useCallback((destino, opc = {}) => {
    setOpciones(opc);
    location.hash = `/${destino}`;
  }, []);
  const opcionesUsadas = useCallback(() => setOpciones({}), []);
  // Volver: a la pantalla anterior si existe; si no (entró directo por un enlace), a Inicio.
  const volver = () => (history.length > 1 ? history.back() : ir("inicio"));

  const pagina = {
    inicio: <Inicio nombre={nombre} ir={ir} />,
    progreso: <Fitness ir={ir} />,
    chat: <Chat abrirCamara={opciones.camara} textoInicial={opciones.texto} onOpcionesUsadas={opcionesUsadas} />,
    salud: <Salud />,
    perfil: <Perfil cuenta={perfil} ir={ir} />,
    comida: <Comida ir={ir} hojaInicial={opciones.hoja} onOpcionesUsadas={opcionesUsadas} />,
    finanzas: <Finanzas ir={ir} />,
    cuidado: <Cuidado ir={ir} />,
    novedades: <Novedades />,
    memoria: <Memoria />,
    ajustes: <Ajustes perfil={perfil} query={query} />,
  }[ruta] ?? <Inicio nombre={nombre} ir={ir} />;
  const activa = EN_NAV.includes(ruta) ? ruta : ["memoria", "ajustes"].includes(ruta) ? "perfil" : "inicio";

  return (
    <div className={`shell ${ruta === "chat" ? "en-chat" : ""}`}>
      <div className="franja" aria-hidden />
      {!EN_NAV.includes(ruta) && (
        <button className="volver enlace" onClick={volver}><Ico i={ChevronLeft} size={18} /> Volver</button>
      )}
      <main className="contenido">{pagina}</main>
      <nav className="nav" aria-label="Secciones">
        {NAV.map(([id, icono, txt]) => id === "chat" ? (
          <button key={id} className={`nav-chat ${activa === id ? "activa" : ""}`} aria-current={activa === id ? "page" : undefined}
                  aria-label="Chat" onClick={() => ir(id)}>
            <span className="burbuja-nav"><Ico i={icono} size={22} /></span>
          </button>
        ) : (
          <button key={id} className={activa === id ? "activa" : ""} aria-current={activa === id ? "page" : undefined}
                  onClick={() => ir(id)}>
            <Ico i={icono} size={22} />
            <small>{txt}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
