// Íconos de línea (Lucide) con tamaño y trazo consistentes. Siempre decorativos: el texto vecino da el significado.
export function Ico({ i: Icono, size = 18, className = "" }) {
  return <Icono className={`ico ${className}`} size={size} strokeWidth={1.75} aria-hidden="true" />;
}
