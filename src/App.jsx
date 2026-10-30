import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { chat, historial, me } from "./api.js";
import { alCambiarSesion, entrar, salir } from "./firebase.js";

const md = (t) => ({ __html: DOMPurify.sanitize(marked.parse(t ?? "", { breaks: true })) });

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
  return <Chat perfil={perfil} />;
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

function Chat({ perfil }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null);

  useEffect(() => {
    historial().then(setMensajes).catch(() => {});
  }, []);
  useEffect(() => fin.current?.scrollIntoView({ behavior: "smooth" }), [mensajes]);

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto("");
    setEnviando(true);
    setMensajes((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "", vivo: true }]);
    const actualizar = (fn) =>
      setMensajes((m) => {
        const copia = [...m];
        copia[copia.length - 1] = fn(copia[copia.length - 1]);
        return copia;
      });
    try {
      const final = await chat(t, (delta) => actualizar((u) => ({ ...u, content: u.content + delta })));
      actualizar((u) => ({ ...u, content: final || u.content, vivo: false }));
    } catch (err) {
      actualizar((u) => ({ ...u, content: u.content || `⚠️ ${err.message}`, vivo: false, error: true }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="chat">
      <header>
        <img src="./icon.svg" alt="" />
        <span>Hola, {perfil?.name?.split(" ")[0] ?? "tú"}</span>
        <button className="secundario chico" onClick={salir}>Salir</button>
      </header>
      <section className="mensajes">
        {mensajes.length === 0 && (
          <p className="suave centro">Cuéntame en qué te ayudo hoy: una comida, un entrenamiento, tu rutina de piel…</p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`burbuja ${m.role} ${m.error ? "con-error" : ""}`}>
            {m.role === "assistant" ? (
              m.content ? <div dangerouslySetInnerHTML={md(m.content)} /> : <span className="escribiendo">pensando…</span>
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={fin} />
      </section>
      <form className="entrada" onSubmit={enviar}>
        <textarea
          value={texto}
          rows={1}
          placeholder="Escribe un mensaje"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) enviar(e);
          }}
        />
        <button disabled={enviando || !texto.trim()}>Enviar</button>
      </form>
    </div>
  );
}
