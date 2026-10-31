import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Cancion } from '../models/cancion.model';

@Injectable({
  providedIn: 'root'
})
export class CancionService {
  private apiUrl = 'http://localhost:8080/api/canciones';

  // Avisa a la barra del reproductor y a las vistas abiertas cuando el backend confirma un cambio de favorito
  private readonly favoritoActualizado = new Subject<Cancion>();
  readonly favoritoActualizado$ = this.favoritoActualizado.asObservable();

  constructor(private http: HttpClient) { }

  obtenerCanciones(): Observable<Cancion[]> {
    return this.http.get<Cancion[]>(this.apiUrl);
  }

  // Alternar el estado de favorito de una canción - US10
  toggleFavorito(id: number): Observable<Cancion> {
    return this.http.patch<Cancion>(`${this.apiUrl}/${id}/favorito`, {}).pipe(
      tap(cancion => this.favoritoActualizado.next(cancion))
    );
  }
}