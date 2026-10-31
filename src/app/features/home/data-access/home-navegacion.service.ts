import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Cancion } from '../../songs/models/cancion.model';

// Acción del layout que Home resuelve con su lógica: volver a la vista principal.
// Hace falta porque navegar a "/" estando en "/" no recrea Home (por ejemplo, para salir del detalle de artista).
export type AccionHome = 'inicio';

// Comunica el header, el menú lateral y la barra del reproductor (en el componente raíz) con la página Home.
@Injectable({
  providedIn: 'root'
})
export class HomeNavegacionService {
  private readonly acciones = new Subject<AccionHome>();
  readonly acciones$ = this.acciones.asObservable();

  // Canción cuyo artista pidió abrir la barra del reproductor. Es estado (no evento) para que Home
  // lo encuentre aunque se cree después de navegar; Home lo consume al mostrar el detalle.
  readonly artistaSolicitado = signal<Cancion | null>(null);

  emitirAccion(accion: AccionHome): void {
    this.acciones.next(accion);
  }
}
