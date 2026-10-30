// La configuración web de Firebase es pública por diseño: la seguridad está en la API,
// que verifica el token y la lista de usuarios permitidos.
export const firebaseConfig = {
  apiKey: "AIzaSyD7xMYDzN252Z1LKRcMAjc7fQK7NkmL2JE",
  authDomain: "photo-analyzer-agent.firebaseapp.com",
  projectId: "photo-analyzer-agent",
  appId: "1:81488981381:web:cce4c71855cde81c6ae8ec",
  messagingSenderId: "81488981381",
};

// Con dominio propio esto pasa a https://api.lifeassistant.cl
export const API_URL = import.meta.env.VITE_API_URL ?? "https://lifeassistant.tail087fc9.ts.net";
