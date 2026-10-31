import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from './mensaje-error';

describe('mensajeError', () => {
  const error = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

  it('should explain connection problems', () => {
    expect(mensajeError(error(0), 'cargar las canciones')).toBe(
      'No se pudo cargar las canciones: no hay conexión con el servidor. Verificá que esté disponible e intentá nuevamente.',
    );
  });

  it('should explain when the element no longer exists', () => {
    expect(mensajeError(error(404), 'eliminar la playlist')).toContain('el elemento ya no existe');
  });

  it('should not expose server internals', () => {
    const mensaje = mensajeError(error(500, { message: 'NullPointerException at PlaylistController' }), 'crear la playlist');
    expect(mensaje).toBe('No se pudo crear la playlist. Intentá nuevamente.');
  });
});
