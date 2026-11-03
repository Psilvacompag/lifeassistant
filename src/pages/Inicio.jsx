import { useState } from "react";
import { Camera, ChevronRight, Sparkles } from "lucide-react";
import { api, avisarCambio } from "../api.js";
import { marcarPaso, responderSugerencia, useLoDeSiempre } from "../componentes.jsx";
import { Ico } from "../iconos.jsx";
import { Avatar, Estado, clp, diasHasta, dinero, fechaCorta, num, useApi, useMarcas, venceTexto } from "../ui.jsx";
import { ESTADO_PEDIDO } from "./Pedidos.jsx";

/*
 * Inicio como el día en una línea de tiempo: arriba "Ahora" (lo siguiente por hacer, lo único grande),
 * después cuánto queda de comida, el día hora a hora y lo que viene. Sin tarjetas: tipografía, aire y líneas de 1 px.
 */

const COMIDAS = ["desayuno", "almuerzo", "once", "cena", "snack"];
const NOMBRE = { desayuno: "Desayuno", almuerzo: "Almuerzo", once: "Once", cena: "Cena", snack: "Snack" };
// Las comidas y la rutina no guardan hora: se ubican en su hora típica.
const HORA = { desayuno: "08:00", almuerzo: "13:30", once: "17:30", cena: "21:00", am: "07:30", pm: "22:30" };
const VENTANA_SUAVE = 180; // minutos: una comida o rutina pasada sigue siendo "ahora" durante 3 h

const minutos = (hhmm) => { const [a, b] = hhmm.split(":").map(Number); return a * 60 + b; };
const horaLocal = (iso) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
const diaLocal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const diaCorto = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" }).replace(".", "");
const atraso = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/** Sello hanko: círculo rojo con 済 ("hecho"), un poco torcido. Vacío, es solo un aro fino. */
function Sello({ hecho, omitido }) {
  return <span className={`sello ${hecho ? "puesto" : ""} ${omitido ? "omitido" : ""}`} aria-hidden>{hecho ? "済" : omitido ? "–" : ""}</span>;
}

export default function Inicio({ nombre, ir }) {
  const { data: h, error, cargando } = useApi("/hoy");
  const saludo = (() => {
    const hora = new Date().getHours();
    return hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  })();

  return (
    <div className="pagina inicio">
      <header className="cab-inicio">
        <div className="pagina-cab">
          <p className="fecha-hoy">{h ? fechaCorta(h.fecha) : " "}</p>
          <h1>{saludo}, {nombre}</h1>
        </div>
        <button className="icono" onClick={() => ir("perfil")} aria-label="Perfil"><Avatar texto={nombre} /></button>
      </header>

      <Estado cargando={cargando && !h} error={!h && error}>
        {h && <Dia h={h} ir={ir} />}
      </Estado>
    </div>
  );
}

