/* Service worker: cachea la app y recibe las notificaciones push.
   Los botones de la notificación (Tomé / En 15 min) llaman a la API con un token firmado de esa dosis:
   el service worker no tiene la sesión de Firebase. */
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { API_URL } from "./config.js";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const BASE = self.registration.scope; // https://psilvacompag.github.io/lifeassistant/
const ICONO = `${BASE}icon.svg`;

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data?.json() ?? {};
  } catch {
    d = { titulo: "LifeAssistant", cuerpo: event.data?.text() ?? "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.titulo || "LifeAssistant", {
      body: d.cuerpo || "",
      icon: ICONO,
      badge: ICONO,
      tag: d.tag || undefined,
      renotify: Boolean(d.tag),
      requireInteraction: Boolean(d.urgente),
      actions: (d.acciones || []).slice(0, 2),
      data: { url: d.url || "#/hoy", token: d.token || null },
    }),
  );
});

async function abrir(url) {
  const destino = new URL(url, BASE).href;
  const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const v of ventanas) {
    if (v.url.startsWith(BASE)) {
      await v.focus();
      return v.navigate(destino).catch(() => null);
    }
  }
  return self.clients.openWindow(destino);
}

self.addEventListener("notificationclick", (event) => {
  const { url, token } = event.notification.data || {};
  event.notification.close();
  if (event.action && token) {
    event.waitUntil(
      fetch(`${API_URL}/api/push/accion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accion: event.action }),
      })
        .then(async (r) => {
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.detail || "no se pudo");
          return self.registration.showNotification(j.mensaje || "Listo", { body: event.notification.title, icon: ICONO, tag: "confirmacion" });
        })
        .catch(() => abrir(url)), // si falla, abre la app para hacerlo a mano
    );
    return;
  }
  event.waitUntil(abrir(url));
});
