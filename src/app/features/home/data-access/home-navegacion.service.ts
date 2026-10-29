import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

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

  emitirAccion(accion: AccionHome): void {
    this.acciones.next(accion);
  }
}
