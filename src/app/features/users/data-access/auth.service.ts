
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { LoginRequest, RegistroRequest, Usuario } from '../models/usuario.model';

const CLAVE_USUARIO = 'usuario_spotify';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  private readonly usuarioActual = signal<Usuario | null>(this.restaurarUsuario());
  readonly usuario = this.usuarioActual.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioActual() !== null);

  constructor(private http: HttpClient) {}

  registrar(datos: RegistroRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/registro`, datos).pipe(
      map(sinContrasenia),
      tap(usuario => this.guardarUsuario(usuario))
    );
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

    if ((error.status === 400 || error.status === 401) && typeof mensaje === 'string') {
      return mensaje;
    }

    if (error.status >= 500) {
      return 'Ocurrió un error en el servidor. Intentá nuevamente más tarde.';
    }
  }

  return 'No se pudo completar la operación. Intentá nuevamente.';
}
