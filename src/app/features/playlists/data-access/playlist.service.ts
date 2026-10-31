import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Playlist } from '../models/playlist.model';
import { CancionService } from '../../songs/data-access/cancion.service';

// Playlists compartidas por Inicio (menú "+ Playlist") y la página de Playlists.
// Cada operación actualiza la lista solo cuando el backend la confirma.
@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private apiUrl = 'http://localhost:8080/api/playlists';

  private readonly lista = signal<Playlist[]>([]);
  readonly playlists = this.lista.asReadonly();

  constructor(private http: HttpClient, cancionService: CancionService) {
    // Mantiene el corazón de las canciones de cada playlist al día cuando cambia un favorito
    cancionService.favoritoActualizado$.subscribe(cancionActualizada => {
      this.lista.update(playlists => playlists.map(playlist => ({
        ...playlist,
        canciones: (playlist.canciones || []).map(c =>
          c.id === cancionActualizada.id ? { ...c, favorito: cancionActualizada.favorito } : c
        )
      })));
    });
  }

  cargarPlaylists(): Observable<Playlist[]> {
    return this.http.get<Playlist[]>(this.apiUrl).pipe(
      tap(playlists => this.lista.set(playlists))
    );
  }

  obtenerPlaylist(id: number): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.apiUrl}/${id}`).pipe(
      tap(playlist => this.reemplazar(playlist))
    );
  }

  crearPlaylist(nombre: string): Observable<Playlist> {
    return this.http.post<Playlist>(this.apiUrl, { nombre }).pipe(
      tap(playlist => this.lista.update(playlists => [...playlists, playlist]))
    );
  }

  // Eliminar playlist (US 12)
  eliminarPlaylist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.lista.update(playlists => playlists.filter(p => p.id !== id)))
    );
  }

  agregarCancion(playlistId: number, cancionId: number): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/${playlistId}/canciones/${cancionId}`, {}).pipe(
      tap(playlist => this.reemplazar(playlist))
    );
  }

  // Eliminar canción de la playlist (US 13). Si la respuesta no trae las canciones,
  // se quita localmente, como hacía Inicio.
  quitarCancion(playlistId: number, cancionId: number): Observable<Playlist | undefined> {
    return this.http.delete<Playlist>(`${this.apiUrl}/${playlistId}/canciones/${cancionId}`).pipe(
      map(respuesta => {
        if (respuesta && respuesta.canciones) {
          return respuesta;
        }
        const actual = this.lista().find(p => p.id === playlistId);
        return actual && { ...actual, canciones: (actual.canciones || []).filter(c => c.id !== cancionId) };
      }),
      tap(playlist => playlist && this.reemplazar(playlist))
    );
  }

  private reemplazar(playlist: Playlist): void {
    this.lista.update(playlists => playlists.map(p => (p.id === playlist.id ? playlist : p)));
  }
}
