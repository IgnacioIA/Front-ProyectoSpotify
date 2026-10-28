import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from './usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  registrar(nombreUsuario: string, email: string, contrasenia: string): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/registro`, { nombreUsuario, email, contrasenia });
  }

  login(identificador: string, contrasenia: string): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/login`, { identificador, contrasenia });
  }
}
