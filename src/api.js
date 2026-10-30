import { API_URL } from "./config.js";
import { auth } from "./firebase.js";

async function headers() {
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function fallo(res) {
  let detalle = "";
  try {
    detalle = (await res.json()).detail ?? "";
  } catch {
    /* sin cuerpo JSON */
  }
  const err = new Error(detalle || `Error ${res.status}`);
  err.status = res.status;
  return err;
}

export async function me() {
  const res = await fetch(`${API_URL}/api/me`, { headers: await headers() });
  if (!res.ok) throw await fallo(res);
  return res.json();
}

export async function historial() {
  const res = await fetch(`${API_URL}/api/historial`, { headers: await headers() });
  if (!res.ok) throw await fallo(res);
  return res.json();
}

/** Envía un mensaje y llama a onDelta con cada trozo de texto a medida que llega (SSE sobre POST). */
export async function chat(texto, onDelta) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ texto }),
  });
  if (!res.ok) throw await fallo(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final = "";
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
      if (ev.tipo === "delta") onDelta(ev.texto);
      else if (ev.tipo === "error") throw new Error(ev.texto);
      else if (ev.tipo === "fin") final = ev.texto;
    }
  }
  return final;
}
