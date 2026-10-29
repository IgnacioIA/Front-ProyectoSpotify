import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Historial } from '../models/historial.model';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private apiUrl = 'http://localhost:8080/api/historial';

  constructor(private http: HttpClient) {}

  // Obtener todo el historial de reproducciones (opcionalmente filtrado por usuario)
  obtenerHistorial(usuarioId?: number): Observable<Historial[]> {
    const url = usuarioId ? `${this.apiUrl}?usuarioId=${usuarioId}` : this.apiUrl;
    return this.http.get<Historial[]>(url);
  }

  // Registrar una nueva reproducción en el backend (opcionalmente asociada al usuario)
  registrarReproduccion(cancionId: number, usuarioId?: number): Observable<Historial> {
    const url = usuarioId ? `${this.apiUrl}/reproducir/${cancionId}?usuarioId=${usuarioId}` : `${this.apiUrl}/reproducir/${cancionId}`;
    return this.http.post<Historial>(url, {});
  }
}