function Dia({ h, ir }) {
  const ahoraMin = minutos(h.hora);
  const hoy = String(h.fecha).slice(0, 10);

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
    items.push({
      key: `rutina-${m}`, hora: HORA[m], tipo: "rutina", suave: true, hecho: !siguiente,
      titulo: `Skincare de ${m === "am" ? "mañana" : "noche"}`, detalle: `${hechos.length} de ${lista.length} pasos`,
      sub: lista.map((p) => ({ key: p.id, txt: p.paso, hecho: pasos.valor(p.id, p.hecho), tocar: () => pasos.marcar(p.id, !pasos.valor(p.id, p.hecho)) })),
      accion: siguiente && { txt: "Hecho", hacer: () => pasos.marcar(siguiente.id, true) },
      ahoraTitulo: siguiente && siguiente.paso, ahoraDetalle: `Skincare de ${m === "am" ? "mañana" : "noche"} · ${hechos.length + 1} de ${lista.length}`,
      abrir: () => ir("cuidado"),
    });
  }
  for (const d of h.dosis) {
    const k = `${d.med_id}|${d.horario}`;
    const est = dosis.valor(k, d.estado);
    items.push({
      key: `dosis-${k}`, hora: d.horario, tipo: "dosis", hecho: est === "tomada", omitido: est === "omitida",
      titulo: d.nombre, detalle: [d.dosis, est === "omitida" && "omitida", d.con_comida && "con comida"].filter(Boolean).join(" · "),
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
    items.push({
      key: `comida-${c}`, hora: HORA[c] ?? null, tipo: "comida", suave: true, hecho,
      titulo: NOMBRE[c],
      detalle: regs.length ? `${regs.map((i) => i.descripcion).join(", ")} · ${num(kcal)} kcal` : "Sin registrar",
      sub: habs.map((x) => ({ key: x.id, txt: `${x.nombre} · ${num(x.kcal)} kcal`, hecho: siempre.hecha(x), tocar: () => siempre.tocar(x), siempre: true })),
      accion: pendHab ? { txt: "La comí", hacer: () => siempre.marcar(pendHab.id, true) }
        : !regs.length && { txt: "Foto", icono: Camera, hacer: () => ir("chat", { camara: true }) },
      ahoraTitulo: pendHab ? pendHab.nombre : `${NOMBRE[c]} sin registrar`,
      ahoraDetalle: pendHab ? `${NOMBRE[c]} de siempre · ${num(pendHab.kcal)} kcal` : "Una foto del plato basta",
      abrir: () => ir("comida"),
    });
  }
  const recHoy = h.recordatorios.filter((x) => diaLocal(x.cuando) <= hoy);
  for (const x of recHoy) {
    const listo = recs.valor(x.id, false);
    const antes = diaLocal(x.cuando) < hoy;
    items.push({
      key: `rec-${x.id}`, hora: antes ? "00:00" : horaLocal(x.cuando), rotulo: antes ? diaCorto(x.cuando) : null,
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
    key: "entreno", hora: null, tipo: "entreno", hecho: entrenoHoy, titulo: "Entreno",
    detalle: entrenoHoy ? `${e.nombre} · ${e.series} series` : e ? `Último: ${e.nombre}, ${diasEntreno === 1 ? "ayer" : `hace ${diasEntreno} días`}` : "Sin entrenos registrados",
    abrir: () => ir("progreso"),
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
  }

  // ── Ahora: lo atrasado importante, si no lo que toca, si no lo siguiente ──
  const pend = conHora.filter((x) => x.accion);
  const ahora = pend.find((x) => x.atrasado)
    ?? [...pend].reverse().find((x) => x.suave && x.minutosAtraso >= 0 && x.minutosAtraso <= VENTANA_SUAVE)
    ?? pend.find((x) => x.minutosAtraso < 0);

  return (
    <>
      <Ahora x={ahora} ahoraMin={ahoraMin} />
      <Balance n={h.nutricion} ir={ir} sugerencia={h.siempre?.sugerencia} />

      <section className="dia" aria-label="Hoy">
        <h2 className="dia-titulo">Hoy</h2>
        <ol className="linea">
          {conHora.map((x) => <Fila key={x.key} x={x} actual={x === ahora} />)}
        </ol>
        {sinHora.length > 0 && (
          <>
            <h3 className="dia-sub">Durante el día</h3>
            <ol className="linea">{sinHora.map((x) => <Fila key={x.key} x={x} />)}</ol>
          </>
        )}
        {errores.length > 0 && <p className="error chico-txt">{errores[0]}</p>}
      </section>

      <Proximos h={h} hoy={hoy} ir={ir} />
      <Resto h={h} ir={ir} compras={compras} />
    </>
  );
}

function Ahora({ x, ahoraMin }) {
  const [ocupado, setOcupado] = useState(false);
  if (!x) {
    return (
      <section className="ahora vacio" aria-label="Ahora">
        <span className="ahora-cuando">Ahora</span>
        <p className="ahora-titulo">Todo al día.</p>
        <p className="ahora-detalle">No queda nada pendiente con hora para hoy.</p>
      </section>
    );
  }
  const falta = minutos(x.hora) - ahoraMin;
  const cuando = x.atrasado ? `Atrasado ${atraso(-falta)} · ${x.hora}` : falta > 0 ? `A las ${x.hora} · en ${atraso(falta)}` : `Ahora · ${x.hora}`;
  const hacer = async (fn) => { setOcupado(true); try { await fn(); } finally { setOcupado(false); } };
  return (
    <section className={`ahora ${x.atrasado ? "tarde" : ""}`} aria-label="Ahora" aria-live="polite">
      <span className="ahora-cuando">{cuando}</span>
      <p className="ahora-titulo">{x.ahoraTitulo ?? x.titulo}</p>
      {x.ahoraDetalle && <p className="ahora-detalle">{x.ahoraDetalle}</p>}
      <div className="ahora-acciones">
        <button disabled={ocupado} onClick={() => hacer(x.accion.hacer)}>
          {x.accion.icono && <Ico i={x.accion.icono} size={17} />}{x.accion.txt}
        </button>
        {x.otra && <button className="enlace" disabled={ocupado} onClick={() => hacer(x.otra.hacer)}>{x.otra.txt}</button>}
      </div>
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
          : <span>Aún no registras comida hoy.</span>}
        {meta ? <span className="meta-txt">meta {num(meta)}</span> : null}
      </p>
      {!meta && (
        <button className="enlace linea-accion" onClick={() => ir("chat", { texto: "Ayúdame a definir mis metas de calorías y proteína." })}>
          <Ico i={Sparkles} size={15} />Definir mis metas con el chat
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

function Fila({ x, actual }) {
  const marcable = !!x.tocar;
  return (
    <li className={`paso-dia ${x.hecho ? "hecho" : ""} ${x.atrasado ? "tarde" : ""} ${actual ? "actual" : ""} ${x.saliendo ? "saliendo" : ""}`}>
      <span className="paso-hora">{x.rotulo ?? x.hora ?? ""}</span>
      {marcable ? (
        <button className="paso-marca" onClick={x.tocar} aria-pressed={!!x.hecho} aria-label={`${x.hecho ? "Desmarcar" : "Marcar"} ${x.titulo}`}>
          <Sello hecho={x.hecho} omitido={x.omitido} />
        </button>
      ) : (
        <span className="paso-marca">{x.hecho ? <Sello hecho /> : <span className="punto" />}</span>
      )}
      <div className="paso-cuerpo">
        <button className="paso-txt" onClick={x.abrir} disabled={!x.abrir}>
          <b>{x.titulo}</b>
          {x.detalle && <small className={x.atrasadoTxt ? "tarde-txt" : ""}>{x.detalle}</small>}
        </button>
        {x.sub?.length > 0 && (
          <ul className="paso-sub">
            {x.sub.map((s) => (
              <li key={s.key}>
                <button onClick={s.tocar} aria-pressed={s.hecho} className={s.hecho ? "hecho" : ""}>
                  <Sello hecho={s.hecho} /><span>{s.txt}</span>{s.siempre && <em>de siempre</em>}
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
      ) : <p className="vacio-linea-txt">Nada agendado para los próximos días.</p>}
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
                      <Sello hecho={listo} /><span>{x.nombre}{x.cantidad && <span className="suave"> · {x.cantidad}</span>}</span>
                    </button>
                  </li>
                ); })}
              </ul>
              {h.compras_total > h.compras.length && (
                <button className="enlace chico-txt" onClick={() => ir("compras")}>Ver las {h.compras_total}</button>
              )}
            </div>
          ) : <button className="paso-txt" onClick={() => ir("compras")}><small>No hay nada por comprar.</small></button>}
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
            ) : <small>Sin peso registrado.</small>}
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
          ) : <button className="paso-txt" onClick={() => ir("novedades")}><small>Busco novedades de tus temas a las 8:00 y a las 18:00.</small></button>}
        </li>
      </ul>
    </section>
  );
}
