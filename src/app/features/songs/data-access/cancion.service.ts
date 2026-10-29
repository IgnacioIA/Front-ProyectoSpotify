import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cancion } from '../models/cancion.model';

@Injectable({
  providedIn: 'root'
})
export class CancionService {
  private apiUrl = 'http://localhost:8080/api/canciones';

  constructor(private http: HttpClient) { }

  obtenerCanciones(): Observable<Cancion[]> {
    return this.http.get<Cancion[]>(this.apiUrl);
  }

  // Alternar el estado de favorito de una canción - US10
  toggleFavorito(id: number): Observable<Cancion> {
    return this.http.patch<Cancion>(`${this.apiUrl}/${id}/favorito`, {});
  }
}