import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { LoginRequest, RegistroRequest, Usuario } from '../models/usuario.model';

// El backend no mantiene sesión (sin cookies ni tokens) ni expone endpoints de usuario actual
// o de cierre de sesión. El estado de autenticación es el usuario devuelto por el último login
// correcto y vive solo en memoria: al recargar la página se pierde.
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  private readonly usuarioActual = signal<Usuario | null>(null);
  readonly usuario = this.usuarioActual.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioActual() !== null);

  constructor(private http: HttpClient) {}

  registrar(datos: RegistroRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/registro`, datos).pipe(map(sinContrasenia));
  }

  iniciarSesion(datos: LoginRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/login`, datos).pipe(
      map(sinContrasenia),
      tap(usuario => this.usuarioActual.set(usuario))
    );
  }

  cerrarSesion(): void {
    this.usuarioActual.set(null);
  }
}

// Conserva solo los campos públicos de la respuesta del backend
function sinContrasenia(respuesta: Usuario): Usuario {
  return { id: respuesta.id, nombreUsuario: respuesta.nombreUsuario, email: respuesta.email };
}

// Mensaje comprensible para el usuario, sin detalles internos del servidor
export function mensajeErrorAuth(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
    }
    // El backend responde los errores de validación y credenciales con { mensaje }
    const mensaje = error.error?.mensaje;
    if ((error.status === 400 || error.status === 401) && typeof mensaje === 'string') {
      return mensaje;
    }
    if (error.status >= 500) {
      return 'Ocurrió un error en el servidor. Intentá nuevamente más tarde.';
    }
  }
  return 'No se pudo completar la operación. Intentá nuevamente.';
}
