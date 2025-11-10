// Convierte una cadena 'YYYY-MM-DD' en un objeto Date en horario local
export function parseInputDate(value: string): Date {
  if (!value) return new Date(NaN);
  const parts = value.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return new Date(NaN);
  const [year, month, day] = parts;
  // Crear Date en horario local evitando interpretación UTC
  return new Date(year, month - 1, day);
}

// Formatea una Date (local) a 'YYYY-MM-DD' evitando conversiones a UTC
export function formatLocalDate(date: Date | string): string {
  if (!(date instanceof Date)) return String(date);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
