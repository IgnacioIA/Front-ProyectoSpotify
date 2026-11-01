
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { LoginRequest, RegistroRequest, Usuario, VerificacionRequest } from '../models/usuario.model';

const CLAVE_USUARIO = 'usuario_spotify';
// Estados cuyo `mensaje` el backend redacta para el usuario (el 503 avisa que no se pudo enviar el correo)
const ESTADOS_CON_MENSAJE = [400, 401, 403, 404, 409, 503];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  private readonly usuarioActual = signal<Usuario | null>(this.restaurarUsuario());
  readonly usuario = this.usuarioActual.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioActual() !== null);

  constructor(private http: HttpClient) {}

  // La cuenta queda sin verificar: no se inicia sesión hasta que el usuario confirme el código del correo
  registrar(datos: RegistroRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/registro`, datos).pipe(
      map(sinContrasenia)
    );
  }

  verificar(datos: VerificacionRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/verificar`, datos);
  }

  iniciarSesion(datos: LoginRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/login`, datos).pipe(
      map(sinContrasenia),
      tap(usuario => this.guardarUsuario(usuario))
    );
  }

  cerrarSesion(): void {
    this.usuarioActual.set(null);
    localStorage.removeItem(CLAVE_USUARIO);
  }

  private guardarUsuario(usuario: Usuario): void {
    const usuarioSeguro = sinContrasenia(usuario);
    this.usuarioActual.set(usuarioSeguro);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuarioSeguro));
  }

  private restaurarUsuario(): Usuario | null {
    const guardado = localStorage.getItem(CLAVE_USUARIO);
    if (!guardado) return null;

    try {
      const usuario = JSON.parse(guardado) as Usuario;

      if (
        typeof usuario.id !== 'number' ||
        typeof usuario.nombreUsuario !== 'string' ||
        typeof usuario.email !== 'string'
      ) {
        localStorage.removeItem(CLAVE_USUARIO);
        return null;
      }

      return sinContrasenia(usuario);
    } catch {
      localStorage.removeItem(CLAVE_USUARIO);
      return null;
    }
  }
}

function sinContrasenia(respuesta: Usuario): Usuario {
  return {
    id: respuesta.id,
    nombreUsuario: respuesta.nombreUsuario,
    email: respuesta.email
  };
}

export function mensajeErrorAuth(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
    }

    const mensaje = error.error?.mensaje;

    if (ESTADOS_CON_MENSAJE.includes(error.status) && typeof mensaje === 'string') {
      return mensaje;
    }

    if (error.status >= 500) {
      return 'Ocurrió un error en el servidor. Intentá nuevamente más tarde.';
    }
  }

  return 'No se pudo completar la operación. Intentá nuevamente.';
}
