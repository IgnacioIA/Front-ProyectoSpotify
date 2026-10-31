import { HttpErrorResponse } from '@angular/common/http';

// Estado de una consulta al backend: permite distinguir "cargando", "sin datos" y "error"
export type EstadoCarga = 'cargando' | 'listo' | 'error';

// Mensaje comprensible para el usuario, sin detalles internos del servidor.
// `accion` completa la frase "No se pudo ...", por ejemplo "crear la playlist".
export function mensajeError(error: unknown, accion: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return `No se pudo ${accion}: no hay conexión con el servidor. Verificá que esté disponible e intentá nuevamente.`;
    }
    if (error.status === 404) {
      return `No se pudo ${accion}: el elemento ya no existe. Actualizá la página.`;
    }
  }
  return `No se pudo ${accion}. Intentá nuevamente.`;
}
