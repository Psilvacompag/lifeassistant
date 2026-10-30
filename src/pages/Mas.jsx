const SECCIONES = [
  ["finanzas", "💳", "Finanzas", "Gastos del mes y categorías"],
  ["fitness", "🏋️", "Fitness", "Peso, cintura y entrenos"],
  ["cuidado", "🧴", "Cuidado personal", "Cara, pelo, barba y rutinas"],
  ["memoria", "🧠", "Lo que sé de ti", "Memoria del asistente"],
  ["ajustes", "⚙️", "Ajustes", "Metas, perfil y conexiones"],
];

export default function Mas({ ir }) {
  return (
    <div className="pagina">
      <header className="pagina-cab"><h1>Más</h1></header>
      <div className="menu">
        {SECCIONES.map(([id, icono, titulo, sub]) => (
          <button key={id} className="menu-item" onClick={() => ir(id)}>
            <span className="menu-icono" aria-hidden>{icono}</span>
            <span className="fila-txt"><b>{titulo}</b><small className="suave">{sub}</small></span>
            <span className="suave">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
