import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Artista } from '../models/artista.model';

@Injectable({
  providedIn: 'root'
})
export class ArtistaService {
  private apiUrl = 'http://localhost:8080/api/artistas';

  constructor(private http: HttpClient) {}

  // Obtener todos los artistas
  obtenerArtistas(): Observable<Artista[]> {
    return this.http.get<Artista[]>(this.apiUrl);
  }

  // Obtener solo los artistas favoritos
  obtenerArtistasFavoritos(): Observable<Artista[]> {
    return this.http.get<Artista[]>(`${this.apiUrl}/favoritos`);
  }

  // Alternar el estado de favorito de un artista (PATCH)
  toggleFavorito(id: number): Observable<Artista> {
    return this.http.patch<Artista>(`${this.apiUrl}/${id}/favorito`, {});
  }

  // Crear un nuevo artista (por si lo necesitas más adelante)
  crearArtista(artista: Artista): Observable<Artista> {
    return this.http.post<Artista>(this.apiUrl, artista);
  }
}