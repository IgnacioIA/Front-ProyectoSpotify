// Convierte segundos al formato m:ss que muestran las listas y el reproductor
export function formatearDuracion(segundos: number): string {
  if (!segundos) return '0:00';
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = Math.floor(segundos % 60);
  const segundosFormateados = segundosRestantes < 10 ? '0' + segundosRestantes : segundosRestantes;
  return `${minutos}:${segundosFormateados}`;
}
