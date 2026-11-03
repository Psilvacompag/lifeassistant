import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { api, avisarCambio, fotoChat, fotoFondo } from "../api.js";
import { marcarPaso, responderSugerencia, useLoDeSiempre } from "../componentes.jsx";
import { Ico } from "../iconos.jsx";
import { Avatar, Estado, clp, diasHasta, dinero, fechaCorta, num, useApi, useMarcas, venceTexto } from "../ui.jsx";
import { ESTADO_PEDIDO } from "./Pedidos.jsx";

/*
 * Inicio como el día en una línea de tiempo: una frase que resume, "Ahora" (lo siguiente por hacer, lo único grande),
 * cuánto queda de comida, el día hora a hora con la línea del momento actual, y lo que viene.
 */

const COMIDAS = ["desayuno", "almuerzo", "once", "cena", "snack"];
const NOMBRE = { desayuno: "Desayuno", almuerzo: "Almuerzo", once: "Once", cena: "Cena", snack: "Snack" };
// Las comidas y la rutina no guardan hora: se ubican en su hora típica.
const HORA = { desayuno: "08:00", almuerzo: "13:30", once: "17:30", cena: "21:00", am: "07:30", pm: "22:30" };
const PREGUNTA = {
  desayuno: ["¿Qué desayunaste?", "¿Qué vas a desayunar?"], almuerzo: ["¿Qué almorzaste?", "¿Qué vas a almorzar?"],
  once: ["¿Tomaste once?", "¿Qué vas a tomar de once?"], cena: ["¿Qué cenaste?", "¿Qué vas a cenar?"],
};
const VENTANA_SUAVE = 180; // minutos: una comida o rutina pasada sigue siendo "ahora" durante 3 h

const minutos = (hhmm) => { const [a, b] = hhmm.split(":").map(Number); return a * 60 + b; };
const horaLocal = (iso) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
const diaLocal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const diaCorto = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" }).replace(".", "");
const atraso = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
/** Título corto de un paso de skincare: lo que va antes de ":", "—", "(" o ",", máximo 4 palabras. */
const corto = (t) => {
  const base = String(t).split(/\s*[:—–(,.;]\s*|\s+-\s+/)[0].trim() || String(t);
  const pal = base.split(/\s+/);
  return pal.length > 4 ? `${pal.slice(0, 4).join(" ")}…` : base;
};
/** Rotación estable del sello por ítem, entre -12° y 8°. */
const giro = (semilla) => {
  let h = 0;
  for (const c of String(semilla)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return -12 + (Math.abs(h) % 21);
};

/** Filtro de tinta para los sellos: bordes irregulares y huecos de tinta, como un hanko de verdad. */
function FiltroTinta() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <filter id="tinta" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="7" result="ruido" />
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale="1.2" xChannelSelector="R" yChannelSelector="G" result="borde" />
        <feTurbulence type="fractalNoise" baseFrequency="0.28" numOctaves="2" seed="2" result="grano" />
        <feColorMatrix in="grano" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.75" result="huecos" />
        <feComposite in="borde" in2="huecos" operator="in" />
      </filter>
    </svg>
  );
}

/** Sello hanko: círculo rojo con 済 ("hecho"). Vacío, es solo un aro fino. Al marcarse, golpea. */
function Sello({ hecho, omitido, semilla, grande }) {
  const antes = useRef(hecho);
  const [golpe, setGolpe] = useState(false);
  useEffect(() => {
    const recien = hecho && !antes.current;
    antes.current = hecho;
    if (!recien) return;
    setGolpe(true);
    const t = setTimeout(() => setGolpe(false), 420);
    return () => clearTimeout(t);
  }, [hecho]);
  return (
    <span className={`sello ${hecho ? "puesto" : ""} ${omitido ? "omitido" : ""} ${golpe ? "golpe" : ""} ${grande ? "grande" : ""}`}
          style={{ "--rot": `${giro(semilla)}deg` }} aria-hidden>
      {hecho ? "済" : omitido ? "–" : ""}
    </span>
  );
}

function Miniatura({ msgId }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let vivo = true;
    fotoChat(msgId, 1).then((u) => vivo && setUrl(u)).catch(() => {});
    return () => { vivo = false; };
  }, [msgId]);
  return <span className="mini-foto">{url && <img src={url} alt="" />}</span>;
}

// Tamaño de la foto según la pantalla: la grande (3200 px) en PC y celulares de alta densidad; la normal si hay ahorro de datos.
const TAM = (() => {
  const c = navigator.connection;
  if (c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType ?? "")) return "";
  const dpr = window.devicePixelRatio || 1;
  return Math.max(window.innerWidth, window.innerHeight * 1.5) * dpr > 1500 ? "-xl" : "";
})();
const MES = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "");

