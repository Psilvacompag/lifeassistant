import { Brain, ChevronRight, Dumbbell, Newspaper, Settings, Sparkles, Wallet } from "lucide-react";
import { Ico } from "../iconos.jsx";

const SECCIONES = [
  ["finanzas", Wallet, "Finanzas", "Gastos, tarjetas y categorías"],
  ["fitness", Dumbbell, "Fitness", "Peso, cintura y entrenamientos"],
  ["cuidado", Sparkles, "Cuidado personal", "Cara, pelo, barba y rutinas"],
  ["novedades", Newspaper, "Novedades", "Lo nuevo de tus temas, con fuentes"],
  ["memoria", Brain, "Lo que sé de ti", "Memoria del asistente"],
  ["ajustes", Settings, "Ajustes", "Metas, notificaciones y conexiones"],
];

export default function Mas({ ir }) {
  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Más</h1></header>
      <nav className="menu" aria-label="Secciones">
        {SECCIONES.map(([id, icono, titulo, sub]) => (
          <button key={id} className="menu-item" onClick={() => ir(id)}>
            <span className="menu-icono"><Ico i={icono} size={19} /></span>
            <span className="fila-txt"><b>{titulo}</b><small className="suave">{sub}</small></span>
            <Ico i={ChevronRight} size={18} className="chevron" />
          </button>
        ))}
      </nav>
    </div>
  );
}
