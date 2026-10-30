import { Brain, ChefHat, ChevronRight, Newspaper, Settings, Sparkles, Utensils, Wallet } from "lucide-react";
import { Ico } from "../iconos.jsx";
import { Avatar, Seccion, num, useApi } from "../ui.jsx";

const SECCIONES = [
  ["comida", Utensils, "Comida", "Historial, favoritas y macros por día"],
  ["recetas", ChefHat, "Recetas", "Tu recetario, a la medida de tu cocina"],
  ["cuidado", Sparkles, "Cuidado personal", "Productos y rutinas de cara, pelo y barba"],
  ["finanzas", Wallet, "Finanzas", "Gastos, tarjetas y categorías"],
  ["novedades", Newspaper, "Novedades", "Lo nuevo de tus temas, con fuentes"],
  ["memoria", Brain, "Lo que sé de ti", "Memoria del asistente"],
  ["ajustes", Settings, "Ajustes", "Metas, notificaciones y conexiones"],
];

export default function Perfil({ cuenta, ir }) {
  const { data: p } = useApi("/perfil");
  const { data: h } = useApi("/hoy");
  const datos = [
    ["Edad", p?.edad_actual ? `${p.edad_actual}` : "—"],
    ["Estatura", p?.altura_cm ? `${num(p.altura_cm)} cm` : "—"],
    ["Peso", h?.peso ? `${num(h.peso.tendencia, 1)}` : "—"],
    ["Meta", p?.meta_kcal ? `${num(p.meta_kcal)}` : "—"],
  ];
  return (
    <div className="pagina">
      <header className="perfil-cab">
        <Avatar texto={cuenta?.name} />
        <div className="pagina-cab">
          <h1 style={{ fontSize: "1.35rem" }}>{cuenta?.name}</h1>
          <p className="suave chico-txt">{p?.objetivo || "Cuéntale tu objetivo al chat"}</p>
        </div>
      </header>

      <div className="datos-perfil">
        {datos.map(([k, v]) => (
          <div key={k} className="dato-perfil"><b>{v}</b><small>{k === "Peso" ? "Peso kg" : k === "Meta" ? "kcal/día" : k}</small></div>
        ))}
      </div>
      {(!p?.edad_actual || !p?.altura_cm || !p?.meta_kcal) && (
        <button className="secundario" onClick={() => ir("chat", { texto: "Te cuento mis datos para que completes mi perfil y mis metas: " })}>
          <Ico i={Sparkles} size={16} />Completar mis datos con el chat
        </button>
      )}

      <Seccion titulo="Secciones">
        <nav className="menu" aria-label="Secciones">
          {SECCIONES.map(([id, icono, titulo, sub]) => (
            <button key={id} className="menu-item" onClick={() => ir(id)}>
              <span className="menu-icono"><Ico i={icono} size={19} /></span>
              <span className="fila-txt"><b>{titulo}</b><small className="suave">{sub}</small></span>
              <Ico i={ChevronRight} size={18} className="chevron" />
            </button>
          ))}
        </nav>
      </Seccion>
    </div>
  );
}
