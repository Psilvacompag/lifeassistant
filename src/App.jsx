import { useCallback, useEffect, useState } from "react";
import { me } from "./api.js";
import { alCambiarSesion, entrar, salir } from "./firebase.js";
import Ajustes from "./pages/Ajustes.jsx";
import Chat from "./pages/Chat.jsx";
import Comida from "./pages/Comida.jsx";
import Cuidado from "./pages/Cuidado.jsx";
import Finanzas from "./pages/Finanzas.jsx";
import Fitness from "./pages/Fitness.jsx";
import Hoy from "./pages/Hoy.jsx";
import Mas from "./pages/Mas.jsx";
import Memoria from "./pages/Memoria.jsx";
import Novedades from "./pages/Novedades.jsx";
import Salud from "./pages/Salud.jsx";

const NAV = [
  ["hoy", "🏠", "Hoy"],
  ["comida", "🍽️", "Comida"],
  ["chat", "💬", "Chat"],
  ["salud", "💊", "Salud"],
  ["mas", "☰", "Más"],
];
const DE_MAS = ["finanzas", "fitness", "cuidado", "novedades", "memoria", "ajustes"];
// "#/ajustes?google=ok" → ruta "ajustes" + query
const leerHash = () => {
  const [ruta, q = ""] = location.hash.replace(/^#\/?/, "").split("?");
  return { ruta: ruta || "hoy", query: new URLSearchParams(q) };
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
        <p className="suave">Tu asistente personal: fitness, salud, cuidado personal y finanzas.</p>
        <button onClick={() => entrar().catch((e) => setError(e.message))}>Entrar con Google</button>
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
  const [camara, setCamara] = useState(false);
  const nombre = perfil?.name?.split(" ")[0] ?? "";

  useEffect(() => {
    const cambio = () => {
      setHash(leerHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", cambio);
    return () => window.removeEventListener("hashchange", cambio);
  }, []);

  const ir = useCallback((destino, opciones = {}) => {
    if (opciones.camara) setCamara(true);
    location.hash = `/${destino}`;
  }, []);
  const camaraUsada = useCallback(() => setCamara(false), []);

  const pagina = {
    hoy: <Hoy nombre={nombre} ir={ir} />,
    comida: <Comida ir={ir} />,
    chat: <Chat abrirCamara={camara} onCamaraUsada={camaraUsada} />,
    salud: <Salud />,
    mas: <Mas ir={ir} />,
    finanzas: <Finanzas ir={ir} />,
    fitness: <Fitness />,
    cuidado: <Cuidado ir={ir} />,
    novedades: <Novedades />,
    memoria: <Memoria />,
    ajustes: <Ajustes perfil={perfil} query={query} />,
  }[ruta] ?? <Hoy nombre={nombre} ir={ir} />;
  const activa = DE_MAS.includes(ruta) ? "mas" : ruta;

  return (
    <div className={`shell ${ruta === "chat" ? "en-chat" : ""}`}>
      <div className="franja" aria-hidden />
      {DE_MAS.includes(ruta) && (
        <button className="volver enlace" onClick={() => ir("mas")}>‹ Más</button>
      )}
      <main className="contenido">{pagina}</main>
      <nav className="nav" aria-label="Secciones">
        {NAV.map(([id, icono, txt]) => (
          <button key={id} className={activa === id ? "activa" : ""} aria-current={activa === id ? "page" : undefined}
                  onClick={() => ir(id)}>
            <span aria-hidden>{icono}</span>
            <small>{txt}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