/**
 * Portada: una foto del viaje detrás del saludo, distinta cada día (recorre todas antes de repetir).
 * Primero aparece la miniatura y luego la grande; un zoom lento al abrir. Tocar la foto pasa a la siguiente.
 */
function Portada({ fecha, children }) {
  const { data: fotos } = useApi("/fondos");
  const [salto, setSalto] = useState(0);
  const [urls, setUrls] = useState({});
  const n = fotos?.length ?? 0;
  const dia = fecha ? Math.floor(new Date(`${String(fecha).slice(0, 10)}T12:00:00`).getTime() / 864e5) : 0;
  const f = n ? fotos[(((dia + salto) % n) + n) % n] : null;
  useEffect(() => {
    if (!f) return;
    let vivo = true;
    for (const t of ["-mini", TAM]) {
      fotoFondo(`${f.id}${t}.webp`).then((u) => vivo && setUrls((x) => ({ ...x, [`${f.id}${t}`]: u }))).catch(() => {});
    }
    // La siguiente queda lista para cuando la toques.
    const sig = fotos[(((dia + salto + 1) % n) + n) % n];
    if (sig) fotoFondo(`${sig.id}${TAM}.webp`).catch(() => {});
    return () => { vivo = false; };
  }, [f, fotos, dia, salto, n]);
  if (!f) return <div className="portada sin-foto">{children}</div>;
  const grande = urls[`${f.id}${TAM}`];
  const mini = urls[`${f.id}-mini`];
  return (
    <div className="portada" style={{ "--tono": f.color }}>
      <button className="portada-foto" onClick={() => setSalto((s) => s + 1)} aria-label={`Foto del viaje: ${f.lugar ?? "Japón"}. Tocar para ver otra`}>
        {mini && <img key={`${f.id}m`} src={mini} alt="" className="mini" style={{ objectPosition: f.vertical ? "50% 38%" : "50% 50%" }} />}
        {grande && <img key={f.id} src={grande} alt="" className="grande" style={{ objectPosition: f.vertical ? "50% 38%" : "50% 50%" }} />}
      </button>
      <span className="portada-pie" aria-hidden><i>旅</i>{[f.lugar, f.fecha && MES(f.fecha)].filter(Boolean).join(" · ")}</span>
      <div className="portada-texto">{children}</div>
    </div>
  );
}

export default function Inicio({ nombre, ir }) {
  const { data: h, error, cargando } = useApi("/hoy");
  const saludo = (() => {
    const hora = new Date().getHours();
    return hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  })();

  return (
    <div className="pagina inicio">
      <FiltroTinta />
      <Portada fecha={h?.fecha}>
        <header className="cab-inicio">
          <div className="pagina-cab">
            <p className="fecha-hoy">{h ? fechaCorta(h.fecha) : " "}</p>
            <h1>{saludo}, {nombre}</h1>
          </div>
          <button className="icono" onClick={() => ir("perfil")} aria-label="Perfil"><Avatar texto={nombre} /></button>
        </header>
      </Portada>

      <Estado cargando={cargando && !h} error={!h && error}>
        {h && <Dia h={h} ir={ir} />}
      </Estado>
    </div>
  );
}

