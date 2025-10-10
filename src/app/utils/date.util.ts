// Convierte una cadena 'YYYY-MM-DD' en un objeto Date en horario local
export function parseInputDate(value: string): Date {
  if (!value) return new Date(NaN);
  const parts = value.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return new Date(NaN);
  const [year, month, day] = parts;
  // Crear Date en horario local evitando interpretación UTC
  return new Date(year, month - 1, day);
}
