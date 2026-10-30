import { API_URL } from "./config.js";
import { auth } from "./firebase.js";

async function headers() {
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function fallo(res) {
  let detalle = "";
  try {
    const j = await res.json();
    detalle = typeof j.detail === "string" ? j.detail : (j.detail?.[0]?.msg ?? "");
  } catch {
    /* sin cuerpo JSON */
  }
  const err = new Error(detalle || `Error ${res.status}`);
  err.status = res.status;
  return err;
}

/** Llamada genérica a la API. body se envía como JSON. */
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: await headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await fallo(res);
  return res.json();
}

/** Avisa a las pantallas abiertas que los datos cambiaron (las recarga useApi). */
export const avisarCambio = () => window.dispatchEvent(new Event("la:cambio"));

export const me = () => api("/me");
export const historial = () => api("/historial");

/**
 * Envía un mensaje (con foto opcional) y va entregando el texto a medida que llega (SSE sobre POST).
 * onEvento recibe {tipo: "delta"|"herramienta", ...}. Devuelve el evento "fin".
 */
export async function chat({ texto, imagenes = [] }, onEvento) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ texto, imagenes }),
  });
  if (!res.ok) throw await fallo(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fin = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const bloques = buffer.split(/\r?\n\r?\n/);
    buffer = bloques.pop();
    for (const bloque of bloques) {
      const data = bloque
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      const ev = JSON.parse(data);
      if (ev.tipo === "error") throw new Error(ev.texto);
      if (ev.tipo === "fin") fin = ev;
      else onEvento(ev);
    }
  }
  return fin;
}

/** Reduce una foto a máx. 1600 px en JPEG: menos datos por la red y menos tokens para el modelo. */
export function reducirImagen(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("No pude leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

// ── Notificaciones push ─────────────────────────────────────────────────────
export const pushSoportado = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function b64aBytes(b64) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function registroSW() {
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, no) => setTimeout(() => no(new Error("La app aún se está instalando; recarga e intenta de nuevo")), 8000)),
  ]);
  return reg;
}

export async function suscripcionActual() {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Pide permiso, suscribe este dispositivo y lo registra en la API. */
export async function activarPush() {
  if (!pushSoportado()) throw new Error("Este navegador no soporta notificaciones");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("Chrome no dio el permiso de notificaciones");
  const reg = await registroSW();
  const { clave } = await api("/push/clave");
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(clave) }));
  await api("/push/suscribir", { method: "POST", body: { ...sub.toJSON(), agente: navigator.userAgent.slice(0, 300) } });
}

export async function desactivarPush() {
  const sub = await suscripcionActual();
  if (!sub) return;
  await api("/push/baja", { method: "POST", body: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}