function Dia({ h, ir }) {
  const ahoraMin = minutos(h.hora);
  const hoy = String(h.fecha).slice(0, 10);
  const [abiertos, setAbiertos] = useState(() => new Set());
  const alternar = (k) => setAbiertos((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // ── Marcas con respuesta inmediata (misma lógica de antes) ──
  const siempre = useLoDeSiempre(h.siempre, h.fecha);
  const pasos = useMarcas(marcarPaso);
  const dosis = useMarcas((k, v) => {
    const [med_id, horario] = k.split("|");
    return api("/dosis", { method: "POST", body: { med_id: Number(med_id), horario, estado: v } });
  });
  const recs = useMarcas((id) => api(`/recordatorios/${id}`, { method: "PATCH", body: { estado: "hecho" } }), { salida: 650 });
  const compras = useMarcas((id, v) => api(`/compras/${id}`, { method: "PATCH", body: { comprado: v } }), { salida: 650 });
  const errores = [siempre.error, pasos.error, dosis.error, recs.error, compras.error].filter(Boolean);

  // ── Ítems del día con su hora ──
  const items = [];
  for (const m of ["am", "pm"]) {
    const lista = h.rutina[m];
    if (!lista.length) continue;
    const hechos = lista.filter((p) => pasos.valor(p.id, p.hecho));
    const siguiente = lista.find((p) => !pasos.valor(p.id, p.hecho));
    const nombre = `Skincare de ${m === "am" ? "mañana" : "noche"}`;
    items.push({
      key: `rutina-${m}`, hora: HORA[m], tipo: "rutina", suave: true, hecho: !siguiente, contable: lista.length, hechosN: hechos.length,
      titulo: nombre, detalle: `${hechos.length} de ${lista.length} pasos`, resumen: `${lista.length} pasos`,
      sub: lista.map((p) => {
        const completo = [p.paso !== corto(p.paso) && p.paso, p.producto].filter(Boolean).join(" · ");
        return { key: `p${p.id}`, txt: corto(p.paso), detalle: completo, hecho: pasos.valor(p.id, p.hecho),
                 tocar: () => pasos.marcar(p.id, !pasos.valor(p.id, p.hecho)) };
      }),
      accion: siguiente && { txt: "Hecho", hacer: () => pasos.marcar(siguiente.id, true) },
      ahoraTitulo: siguiente && corto(siguiente.paso),
      ahoraDetalle: siguiente && [`${nombre} · ${hechos.length + 1} de ${lista.length}`, siguiente.paso !== corto(siguiente.paso) && siguiente.paso].filter(Boolean).join(" — "),
      abrir: () => ir("cuidado"),
    });
  }
  for (const d of h.dosis) {
    const k = `${d.med_id}|${d.horario}`;
    const est = dosis.valor(k, d.estado);
    items.push({
      key: `dosis-${k}`, hora: d.horario, tipo: "dosis", hecho: est === "tomada", omitido: est === "omitida", contable: 1,
      titulo: d.nombre, detalle: [d.dosis, est === "omitida" && "omitida", d.con_comida && "con comida"].filter(Boolean).join(" · "),
      resumen: est === "omitida" ? "omitida" : d.dosis,
      tocar: () => dosis.marcar(k, est === "pendiente" ? "tomada" : "pendiente"),
      accion: est === "pendiente" && { txt: "Tomé", hacer: () => dosis.marcar(k, "tomada") },
      otra: est === "pendiente" && { txt: "Omitir", hacer: () => dosis.marcar(k, "omitida") },
      ahoraDetalle: d.dosis, abrir: () => ir("salud"),
    });
  }
  for (const c of COMIDAS) {
    const regs = h.nutricion.items.filter((i) => i.comida === c);
    const habs = siempre.hab.filter((x) => (x.comida ?? "snack") === c);
    if (c === "snack" && !regs.length && !habs.length) continue;
    const kcal = regs.reduce((s, i) => s + i.kcal, 0);
    const pendHab = habs.find((x) => !siempre.hecha(x));
    const hecho = regs.length > 0 || (habs.length > 0 && !pendHab);
    const paso = HORA[c] && minutos(HORA[c]) <= ahoraMin;
    items.push({
      key: `comida-${c}`, hora: HORA[c] ?? null, tipo: "comida", suave: true, hecho, contable: 1,
      titulo: NOMBRE[c], fotos: regs.filter((i) => i.foto_msg_id).map((i) => i.foto_msg_id),
      detalle: regs.length ? `${regs.map((i) => i.descripcion).join(", ")} · ${num(kcal)} kcal` : PREGUNTA[c]?.[paso ? 0 : 1] ?? "¿Algo entre comidas?",
      pregunta: !regs.length, resumen: regs.length ? `${num(kcal)} kcal` : null,
      sub: habs.map((x) => ({ key: `h${x.id}`, txt: `${x.nombre} · ${num(x.kcal)} kcal`, hecho: siempre.hecha(x), tocar: () => siempre.tocar(x), siempre: true })),
      accion: pendHab ? { txt: "La comí", hacer: () => siempre.marcar(pendHab.id, true) }
        : !regs.length && { txt: "Foto", icono: Camera, hacer: () => ir("chat", { camara: true }) },
      ahoraTitulo: pendHab ? pendHab.nombre : PREGUNTA[c]?.[0] ?? `${NOMBRE[c]} sin registrar`,
      ahoraDetalle: pendHab ? `${NOMBRE[c]} de siempre · ${num(pendHab.kcal)} kcal` : "Una foto del plato basta",
      abrir: () => ir("comida"),
    });
  }
  for (const x of h.recordatorios.filter((x) => diaLocal(x.cuando) <= hoy)) {
    const listo = recs.valor(x.id, false);
    const antes = diaLocal(x.cuando) < hoy;
    items.push({
      key: `rec-${x.id}`, hora: antes ? "00:00" : horaLocal(x.cuando), rotulo: antes ? diaCorto(x.cuando) : null, contable: 1,
      tipo: "recordatorio", hecho: listo, saliendo: listo, titulo: x.titulo, detalle: "Recordatorio",
      tocar: () => !listo && recs.marcar(x.id, true),
      accion: !listo && { txt: "Listo", hacer: () => recs.marcar(x.id, true) }, ahoraDetalle: "Recordatorio",
    });
  }
  for (const c of h.citas.filter((c) => diaLocal(c.inicio) === hoy)) {
    items.push({
      key: `cita-${c.id ?? c.inicio}`, hora: horaLocal(c.inicio), tipo: "cita", titulo: c.titulo,
      detalle: [c.lugar, c.preparacion && `preparación: ${c.preparacion}`].filter(Boolean).join(" · "),
      accion: { txt: "Ver", hacer: () => ir("salud") }, abrir: () => ir("salud"),
    });
  }
  // Sin hora: entreno, cuentas y pedidos de hoy.
  const e = h.ultimo_entreno;
  const entrenoHoy = e && String(e.fecha).slice(0, 10) === hoy;
  const diasEntreno = e ? Math.round((new Date(hoy) - new Date(String(e.fecha).slice(0, 10))) / 864e5) : null;
  items.push({
    key: "entreno", hora: null, tipo: "entreno", hecho: entrenoHoy, titulo: "Entreno", resumen: entrenoHoy ? e.nombre : null,
    detalle: entrenoHoy ? `${e.nombre} · ${e.series} series`
      : e ? `¿Entrenas hoy? El último fue ${e.nombre}, ${diasEntreno === 1 ? "ayer" : `hace ${diasEntreno} días`}.` : "¿Entrenas hoy?",
    pregunta: !entrenoHoy, abrir: () => ir("progreso"),
  });
  for (const c of (h.cuentas_proximas ?? []).filter((c) => c.vencimiento && diasHasta(c.vencimiento) <= 0)) {
    items.push({
      key: `cuenta-${c.id}`, hora: null, tipo: "cuenta", atrasadoTxt: diasHasta(c.vencimiento) < 0, titulo: `Pagar ${c.emisor}`,
      detalle: [c.monto !== null && dinero(c.monto, c.moneda), venceTexto(c.vencimiento)].filter(Boolean).join(" · "),
      abrir: () => ir("finanzas"),
    });
  }

  const conHora = items.filter((x) => x.hora).sort((a, b) => minutos(a.hora) - minutos(b.hora));
  const sinHora = items.filter((x) => !x.hora);
  for (const x of conHora) {
    const m = ahoraMin - minutos(x.hora);
    x.atrasado = !x.hecho && !x.omitido && !x.suave && x.tipo !== "cita" && m > 0;
    x.minutosAtraso = m;
    x.pasado = m > 0 && !x.atrasado; // lo pasado se apaga; lo atrasado pendiente sigue a plena vista
  }

  // ── Ahora: lo atrasado importante, si no lo que toca, si no lo siguiente ──
  const pend = conHora.filter((x) => x.accion);
  const ahora = pend.find((x) => x.atrasado)
    ?? [...pend].reverse().find((x) => x.suave && x.minutosAtraso >= 0 && x.minutosAtraso <= VENTANA_SUAVE)
    ?? pend.find((x) => x.minutosAtraso < 0);
  if (ahora) ahora.pasado = false;

  // Avance del día (para el ensō y la frase): cada paso, dosis, comida y recordatorio cuenta.
  const total = items.reduce((s, x) => s + (x.contable ?? 0), 0);
  const hechos = items.reduce((s, x) => s + (x.tipo === "rutina" ? x.hechosN : x.contable && x.hecho ? 1 : 0), 0);
  const atrasados = conHora.filter((x) => x.atrasado).length;

  // Agrupa por hora y ubica la línea del momento actual.
  const grupos = [];
  for (const x of conHora) {
    const g = grupos.at(-1);
    if (g && g.hora === x.hora && !x.rotulo && !g.rotulo) g.items.push(x);
    else grupos.push({ hora: x.hora, rotulo: x.rotulo, items: [x] });
  }
  const iAhora = grupos.findIndex((g) => minutos(g.hora) > ahoraMin);

  const fila = (x) => <Fila key={x.key} x={x} actual={x === ahora} abierto={abiertos.has(x.key)} alternar={() => alternar(x.key)} />;
  const grupo = (g) => (
    <li key={`${g.rotulo ?? ""}${g.hora}`} className="grupo-hora">
      <span className={`paso-hora ${g.items.some((x) => x.atrasado) ? "tarde" : ""} ${g.items.every((x) => x.pasado) ? "pasado" : ""}`}>{g.rotulo ?? g.hora}</span>
      <ol className="grupo-items">{g.items.map(fila)}</ol>
    </li>
  );
  const lineaAhora = <li key="ahora" className="linea-ahora" aria-label={`Ahora, ${h.hora}`}><span className="paso-hora">{h.hora}</span><i /></li>;

  return (
    <>
      <div className="principal">
      <p className="frase">{frase({ h, hechos, total, atrasados, ahoraMin })}</p>
      <Ahora x={ahora} ahoraMin={ahoraMin} hechos={hechos} total={total} />
      <Balance n={h.nutricion} ir={ir} sugerencia={h.siempre?.sugerencia} />

      <section className="dia" aria-label="Hoy">
        <h2 className="dia-titulo">Hoy</h2>
        <ol className="linea">
          {grupos.map((g, i) => (i === iAhora ? [lineaAhora, grupo(g)] : grupo(g)))}
          {iAhora === -1 && lineaAhora}
        </ol>
        {sinHora.length > 0 && (
          <>
            <h3 className="dia-sub">Durante el día</h3>
            <ol className="linea sin-hora">{sinHora.map((x) => <li key={x.key} className="grupo-hora"><span className="paso-hora" /><ol className="grupo-items">{fila(x)}</ol></li>)}</ol>
          </>
        )}
        {errores.length > 0 && <p className="error chico-txt">{errores[0]}</p>}
      </section>

      </div>
      <aside className="lateral">
        <Proximos h={h} hoy={hoy} ir={ir} />
        <Resto h={h} ir={ir} compras={compras} />
      </aside>
    </>
  );
}

/** Una o dos frases cortas desde los datos del día, en tono de conversación. */
function frase({ h, hechos, total, atrasados, ahoraMin }) {
  const n = h.nutricion;
  if (!hechos && !n.items.length) return "¿Partimos? Todavía no marcas nada hoy.";
  const primera = total && hechos >= total ? "Día completo, bien ahí." : `Llevas ${hechos} de ${total} cosas del día.`;
  let segunda = "";
  if (atrasados) segunda = atrasados === 1 ? "Hay una pendiente atrasada." : `Hay ${atrasados} pendientes atrasadas.`;
  else if (n.metas.kcal) {
    const esperado = Math.min(1, Math.max(0, (ahoraMin - 7 * 60) / (15 * 60)));
    const real = n.totales.kcal / n.metas.kcal;
    const comida = real > 1 ? "Ya pasaste tu meta de calorías." : real < esperado - 0.25 ? "Vas corto de comida para la hora."
      : real > esperado + 0.25 ? "Vas adelantado en calorías." : "La comida va en línea.";
    const prot = n.metas.proteina && n.totales.proteina / n.metas.proteina < real - 0.15 ? " Ojo con la proteína." : "";
    segunda = comida + prot;
  }
  return `${primera} ${segunda}`.trim();
}

function Enso({ hechos, total }) {
  const largo = 251; // perímetro aprox. del trazo (r = 40)
  const parte = total ? Math.max(0.06, hechos / total) : 0;
  return (
    <svg className="enso" viewBox="0 0 100 100" role="img" aria-label={`${hechos} de ${total} cosas del día hechas`}>
      <circle cx="50" cy="50" r="40" className="enso-guia" />
      <path className="enso-trazo" d="M50 10 a40 40 0 1 1 -0.1 0" pathLength={largo}
            style={{ "--total": largo, "--hecho": largo * (1 - parte * 0.94) }} />
      <text x="50" y="50" className="enso-ima" dominantBaseline="central" textAnchor="middle">今</text>
    </svg>
  );
}

function Ahora({ x, ahoraMin, hechos, total }) {
  const [ocupado, setOcupado] = useState(false);
  const [timbre, setTimbre] = useState(null); // lo recién hecho, mientras baja el sello grande
  const mostrado = timbre ?? x;
  async function hacer(fn, sellar) {
    setOcupado(true);
    if (sellar) setTimbre(x);
    try {
      await fn();
    } finally {
      setOcupado(false);
      if (sellar) setTimeout(() => setTimbre(null), 900);
    }
  }
  if (!mostrado) {
    return (
      <section className="ahora vacio" aria-label="Ahora">
        <Enso hechos={hechos} total={total} />
        <span className="ahora-cuando">Ahora</span>
        <p className="ahora-titulo">Todo al día.</p>
        <p className="ahora-detalle">No queda nada pendiente con hora para hoy.</p>
      </section>
    );
  }
  const falta = minutos(mostrado.hora) - ahoraMin;
  const cuando = mostrado.atrasado ? `Atrasado ${atraso(-falta)} · ${mostrado.hora}` : falta > 0 ? `A las ${mostrado.hora} · en ${atraso(falta)}` : `Ahora · ${mostrado.hora}`;
  const sellable = ["Tomé", "Hecho", "La comí", "Listo"].includes(mostrado.accion?.txt);
  return (
    <section className={`ahora ${mostrado.atrasado ? "tarde" : ""} ${timbre ? "timbrado" : ""}`} aria-label="Ahora" aria-live="polite">
      <Enso hechos={hechos} total={total} />
      <div className="ahora-cuerpo" key={mostrado.key}>
        <span className="ahora-cuando">{cuando}</span>
        <p className="ahora-titulo">{mostrado.ahoraTitulo ?? mostrado.titulo}</p>
        {mostrado.ahoraDetalle && <p className="ahora-detalle">{mostrado.ahoraDetalle}</p>}
        <div className="ahora-acciones">
          <button disabled={ocupado || !!timbre} onClick={() => hacer(mostrado.accion.hacer, sellable)}>
            {mostrado.accion.icono && <Ico i={mostrado.accion.icono} size={17} />}{mostrado.accion.txt}
          </button>
          {mostrado.otra && <button className="enlace" disabled={ocupado || !!timbre} onClick={() => hacer(mostrado.otra.hacer, false)}>{mostrado.otra.txt}</button>}
        </div>
      </div>
      {timbre && <span className="timbre" aria-hidden><Sello hecho grande semilla={timbre.key} /></span>}
    </section>
  );
}

function Balance({ n, ir, sugerencia }) {
  const meta = n.metas.kcal;
  const tot = n.totales.kcal;
  const porComida = COMIDAS.map((c) => [c, n.items.filter((i) => i.comida === c).reduce((s, i) => s + i.kcal, 0)]).filter(([, k]) => k);
  const escala = Math.max(meta || 0, tot, 1);
  const faltaP = n.restante.proteina;
  const [ocupado, setOcupado] = useState(false);
  const responder = async (si) => { setOcupado(true); try { await responderSugerencia(sugerencia.clave, si); } finally { setOcupado(false); } };
  return (
    <section className="balance" aria-label="Comida de hoy">
      <button className="balance-txt" onClick={() => ir("comida")}>
        {meta ? (
          n.restante.kcal >= 0
            ? <>Quedan <b>{num(n.restante.kcal)} kcal</b></>
            : <>Te pasaste por <b>{num(-n.restante.kcal)} kcal</b></>
        ) : <><b>{num(tot)} kcal</b> hoy</>}
        {faltaP !== null && faltaP !== undefined
          ? (faltaP > 0 ? <> · faltan <b>{num(faltaP)} g</b> de proteína</> : <> · proteína cumplida</>)
          : <> · {num(n.totales.proteina)} g de proteína</>}
        <Ico i={ChevronRight} size={16} className="chevron" />
      </button>
      <div className="barra-seg" role="img"
           aria-label={porComida.length ? porComida.map(([c, k]) => `${NOMBRE[c]} ${num(k)} kcal`).join(", ") : "Sin comidas registradas"}>
        {porComida.map(([c, k]) => <span key={c} className={`seg ${c}`} style={{ width: `${(100 * k) / escala}%` }} />)}
      </div>
      <p className="barra-leyenda">
        {porComida.length
          ? porComida.map(([c, k]) => <span key={c}><i className={`seg ${c}`} />{NOMBRE[c]} {num(k)}</span>)
          : <span>¿Qué has comido hoy?</span>}
        {meta ? <span className="meta-txt">meta {num(meta)}</span> : null}
      </p>
      {!meta && (
        <button className="enlace linea-accion" onClick={() => ir("chat", { texto: "Ayúdame a definir mis metas de calorías y proteína." })}>
          <Ico i={Sparkles} size={15} />¿Definimos tus metas con el chat?
        </button>
      )}
      {sugerencia && (
        <p className="sugerencia-linea">
          Anotaste «{sugerencia.descripcion}» {sugerencia.dias} días seguidos. ¿Lo dejo como de siempre?{" "}
          <button className="enlace" disabled={ocupado} onClick={() => responder(true)}>Sí</button>
          <button className="enlace suave" disabled={ocupado} onClick={() => responder(false)}>No</button>
        </p>
      )}
    </section>
  );
}

function Fila({ x, actual, abierto, alternar }) {
  // Lo hecho queda en una sola línea; al tocarlo se abre.
  const plegado = x.hecho && !abierto && !x.saliendo;
  const tocarTxt = x.hecho ? alternar : x.abrir;
  return (
    <li className={`paso-dia ${x.hecho ? "hecho" : ""} ${x.atrasado ? "tarde" : ""} ${actual ? "actual" : ""} ${x.pasado ? "pasado" : ""} ${x.saliendo ? "saliendo" : ""} ${plegado ? "plegado" : ""}`}>
      {x.tocar ? (
        <button className="paso-marca" onClick={x.tocar} aria-pressed={!!x.hecho} aria-label={`${x.hecho ? "Desmarcar" : "Marcar"} ${x.titulo}`}>
          <Sello hecho={x.hecho} omitido={x.omitido} semilla={x.key} />
        </button>
      ) : (
        <span className="paso-marca">{x.hecho ? <Sello hecho semilla={x.key} /> : <span className="punto" />}</span>
      )}
      <div className="paso-cuerpo">
        <div className="paso-fila">
          <button className="paso-txt" onClick={tocarTxt} disabled={!tocarTxt} aria-expanded={x.hecho ? abierto : undefined}>
            {plegado ? (
              <span className="paso-linea"><b>{x.titulo}</b>{x.resumen && <small> · {x.resumen}</small>}<Ico i={ChevronDown} size={14} className="chevron" /></span>
            ) : (
              <>
                <b>{x.titulo}{x.hecho && <Ico i={ChevronDown} size={14} className="chevron girado" />}</b>
                {x.detalle && <small className={`${x.atrasadoTxt ? "tarde-txt" : ""} ${x.pregunta ? "pregunta" : ""}`}>{x.detalle}</small>}
              </>
            )}
          </button>
          {x.fotos?.length > 0 && <span className="fotos-fila">{x.fotos.slice(0, 2).map((id) => <Miniatura key={id} msgId={id} />)}</span>}
        </div>
        {!plegado && x.sub?.length > 0 && (
          <ul className="paso-sub">
            {x.sub.map((s) => (
              <li key={s.key}>
                <button onClick={s.tocar} aria-pressed={s.hecho} className={s.hecho ? "hecho" : ""}>
                  <Sello hecho={s.hecho} semilla={s.key} />
                  <span className="sub-txt">
                    <span>{s.txt}{s.siempre && <em> de siempre</em>}</span>
                    {s.detalle && <small>{s.detalle}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Proximos({ h, hoy, ir }) {
  const [ocupado, setOcupado] = useState(null);
  const [error, setError] = useState("");
  async function llego(p) {
    setOcupado(p.id);
    setError("");
    try {
      await api(`/pedidos/${p.id}`, { method: "PATCH", body: { estado: "entregado" } });
      avisarCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(null);
    }
  }
  const filas = [
    ...h.recordatorios.filter((x) => diaLocal(x.cuando) > hoy).map((x) => ({
      key: `r${x.id}`, dia: diaLocal(x.cuando), cuando: `${diaCorto(x.cuando)} ${horaLocal(x.cuando)}`, txt: x.titulo, sub: "Recordatorio",
    })),
    ...h.citas.filter((c) => diaLocal(c.inicio) > hoy).map((c) => ({
      key: `c${c.id ?? c.inicio}`, dia: diaLocal(c.inicio), cuando: `${diaCorto(c.inicio)} ${horaLocal(c.inicio)}`, txt: c.titulo,
      sub: [c.lugar, c.preparacion && `preparación: ${c.preparacion}`].filter(Boolean).join(" · ") || "Cita", abrir: () => ir("salud"),
    })),
    ...(h.cuentas_proximas ?? []).filter((c) => !c.vencimiento || diasHasta(c.vencimiento) > 0).map((c) => ({
      key: `p${c.id}`, dia: c.vencimiento ?? "9999", cuando: c.vencimiento ? diaCorto(c.vencimiento) : "—", txt: `Pagar ${c.emisor}`,
      sub: venceTexto(c.vencimiento), monto: c.monto !== null && dinero(c.monto, c.moneda), abrir: () => ir("finanzas"),
    })),
    ...(h.pago_tarjeta ? [{
      key: "tarjeta", dia: String(h.pago_tarjeta.fecha_pago).slice(0, 10), cuando: diaCorto(h.pago_tarjeta.fecha_pago),
      txt: `Pagar tarjeta ${h.pago_tarjeta.tarjeta ?? ""}`.trim(), sub: "Estado de cuenta",
      monto: h.pago_tarjeta.moneda === "CLP" ? clp(h.pago_tarjeta.monto_facturado) : `US$${Number(h.pago_tarjeta.monto_facturado).toFixed(0)}`,
      abrir: () => ir("finanzas"),
    }] : []),
    ...(h.pedidos_activos ?? []).map((p) => ({
      key: `e${p.id}`, dia: p.entrega_estimada ?? "9999", cuando: p.entrega_estimada ? diaCorto(p.entrega_estimada) : "—",
      txt: p.descripcion, sub: `${p.tienda} · ${ESTADO_PEDIDO[p.estado] ?? p.estado}${p.atrasado ? " · atrasado" : ""}`, tarde: p.atrasado,
      abrir: () => ir("pedidos"), boton: { txt: "Llegó", hacer: () => llego(p), ocupado: ocupado === p.id },
    })),
  ].sort((a, b) => String(a.dia).localeCompare(String(b.dia)));

  return (
    <section className="dia" aria-label="Próximos días">
      <h2 className="dia-titulo">Próximos días</h2>
      {filas.length ? (
        <ul className="lineas">
          {filas.map((f) => (
            <li key={f.key}>
              <span className="paso-hora">{f.cuando}</span>
              <button className="paso-txt" onClick={f.abrir} disabled={!f.abrir}>
                <b>{f.txt}</b>
                {f.sub && <small className={f.tarde ? "tarde-txt" : ""}>{f.sub}</small>}
              </button>
              {f.monto && <span className="monto">{f.monto}</span>}
              {f.boton && <button className="enlace" disabled={f.boton.ocupado} onClick={f.boton.hacer}>{f.boton.txt}</button>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="vacio-linea-txt">¿Nada en la agenda? <button className="enlace" onClick={() => ir("chat", { texto: "Recuérdame " })}>Pídele al chat que te recuerde algo</button></p>
      )}
      {error && <p className="error chico-txt">{error}</p>}
    </section>
  );
}

function Resto({ h, ir, compras }) {
  const nov = useApi("/novedades");
  const nuevas = nov.data?.items.filter((x) => !x.leido).slice(0, 2) ?? [];
  const peso = h.peso;
  return (
    <section className="dia" aria-label="Lo demás">
      <h2 className="dia-titulo">Lo demás</h2>
      <ul className="lineas">
        <li>
          <span className="paso-hora">Compras</span>
          {h.compras_total > 0 ? (
            <div className="paso-cuerpo">
              <ul className="paso-sub">
                {h.compras.map((x) => { const listo = compras.valor(x.id, false); return (
                  <li key={x.id} className={listo ? "saliendo" : ""}>
                    <button onClick={() => !listo && compras.marcar(x.id, true)} aria-pressed={listo} className={listo ? "hecho" : ""}>
                      <Sello hecho={listo} semilla={`c${x.id}`} />
                      <span className="sub-txt"><span>{x.nombre}{x.cantidad && <span className="suave"> · {x.cantidad}</span>}</span></span>
                    </button>
                  </li>
                ); })}
              </ul>
              {h.compras_total > h.compras.length && (
                <button className="enlace chico-txt" onClick={() => ir("compras")}>Ver las {h.compras_total}</button>
              )}
            </div>
          ) : <button className="paso-txt" onClick={() => ir("compras")}><small className="pregunta">¿Falta algo en la casa?</small></button>}
        </li>
        <li>
          <span className="paso-hora">Finanzas</span>
          <button className="paso-txt" onClick={() => ir("finanzas")}>
            <b>{clp(h.finanzas.total_clp)} gastados este mes</b>
          </button>
        </li>
        <li>
          <span className="paso-hora">Peso</span>
          <button className="paso-txt" onClick={() => ir("progreso")}>
            {peso ? (
              <><b>{num(peso.tendencia, 1)} kg</b>
                {h.kg_semana !== null && h.kg_semana !== undefined && <small>{h.kg_semana > 0 ? "+" : ""}{num(h.kg_semana, 2)} kg por semana</small>}</>
            ) : <small className="pregunta">¿Cuánto pesas hoy?</small>}
          </button>
        </li>
        {h.por_vencer.length > 0 && (
          <li>
            <span className="paso-hora">Cuidado</span>
            <button className="paso-txt" onClick={() => ir("cuidado")}><b>{h.por_vencer[0].nombre} vence pronto</b></button>
          </li>
        )}
        <li>
          <span className="paso-hora">Novedades</span>
          {nuevas.length ? (
            <div className="paso-cuerpo">
              {nuevas.map((x) => (
                <button key={x.id} className="paso-txt" onClick={() => ir("novedades")}><b>{x.titulo}</b><small>{x.tema} · {x.fuente}</small></button>
              ))}
            </div>
          ) : <button className="paso-txt" onClick={() => ir("novedades")}><small className="pregunta">¿Qué temas quieres que siga por ti?</small></button>}
        </li>
      </ul>
    </section>
  );
}
