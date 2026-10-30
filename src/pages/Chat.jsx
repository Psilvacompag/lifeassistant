import { ArrowUp, Camera, Check, Image as ImageIcon, ImagePlus, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
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
  buscar_memoria: "buscando en memoria", ver_novedades: "revisando novedades", WebSearch: "buscando en la web", WebFetch: "leyendo una página",
  editar_comida: "corrigiendo la comida", editar_gasto: "corrigiendo el gasto", borrar_gasto: "borrando el gasto",
  borrar_entreno: "borrando el entreno", editar_medicamento: "actualizando el remedio", borrar_medicamento: "borrando el remedio",
  editar_cita: "actualizando la cita", borrar_cita: "borrando la cita", editar_producto: "actualizando el producto",
  borrar_producto: "borrando el producto", marcar_paso_rutina: "marcando la rutina", borrar_paso_rutina: "quitando el paso",
  olvidar: "olvidando", marcar_novedad: "marcando la novedad", agregar_tema: "agregando el tema", editar_tema: "ajustando el tema",
  borrar_tema: "quitando el tema", crear_receta: "escribiendo la receta", ver_recetas: "revisando tu recetario",
  registrar_receta: "registrando la receta", guia_cocina: "revisando tu air fryer", ver_ideas_comida: "pensando ideas",
  registrar_gusto: "anotando tu gusto",
};
const MAX_FOTOS = 6;

/** Une el historial del servidor con lo local: conserva las miniaturas de las fotos que mandaste desde este equipo. */
function fusionar(previos, delServidor) {
  const porId = new Map(previos.filter((m) => m.id && m.fotos).map((m) => [m.id, m.fotos]));
  const sinId = previos.filter((m) => !m.id && m.fotos);
  return delServidor.map((m) => {
    let fotos = porId.get(m.id);
    if (!fotos && m.role === "user" && m.con_imagen) {
      const i = sinId.findIndex((x) => !x.content || x.content === m.content);
      if (i >= 0) [{ fotos }] = sinId.splice(i, 1);
    }
    return { ...m, fotos, vivo: m.estado === "escribiendo" };
  });
}

