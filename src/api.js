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
export async function chat({ texto, imagen }, onEvento) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ texto, imagen }),
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
