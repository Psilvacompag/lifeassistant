import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { avisarCambio, chat, historial, reducirImagen } from "../api.js";

const md = (t) => ({ __html: DOMPurify.sanitize(marked.parse(t ?? "", { breaks: true })) });

// Nombre legible de cada herramienta del agente, para mostrar qué está haciendo.
const ACCIONES = {
  ver_hoy: "revisando tu día", ver_perfil: "mirando tu perfil", actualizar_perfil: "actualizando tus metas",
  registrar_comida: "registrando la comida", ver_comida: "revisando lo que comiste", borrar_comida: "borrando un registro",
  guardar_favorita: "guardando favorita", registrar_gasto: "anotando el gasto", ver_finanzas: "revisando tus gastos",
  registrar_medidas: "anotando tus medidas", registrar_entreno: "registrando el entreno", ver_fitness: "revisando tu progreso",
  mejor_marca: "buscando tu mejor marca", ver_salud: "revisando salud", agregar_medicamento: "agregando el remedio",
  marcar_dosis: "marcando la dosis", agregar_cita: "agendando la cita", ver_cuidado: "revisando tu rutina",
  agregar_producto: "agregando el producto", agregar_paso_rutina: "armando la rutina", recordar: "guardando en memoria",
  buscar_memoria: "buscando en memoria", WebSearch: "buscando en la web", WebFetch: "leyendo una página",
};

export default function Chat({ abrirCamara, onCamaraUsada }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null);
  const archivo = useRef(null);

  useEffect(() => {
    historial().then(setMensajes).catch(() => {});
  }, []);
  // Con llaves: en Chrome reciente scrollIntoView devuelve una Promise, y React trataría eso como cleanup.
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);
  useEffect(() => {
    if (abrirCamara) {
      archivo.current?.click();
      onCamaraUsada();
    }
  }, [abrirCamara, onCamaraUsada]);

  async function elegirFoto(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setImagen(await reducirImagen(f));
  }

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if ((!t && !imagen) || enviando) return;
    const img = imagen;
    setTexto("");
    setImagen(null);
    setEnviando(true);
    setMensajes((m) => [...m, { role: "user", content: t, foto: img }, { role: "assistant", content: "", acciones: [], vivo: true }]);
    const ultimo = (fn) =>
      setMensajes((m) => {
        const copia = [...m];
        copia[copia.length - 1] = fn(copia[copia.length - 1]);
        return copia;
      });
    try {
      const final = await chat({ texto: t, imagen: img }, (ev) => {
        if (ev.tipo === "delta") ultimo((u) => ({ ...u, content: u.content + ev.texto }));
        if (ev.tipo === "herramienta") ultimo((u) => ({ ...u, acciones: [...u.acciones, ev.nombre] }));
      });
      ultimo((u) => ({ ...u, content: final?.texto || u.content, vivo: false }));
      if (final?.herramientas?.length) avisarCambio(); // el agente registró algo: refrescar pantallas
    } catch (err) {
      ultimo((u) => ({ ...u, content: u.content || `⚠️ ${err.message}`, vivo: false, error: true }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="chat">
      <section className="mensajes">
        {mensajes.length === 0 && (
          <div className="bienvenida">
            <p className="suave">Cuéntame qué comiste, mándame una foto del plato o de una etiqueta, o pregúntame lo que quieras.</p>
            {["¿Cómo voy hoy?", "Almorcé pollo con arroz", "Ayúdame a armar mi rutina de piel"].map((s) => (
              <button key={s} className="sugerencia" onClick={() => setTexto(s)}>{s}</button>
            ))}
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`burbuja ${m.role} ${m.error ? "con-error" : ""}`}>
            {m.foto && <img src={m.foto} alt="Foto enviada" className="foto-msg" />}
            {m.con_imagen && !m.foto && <small className="suave">📷 foto</small>}
            {m.role === "assistant" ? (
              <>
                {m.acciones?.length > 0 && (
                  <div className="acciones-agente">
                    {[...new Set(m.acciones)].map((a) => <span key={a} className="chip">⚙️ {ACCIONES[a] ?? a}</span>)}
                  </div>
                )}
                {m.content ? <div dangerouslySetInnerHTML={md(m.content)} /> : m.vivo && <span className="escribiendo">pensando…</span>}
              </>
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={fin} />
      </section>
      {imagen && (
        <div className="preview">
          <img src={imagen} alt="Foto a enviar" />
          <button className="icono" onClick={() => setImagen(null)} aria-label="Quitar foto">✕</button>
        </div>
      )}
      <form className="entrada" onSubmit={enviar}>
        <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegirFoto} />
        <button type="button" className="icono grande" onClick={() => archivo.current?.click()} aria-label="Adjuntar foto">📷</button>
        <textarea
          value={texto}
          rows={1}
          placeholder={imagen ? "Agrega un comentario (opcional)" : "Escribe un mensaje"}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !/Android|iPhone|iPad/.test(navigator.userAgent)) enviar(e);
          }}
        />
        <button disabled={enviando || (!texto.trim() && !imagen)}>Enviar</button>
      </form>
    </div>
  );
}
