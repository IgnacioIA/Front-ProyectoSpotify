import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Cancion } from '../../songs/models/cancion.model';

// Opciones del menú lateral que Home resuelve con su lógica existente.
export type AccionHome = 'inicio' | 'canciones' | 'artistas' | 'playlists' | 'favoritos' | 'historial';

// Comunica el header y el menú lateral (en el componente raíz) con la página Home.
@Injectable({
  providedIn: 'root'
})
export class HomeNavegacionService {
  // Texto ingresado en el buscador del header; el filtrado sigue en Home.
  readonly filtroTexto = signal('');

  private readonly acciones = new Subject<AccionHome>();
  readonly acciones$ = this.acciones.asObservable();

  // Canción cuyo artista pidió abrir la barra del reproductor. Es estado (no evento) para que Home
  // lo encuentre aunque se cree después de navegar; Home lo consume al mostrar el detalle.
  readonly artistaSolicitado = signal<Cancion | null>(null);

  emitirAccion(accion: AccionHome): void {
    this.acciones.next(accion);
  }
}
