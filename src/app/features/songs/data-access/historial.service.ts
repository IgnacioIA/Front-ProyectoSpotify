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

  // Obtener todo el historial de reproducciones
  obtenerHistorial(): Observable<Historial[]> {
    return this.http.get<Historial[]>(this.apiUrl);
  }

  // Registrar una nueva reproducción en el backend
  registrarReproduccion(cancionId: number): Observable<Historial> {
    return this.http.post<Historial>(`${this.apiUrl}/reproducir/${cancionId}`, {});
  }
}