export default function Chat({ abrirCamara, textoInicial, onOpcionesUsadas }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [imagenes, setImagenes] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null);
  const caja = useRef(null);
  // La caja crece con el texto (hasta ~5 líneas; después hace scroll) y vuelve a una línea al enviar.
  useEffect(() => {
    const t = caja.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 150)}px`;
    t.style.overflowY = t.scrollHeight > 150 ? "auto" : "hidden";
  }, [texto]);
  const camara = useRef(null);
  const galeria = useRef(null);

  // El historial vive en el servidor: se recarga al abrir, al volver a la app y cada cierto tiempo
  // (más seguido si el asistente sigue escribiendo una respuesta, aunque se haya cortado la conexión).
  const enviandoRef = useRef(false);
  const cargar = useCallback(async () => {
    if (enviandoRef.current) return;
    try {
      const h = await historial();
      if (!enviandoRef.current) setMensajes((prev) => fusionar(prev, h));
    } catch {
      /* sin conexión: se reintenta en la próxima vuelta */
    }
  }, []);
  const escribiendo = mensajes.some((m) => m.estado === "escribiendo");
  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => {
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    const t = setInterval(alVolver, escribiendo ? 2500 : 15000);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      clearInterval(t);
    };
  }, [cargar, escribiendo]);
  useEffect(() => {
    if (escribiendo === false && mensajes.length) avisarCambio(); // terminó una respuesta que siguió sin conexión
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escribiendo]);
  // Con llaves: en Chrome reciente scrollIntoView devuelve una Promise, y React trataría eso como cleanup.
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);
  useEffect(() => {
    if (abrirCamara) camara.current?.click();
    if (textoInicial) {
      setTexto(textoInicial);
      setTimeout(() => caja.current?.focus(), 50);
    }
    if (abrirCamara || textoInicial) onOpcionesUsadas();
  }, [abrirCamara, textoInicial, onOpcionesUsadas]);

  async function agregarFotos(e) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!archivos.length) return;
    setProcesando(true);
    try {
      const nuevas = await Promise.all(archivos.map((f) => reducirImagen(f)));
      setImagenes((ya) => [...ya, ...nuevas].slice(0, MAX_FOTOS));
    } finally {
      setProcesando(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if ((!t && !imagenes.length) || enviando) return;
    const fotos = imagenes;
    setTexto("");
    setImagenes([]);
    setEnviando(true);
    enviandoRef.current = true;
    setMensajes((m) => [...m, { role: "user", content: t, fotos }, { role: "assistant", content: "", acciones: [], vivo: true }]);
    const ultimo = (fn) =>
      setMensajes((m) => {
        const copia = [...m];
        copia[copia.length - 1] = fn(copia[copia.length - 1]);
        return copia;
      });
    try {
      const final = await chat({ texto: t, imagenes: fotos }, (ev) => {
        if (ev.tipo === "delta") ultimo((u) => ({ ...u, content: u.content + ev.texto }));
        if (ev.tipo === "herramienta") ultimo((u) => ({ ...u, acciones: [...u.acciones, ev.nombre] }));
      });
      ultimo((u) => ({ ...u, content: final?.texto || u.content, vivo: false }));
      if (final?.herramientas?.length) avisarCambio(); // el agente registró algo: refrescar pantallas
    } catch (err) {
      if (err instanceof TypeError) {
        // Se cortó la conexión (pantalla bloqueada, cambio de red): el servidor sigue respondiendo y lo guarda.
        ultimo((u) => ({ ...u, estado: "escribiendo", vivo: true }));
      } else {
        ultimo((u) => ({ ...u, content: u.content || err.message, vivo: false, error: true }));
      }
    } finally {
      setEnviando(false);
      enviandoRef.current = false;
      cargar();
    }
  }

  return (
    <div className="chat">
      <section className="mensajes">
        {mensajes.length === 0 && (
          <div className="bienvenida">
            <span className="bienvenida-ico"><Ico i={Sparkles} size={24} /></span>
            <p className="suave">Cuéntame qué comiste, mándame una foto del plato o de una etiqueta, o pregúntame lo que quieras.</p>
            {["¿Cómo voy hoy?", "Almorcé pollo con arroz", "Ayúdame a armar mi rutina de piel"].map((s) => (
              <button key={s} className="sugerencia" onClick={() => setTexto(s)}>{s}</button>
            ))}
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`burbuja ${m.role} ${m.error ? "con-error" : ""}`}>
            {m.fotos?.length > 0 && (
              <div className={`fotos-msg n${Math.min(m.fotos.length, 3)}`}>
                {m.fotos.map((f, j) => <img key={j} src={f} alt={`Foto ${j + 1}`} />)}
              </div>
            )}
            {m.con_imagen && !m.fotos && (
              <small className="foto-etiqueta"><Ico i={ImageIcon} size={14} /> {m.n_fotos > 1 ? `${m.n_fotos} fotos` : "foto"}</small>
            )}
            {m.role === "assistant" ? (
              <>
                {m.acciones?.length > 0 && (
                  <div className="acciones-agente">
                    {[...new Set(m.acciones)].map((a) => <span key={a} className="chip"><Ico i={m.vivo ? LoaderCircle : Check} size={12} className={m.vivo ? "girar" : ""} />{ACCIONES[a] ?? a}</span>)}
                  </div>
                )}
                {m.content && <div dangerouslySetInnerHTML={md(m.content)} />}
                {m.vivo && <span className="escribiendo" aria-label="escribiendo"><i /><i /><i /></span>}
              </>
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={fin} />
      </section>
      {(imagenes.length > 0 || procesando) && (
        <div className="previews">
          {imagenes.map((f, j) => (
            <div key={j} className="preview-foto">
              <img src={f} alt={`Foto ${j + 1} a enviar`} />
              <button type="button" onClick={() => setImagenes((ya) => ya.filter((_, k) => k !== j))} aria-label={`Quitar foto ${j + 1}`}>
                <Ico i={X} size={13} />
              </button>
            </div>
          ))}
          {procesando && <div className="preview-foto cargando"><Ico i={LoaderCircle} size={18} className="girar" /></div>}
          {imagenes.length < MAX_FOTOS && !procesando && (
            <button type="button" className="preview-mas" onClick={() => galeria.current?.click()} aria-label="Agregar más fotos">
              <Ico i={Plus} size={20} />
            </button>
          )}
        </div>
      )}
      <form className="entrada" onSubmit={enviar}>
        {/* Cámara: saca una foto ahora. Galería: elige varias fotos ya sacadas. */}
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={agregarFotos} />
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={agregarFotos} />
        <button type="button" className="icono" onClick={() => camara.current?.click()} aria-label="Sacar foto"
                disabled={imagenes.length >= MAX_FOTOS}><Ico i={Camera} size={22} /></button>
        <button type="button" className="icono" onClick={() => galeria.current?.click()} aria-label="Elegir fotos de la galería"
                disabled={imagenes.length >= MAX_FOTOS}><Ico i={ImagePlus} size={22} /></button>
        <textarea
          ref={caja}
          value={texto}
          rows={1}
          placeholder={imagenes.length ? "Comentario (opcional)" : "Escribe un mensaje"}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !/Android|iPhone|iPad/.test(navigator.userAgent)) enviar(e);
          }}
        />
        <button className="enviar" aria-label="Enviar" disabled={enviando || procesando || (!texto.trim() && !imagenes.length)}><Ico i={ArrowUp} size={20} /></button>
      </form>
    </div>
  );
}
